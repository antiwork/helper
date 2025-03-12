import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { subscriptionFactory } from "@tests/support/factories/subscriptions";
import { userFactory } from "@tests/support/factories/users";
import { workflowActionFactory } from "@tests/support/factories/workflowActions";
import { workflowRunActionFactory } from "@tests/support/factories/workflowRunActions";
import { workflowRunFactory } from "@tests/support/factories/workflowRuns";
import { workflowFactory } from "@tests/support/factories/workflows";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { workflowRuns } from "@/db/schema";
import { executeWorkflowActions, getWorkflowInfo } from "@/lib/data/workflow";
import { runWorkflowAction } from "@/lib/data/workflowAction";

vi.mock("@/lib/data/workflowAction", () => ({
  runWorkflowAction: vi.fn(),
}));

describe("getWorkflowInfo for workflow run records", () => {
  it("returns correct workflow info for mark_spam action", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const workflow = await workflowFactory.create(mailbox.id);
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id);
    const { workflowRun } = await workflowRunFactory.create(workflow.id, conversation.id, message.id, mailbox.id);
    await workflowRunActionFactory.create(workflowRun.id, {
      actionType: "change_helper_status",
      actionValue: "spam",
    });

    const result = await getWorkflowInfo(workflowRun);
    const { run_on_replies, auto_reply_from_metadata, ...workflowInfo } = workflowRun.workflowInfo;

    expect(result).toEqual({
      id: workflow.id,
      prompt: "test prompt",
      action: "mark_spam",
      runOnReplies: run_on_replies,
      autoReplyFromMetadata: auto_reply_from_metadata,
      ...workflowInfo,
    });
  });

  it("returns correct workflow info for reply_and_set_open action", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const workflow = await workflowFactory.create(mailbox.id);
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id);
    const { workflowRun } = await workflowRunFactory.create(workflow.id, conversation.id, message.id, mailbox.id);
    await workflowRunActionFactory.create(workflowRun.id, {
      actionType: "change_helper_status",
      actionValue: "open",
    });
    await workflowRunActionFactory.create(workflowRun.id, {
      actionType: "send_email",
      actionValue: "Escalation message",
    });

    const result = await getWorkflowInfo(workflowRun);
    const { run_on_replies, auto_reply_from_metadata, ...workflowInfo } = workflowRun.workflowInfo;

    expect(result).toEqual({
      id: workflow.id,
      prompt: "test prompt",
      action: "reply_and_set_open",
      message: "Escalation message",
      runOnReplies: run_on_replies,
      autoReplyFromMetadata: auto_reply_from_metadata,
      ...workflowInfo,
    });
  });

  it("returns `unknown` for unknown workflow actions", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const workflow = await workflowFactory.create(mailbox.id);
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id);
    const { workflowRun } = await workflowRunFactory.create(workflow.id, conversation.id, message.id, mailbox.id);
    await workflowRunActionFactory.create(workflowRun.id, {
      actionType: "unknown_action",
      actionValue: "some_value",
    });

    const result = await getWorkflowInfo(workflowRun);
    const { run_on_replies, auto_reply_from_metadata, ...workflowInfo } = workflowRun.workflowInfo;

    expect(result).toEqual({
      id: workflow.id,
      prompt: "test prompt",
      action: "unknown",
      runOnReplies: run_on_replies,
      autoReplyFromMetadata: auto_reply_from_metadata,
      ...workflowInfo,
    });
  });
});

describe("executeWorkflowActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs workflow actions", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    await subscriptionFactory.create(mailbox.clerkOrganizationId, {
      currentPeriodEnd: futureDate,
      status: "active",
    });
    const workflow = await workflowFactory.create(mailbox.id);
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "User message",
    });
    await workflowActionFactory.create(workflow.id, {
      actionType: "send_email",
      actionValue: "Reply from workflow",
    });
    await workflowActionFactory.create(workflow.id, {
      actionType: "change_helper_status",
      actionValue: "closed",
    });
    vi.mocked(runWorkflowAction).mockResolvedValueOnce(true);

    await executeWorkflowActions(workflow, message);

    expect(runWorkflowAction).toHaveBeenCalledTimes(2);
  });

  it("stops when the workflow action returns false", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });
    const workflow = await workflowFactory.create(mailbox.id);
    await workflowActionFactory.create(workflow.id, {
      actionType: "send_email",
      actionValue: "This email should not be sent",
    });
    await workflowActionFactory.create(workflow.id, {
      actionType: "change_helper_status",
      actionValue: "closed",
    });
    vi.mocked(runWorkflowAction).mockResolvedValueOnce(false);

    await executeWorkflowActions(workflow, message);

    expect(runWorkflowAction).toHaveBeenCalledTimes(1);
  });

  it("tracks workflow run", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const workflow = await workflowFactory.create(mailbox.id);
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    await workflowActionFactory.create(workflow.id, {
      actionType: "send_email",
      actionValue: "Track this email",
    });

    await executeWorkflowActions(workflow, message);

    const result = await db.query.workflowRuns.findMany({
      where: eq(workflowRuns.workflowId, workflow.id),
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.messageId).toEqual(message.id);
  });
});
