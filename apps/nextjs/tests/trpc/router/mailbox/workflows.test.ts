import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { workflowActionFactory } from "@tests/support/factories/workflowActions";
import { workflowFactory } from "@tests/support/factories/workflows";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { desc, eq, SQL } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assert } from "@/components/utils/assert";
import { db } from "@/db/client";
import { workflowActions, workflowConditions, workflows } from "@/db/schema";
import { runAIQuery } from "@/lib/ai";
import {
  getMatchingConversationsByPrompt,
  getRelatedConversations,
  MAX_RELATED_CONVERSATIONS_COUNT,
} from "@/lib/data/conversation";
import { getClerkOrganization } from "@/lib/data/organization";
import { executeWorkflowActions } from "@/lib/data/workflow";
import { generateWorkflowPrompt } from "@/lib/workflowPromptGenerator";
import { createCaller } from "@/trpc";

vi.mock("@/lib/ai");

vi.mock("@/lib/data/organization", () => ({
  getClerkOrganization: vi.fn(),
}));

describe("workflowsRouter", () => {
  describe("list", () => {
    it("returns workflows for the current user", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const workflow = await workflowFactory.create(mailbox.id, { order: 1 });
      await workflowActionFactory.create(workflow.id, {
        actionType: "change_helper_status",
        actionValue: "closed",
      });
      const workflow2 = await workflowFactory.create(mailbox.id, { order: 0 });
      await workflowActionFactory.create(workflow2.id, {
        actionType: "change_helper_status",
        actionValue: "open",
      });
      await workflowActionFactory.create(workflow2.id, {
        actionType: "send_email",
        actionValue: "Escalation message",
      });
      const caller = createCaller(createTestTRPCContext(user, organization));
      const workflows = await caller.mailbox.workflows.list({ mailboxSlug: mailbox.slug });
      expect(workflows).toHaveLength(2);
      expect(workflows[0]).toMatchObject({
        ...workflow2,
        action: "reply_and_set_open",
        message: "Escalation message",
      });
      expect(workflows[1]).toMatchObject({ ...workflow, action: "close_ticket" });
    });
  });

  describe("set", () => {
    it("creates a new workflow", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));
      const data = {
        mailboxSlug: mailbox.slug,
        name: "New Workflow",
        prompt: "New Workflow Prompt",
        action: "close_ticket",
        order: 1,
        runOnReplies: true,
        autoReplyFromMetadata: true,
      } as const;
      await caller.mailbox.workflows.set(data);
      const created = await db.query.workflows.findMany({
        where: eq(workflows.mailboxId, mailbox.id),
      });
      assert(created[0] != null);
      expect(created).toHaveLength(1);
      expect(created[0]).toMatchObject({
        name: "New Workflow",
        description: "New Workflow Prompt",
        order: 1,
        runOnReplies: true,
        autoReplyFromMetadata: true,
      });

      const workflowAction = await db.query.workflowActions.findFirst({
        where: eq(workflowActions.workflowId, created[0].id),
      });
      assert(workflowAction != null);
      expect(workflowAction.actionType).toEqual("change_helper_status");
      expect(workflowAction.actionValue).toEqual("closed");
    });

    it("updates an existing workflow", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));
      const workflow = await workflowFactory.create(mailbox.id);
      await caller.mailbox.workflows.set({
        mailboxSlug: mailbox.slug,
        id: workflow.id,
        name: "Updated Workflow",
        prompt: "Updated Workflow Prompt",
        action: "mark_spam",
        order: 2,
        runOnReplies: false,
        autoReplyFromMetadata: false,
      });
      const updated = await db.query.workflows.findFirst({
        where: eq(workflows.id, workflow.id),
      });
      assert(updated != null);
      expect(updated).toMatchObject({
        name: "Updated Workflow",
        description: "Updated Workflow Prompt",
        order: 2,
        runOnReplies: false,
        autoReplyFromMetadata: false,
      });

      const workflowAction = await db.query.workflowActions.findFirst({
        where: eq(workflowActions.workflowId, workflow.id),
      });
      assert(workflowAction != null);
      expect(workflowAction.actionType).toEqual("change_helper_status");
      expect(workflowAction.actionValue).toEqual("spam");
    });
  });

  describe("delete", () => {
    it("deletes a workflow", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));
      const workflow = await workflowFactory.create(mailbox.id);
      await caller.mailbox.workflows.delete({ mailboxSlug: mailbox.slug, id: workflow.id });
      const deleted = await db.query.workflows.findFirst({ where: eq(workflows.id, workflow.id) });
      expect(deleted?.deletedAt).not.toBeNull();
    });
  });

  describe("reorder", () => {
    it("reorders workflows", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));
      const workflow1 = await workflowFactory.create(mailbox.id);
      const workflow2 = await workflowFactory.create(mailbox.id);
      const workflow3 = await workflowFactory.create(mailbox.id);
      await caller.mailbox.workflows.reorder({
        mailboxSlug: mailbox.slug,
        positions: [workflow3.id, workflow1.id, workflow2.id],
      });
      const reordered = await db.query.workflows.findMany({
        where: eq(workflows.mailboxId, mailbox.id),
        orderBy: workflows.order,
      });
      expect(reordered).toHaveLength(3);
      expect(reordered.map((w) => w.id)).toEqual([workflow3.id, workflow1.id, workflow2.id]);
    });
  });

  describe("listMatchingConversations", () => {
    beforeEach(() => {
      vi.mock(import("@/lib/data/conversation"), async (importOriginal) => ({
        ...(await importOriginal()),
        getRelatedConversations: vi.fn(),
        getMatchingConversationsByPrompt: vi.fn(),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns matching conversations successfully", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { conversation: relatedConversation } = await conversationFactory.create(mailbox.id, {
        emailFrom: "related@example.com",
        subject: "Related Subject",
        status: "open",
      });
      await conversationMessagesFactory.create(relatedConversation.id, {
        emailFrom: "related@example.com",
        body: "Related email body",
        role: "user",
      });
      vi.mocked(getRelatedConversations).mockResolvedValue([relatedConversation]);
      vi.mocked(getMatchingConversationsByPrompt).mockResolvedValue([relatedConversation]);

      const caller = createCaller(createTestTRPCContext(user, organization));
      const result = await caller.mailbox.workflows.listMatchingConversations({
        mailboxSlug: mailbox.slug,
        conversationSlug: conversation.slug,
        prompt: "Test prompt",
      });

      expect(getRelatedConversations).toHaveBeenCalledWith(conversation.id, {
        where: expect.any(SQL),
        whereMessages: expect.any(SQL),
      });
      expect(getMatchingConversationsByPrompt).toHaveBeenCalledWith([relatedConversation], "Test prompt");

      expect(result).toEqual({
        conversations: [
          {
            subject: "Related Subject",
            email_from: "related@example.com",
            slug: relatedConversation.slug,
          },
        ],
      });
    });

    it("throws an error when prompt is missing", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const { conversation } = await conversationFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.listMatchingConversations({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
          prompt: "",
        }),
      ).rejects.toThrow("Prompt is required");
    });

    it("throws an error for invalid mailbox", async () => {
      const { user, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.listMatchingConversations({
          mailboxSlug: "invalid-mailbox",
          conversationSlug: "some-slug",
          prompt: "Test prompt",
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("throws an error for invalid conversation", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.listMatchingConversations({
          mailboxSlug: mailbox.slug,
          conversationSlug: "invalid-conversation",
          prompt: "Test prompt",
        }),
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("generateWorkflowPrompt", () => {
    beforeEach(() => {
      vi.mock(import("@/lib/workflowPromptGenerator"), async (importOriginal) => ({
        ...(await importOriginal()),
        generateWorkflowPrompt: vi.fn(),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("generates a prompt for the workflow", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { message: lastUserMessage } = await conversationMessagesFactory.create(conversation.id, { role: "user" });
      vi.mocked(generateWorkflowPrompt).mockResolvedValue("Generated workflow prompt");

      const caller = createCaller(createTestTRPCContext(user, organization));
      const result = await caller.mailbox.workflows.generateWorkflowPrompt({
        mailboxSlug: mailbox.slug,
        conversationSlug: conversation.slug,
      });

      expect(result).toEqual({ prompt: "Generated workflow prompt" });
      expect(generateWorkflowPrompt).toHaveBeenCalledWith(conversation, lastUserMessage, mailbox);
    });

    it("throws an error when conversation is not found", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.generateWorkflowPrompt({
          mailboxSlug: mailbox.slug,
          conversationSlug: "non-existent-slug",
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("throws an error when last user message is not found", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const { conversation } = await conversationFactory.create(mailbox.id);
      await conversationMessagesFactory.create(conversation.id, { role: "staff" });

      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.generateWorkflowPrompt({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
        }),
      ).rejects.toThrow("User email not found");
    });
  });

  describe("answerWithWorkflow", () => {
    beforeEach(() => {
      vi.mock(import("@/lib/data/workflow"), async (importOriginal) => ({
        ...(await importOriginal()),
        executeWorkflowActions: vi.fn(),
        generateWorkflowName: vi.fn(),
      }));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("saves and executes workflow", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });
      const workflow = {
        prompt: "Test prompt 123",
        action: "reply_and_close_ticket",
        message: "Replied from workflow!",
        mailboxId: 1,
        order: 0,
        runOnReplies: false,
        deletedAt: null,
        autoReplyFromMetadata: false,
      } as const;

      vi.mocked(runAIQuery).mockResolvedValue("Data Training and Temporal Limitations");

      const caller = createCaller(createTestTRPCContext(user, organization));
      await caller.mailbox.workflows.answerWithWorkflow({
        mailboxSlug: mailbox.slug,
        conversationSlug: conversation.slug,
        workflow,
        matchingSlugs: [],
      });

      const newWorkflow = await db.query.workflows.findFirst({
        where: eq(workflows.mailboxId, mailbox.id),
        orderBy: desc(workflows.createdAt),
        with: { workflowActions: true, groups: true },
      });
      const newWorkflowConditions = await db.query.workflowConditions.findMany({
        where: eq(workflowConditions.workflowConditionGroupId, newWorkflow?.groups?.[0]?.id ?? 0),
      });

      expect(newWorkflow).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          name: "Data Training and Temporal Limitations",
          description: workflow.prompt,
          order: 1,
          workflowType: "freeform",
          runOnReplies: false,
          autoReplyFromMetadata: false,
        }),
      );
      expect(newWorkflow?.workflowActions).toHaveLength(2);
      expect(newWorkflow?.workflowActions[0]).toEqual(
        expect.objectContaining({
          actionType: "change_helper_status",
          actionValue: "closed",
        }),
      );
      expect(newWorkflow?.workflowActions[1]).toEqual(
        expect.objectContaining({
          actionType: "send_email",
          actionValue: "Replied from workflow!",
        }),
      );
      expect(newWorkflowConditions).toHaveLength(1);
      expect(newWorkflowConditions[0]).toEqual(
        expect.objectContaining({
          field: "full_email_context",
          operator: "passes AI conditional for",
          value: workflow.prompt,
        }),
      );

      const { workflowActions: _, groups: __, ...newWorkflowWithoutRelation } = newWorkflow ?? {};
      expect(executeWorkflowActions).toHaveBeenCalledWith(expect.objectContaining(newWorkflowWithoutRelation), message);
    });

    it("throws an error when conversation is not found", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const workflow = await workflowFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.answerWithWorkflow({
          mailboxSlug: mailbox.slug,
          conversationSlug: "non-existent-slug",
          workflow: {
            ...workflow,
            prompt: "Test prompt",
            action: "close_ticket",
          },
          matchingSlugs: [],
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("throws an error when maximum conversation count is exceeded", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const { conversation } = await conversationFactory.create(mailbox.id);
      const workflow = await workflowFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.answerWithWorkflow({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
          workflow: {
            ...workflow,
            prompt: "Test prompt",
            action: "close_ticket",
          },
          matchingSlugs: Array(MAX_RELATED_CONVERSATIONS_COUNT + 1).fill("slug"),
        }),
      ).rejects.toThrow("Maximum conversation count exceeded");
    });

    it("throws an error when workflow serialization fails", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const { conversation } = await conversationFactory.create(mailbox.id);
      const workflow = await workflowFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.workflows.answerWithWorkflow({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
          workflow: {
            ...workflow,
            prompt: "Test prompt",
            action: "reply_and_close_ticket",
          },
          matchingSlugs: [],
        }),
      ).rejects.toThrow("The message field cannot be empty for this action");
    });
  });
});
