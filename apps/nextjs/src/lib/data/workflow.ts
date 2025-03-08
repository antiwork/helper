import { and, eq, isNull, sql } from "drizzle-orm";
import { assert, assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import {
  conversationMessages,
  mailboxes,
  mailboxesMetadataApi,
  workflowActions,
  workflowConditionGroups,
  workflowConditions,
  workflowRunActions,
  workflowRuns,
  workflows,
} from "@/db/schema";
import { WorkflowAction, WorkflowActionInfo, WorkflowActions } from "@/types/workflows";
import { runAIQuery } from "../ai";
import { GPT_4O_MINI_MODEL } from "../ai/core";
import { getMailboxById } from "./mailbox";
import { runWorkflowAction } from "./workflowAction";
import { trackWorkflowRun } from "./workflowRun";

const ACTIONS_WITH_MESSAGE: string[] = [WorkflowActions.REPLY_AND_CLOSE_TICKET, WorkflowActions.REPLY_AND_SET_OPEN];

export const getWorkflowInfo = async (object: typeof workflowRuns.$inferSelect) => {
  const actions = await db.select().from(workflowRunActions).where(eq(workflowRunActions.workflowRunId, object.id));
  const actionInfo = getWorkflowAction(actions);
  const { run_on_replies, auto_reply_from_metadata, ...workflowInfo } = object.workflowInfo;

  return {
    id: object.workflowId,
    prompt: getWorkflowPrompt(object),
    ...workflowInfo,
    runOnReplies: run_on_replies,
    autoReplyFromMetadata: auto_reply_from_metadata ?? false,
    ...actionInfo,
  };
};

type WorkflowWithConditions = typeof workflows.$inferSelect & {
  groups: {
    conds: (typeof workflowConditions.$inferSelect)[];
  }[];
};

export const getWorkflowPrompt = (object: typeof workflowRuns.$inferSelect | WorkflowWithConditions): string => {
  if ("groups" in object) {
    return assertDefined(object.groups[0]?.conds[0]?.value);
  }
  return assertDefined(object.workflowConditions[0]?.workflow_conditions[0]?.value);
};

type Action = typeof workflowRunActions.$inferSelect | typeof workflowActions.$inferSelect;

export const getWorkflowAction = (actions: Action[]): WorkflowActionInfo => {
  if (actions.length === 1 && actions[0]) {
    const action = actions[0];
    if (isMarkSpamAction(action)) {
      return { action: "mark_spam" };
    } else if (isCloseTicketAction(action)) {
      return { action: "close_ticket" };
    } else if (isAssignUserAction(action)) {
      return {
        action: "assign_user",
        assignedUserId: action.actionValue,
      };
    }
  } else if (actions.length === 2) {
    let message = null;
    for (const action of actions) {
      if (isSendStaticReplyAction(action)) {
        message = action.actionValue;
      }
    }

    const isSendReplyOrSendAutoReplyAction = actions.some(
      (a) => isSendStaticReplyAction(a) || isSendAutoReplyFromMetadataAction(a),
    );

    if (isSendReplyOrSendAutoReplyAction && actions.some(isCloseTicketAction)) {
      return {
        action: "reply_and_close_ticket",
        message,
      };
    } else if (isSendReplyOrSendAutoReplyAction && actions.some(isOpenTicketAction)) {
      return {
        action: "reply_and_set_open",
        message,
      };
    }
  }

  return { action: "unknown" };
};

export const executeWorkflowActions = async (
  workflow: typeof workflows.$inferSelect,
  message: typeof conversationMessages.$inferSelect,
) => {
  const actions = await db.query.workflowActions.findMany({
    where: eq(workflowActions.workflowId, workflow.id),
  });
  for (const action of actions) {
    if (!(await runWorkflowAction(action, message))) break;
  }
  await trackWorkflowRun(workflow, message);
};

export const serializeFreeformWorkflow = (workflow: {
  action?: WorkflowAction;
  message?: string | null;
  autoReplyFromMetadata?: boolean;
}) => {
  if (
    workflow.action &&
    ACTIONS_WITH_MESSAGE.includes(workflow.action) &&
    !(workflow.autoReplyFromMetadata || workflow.message)
  ) {
    return { error: "The message field cannot be empty for this action" };
  }
  return { error: null };
};

export async function updateOrCreateFreeformWorkflow(params: {
  id?: number;
  name?: string;
  prompt: string;
  action: string;
  order?: number;
  runOnReplies?: boolean;
  autoReplyFromMetadata?: boolean;
  message?: string | null;
  slackChannelId?: string | null;
  mailboxId: number;
  assignedUserId?: string | null;
}) {
  const result = await db.transaction(async (tx) => {
    const {
      id: workflowId,
      name,
      action,
      prompt,
      mailboxId,
      order,
      runOnReplies = false,
      autoReplyFromMetadata = false,
    } = params;

    const mailbox = await getMailboxById(params.mailboxId);
    if (!mailbox) return { error: "Mailbox not found" };

    const data = {
      mailboxId,
      name,
      // `description` is unused; We are setting it anyway so that we can see the
      // workflow prompt at a glance on the workflow record in Metabase and elsewhere
      description: prompt,
      order,
      workflowType: "freeform",
      runOnReplies,
      autoReplyFromMetadata,
    } as const;

    let workflow;
    if (workflowId) {
      [workflow] = await tx
        .update(workflows)
        .set(data)
        .where(
          and(eq(workflows.mailboxId, params.mailboxId), eq(workflows.id, workflowId), isNull(workflows.deletedAt)),
        )
        .returning();
      if (!workflow) return { error: "Workflow not found" };
      await tx
        .update(workflowConditions)
        .set({ value: prompt })
        .where(
          eq(
            workflowConditions.workflowConditionGroupId,
            db
              .select({ id: workflowConditionGroups.id })
              .from(workflowConditionGroups)
              .where(eq(workflowConditionGroups.workflowId, workflowId))
              .limit(1),
          ),
        );
      await tx.delete(workflowActions).where(eq(workflowActions.workflowId, workflowId));
    } else {
      const name = params.name || (await generateWorkflowName(params.prompt, mailbox));
      const lastOrder = await tx
        .select({ order: sql<number>`MAX(${workflows.order})` })
        .from(workflows)
        .where(eq(workflows.mailboxId, params.mailboxId))
        .limit(1)
        .then((results) => results[0]?.order ?? 0);
      [workflow] = await tx
        .insert(workflows)
        .values({ ...data, name, order: lastOrder + 1 })
        .returning();
      assert(workflow != null);
      const workflowConditionGroup = assertDefined(
        (await tx.insert(workflowConditionGroups).values({ workflowId: workflow.id }).returning())[0],
      );
      await tx.insert(workflowConditions).values({
        workflowConditionGroupId: workflowConditionGroup.id,
        field: "full_email_context",
        operator: "passes AI conditional for",
        value: prompt,
      });
    }
    const actions: (typeof workflowActions.$inferInsert)[] = [];
    if (
      action === "close_ticket" ||
      action === "mark_spam" ||
      action == "reply_and_close_ticket" ||
      action == "reply_and_set_open"
    ) {
      actions.push({
        workflowId: workflow.id,
        actionType: "change_helper_status",
        actionValue: action === "reply_and_set_open" ? "open" : action === "mark_spam" ? "spam" : "closed",
      });
    }
    if (action === "reply_and_close_ticket") {
      if (params.autoReplyFromMetadata) {
        const metadataEndpoint = await tx.query.mailboxesMetadataApi.findFirst({
          where: and(
            eq(mailboxesMetadataApi.mailboxId, params.mailboxId),
            isNull(mailboxesMetadataApi.deletedAt),
            eq(mailboxesMetadataApi.isEnabled, true),
          ),
        });
        if (!metadataEndpoint) return { error: "Mailbox does not have metadata endpoint" };
        actions.push({
          workflowId: workflow.id,
          actionType: "send_auto_reply_from_metadata",
          actionValue: metadataEndpoint.id.toString(),
        });
      } else {
        actions.push({
          workflowId: workflow.id,
          actionType: "send_email",
          actionValue: assertDefined(params.message),
        });
      }
    }
    if (action === "assign_user")
      actions.push({
        workflowId: workflow.id,
        actionType: "assign_user",
        actionValue: assertDefined(params.assignedUserId),
      });

    await tx.insert(workflowActions).values(actions);

    return { workflow };
  });

  return result;
}

const generateWorkflowName = async (prompt: string, mailbox: typeof mailboxes.$inferSelect) => {
  const result = await runAIQuery({
    system: "Generate a very short title describing the key themes described in the following description:\n\n",
    model: GPT_4O_MINI_MODEL,
    queryType: "workflow_name_generator",
    functionId: "generate-workflow-name",
    temperature: 0,
    maxTokens: 15,
    messages: [{ role: "user", content: prompt }],
    mailbox,
  });

  const generatedName = result.trim();
  return generatedName.replace(/^"(.*)"$/, "$1");
};

const isMarkSpamAction = (action: Action) =>
  action.actionType === "change_helper_status" && action.actionValue === "spam";

const isCloseTicketAction = (action: Action) =>
  action.actionType === "change_helper_status" && action.actionValue === "closed";

const isOpenTicketAction = (action: Action) =>
  action.actionType === "change_helper_status" && action.actionValue === "open";

const isSendStaticReplyAction = (action: Action) => action.actionType === "send_email";

const isSendAutoReplyFromMetadataAction = (action: Action) => action.actionType === "send_auto_reply_from_metadata";

const isAssignUserAction = (action: Action) => action.actionType === "assign_user";
