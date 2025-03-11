import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxMetadataApiFactory } from "@tests/support/factories/mailboxesMetadataApi";
import { userFactory } from "@tests/support/factories/users";
import { workflowActionFactory } from "@tests/support/factories/workflowActions";
import { workflowFactory } from "@tests/support/factories/workflows";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxesMetadataApi, notes, workflows } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { generateResponseWithPrompt } from "@/lib/ai/generateResponseWithPrompt";
import { Conversation } from "@/lib/data/conversation";
import { ConversationMessage } from "@/lib/data/conversationMessage";
import { Mailbox } from "@/lib/data/mailbox";
import { getClerkOrganization } from "@/lib/data/organization";
import { runWorkflowAction } from "@/lib/data/workflowAction";
import { getMetadata } from "@/lib/metadataApiClient";

vi.mock("@/inngest/client");
vi.mock("@/lib/data/organization", () => ({
  canSendAutomatedReplies: vi.fn().mockReturnValue(true),
  getClerkOrganization: vi.fn(),
}));

describe("runWorkflowAction", () => {
  let mailbox: Mailbox;
  let mailboxMetadataApi: typeof mailboxesMetadataApi.$inferInsert;
  let conversation: Conversation;
  let message: ConversationMessage;
  let workflow: typeof workflows.$inferSelect;
  let mockUser: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUser = await userFactory.createRootUser();
    mailbox = mockUser.mailbox;
    const mockMetadataApi = await mailboxMetadataApiFactory.create(mailbox.id);
    mailboxMetadataApi = mockMetadataApi;
    const mockConversation = await conversationFactory.create(mailbox.id);
    conversation = mockConversation.conversation;
    const mockMessage = await conversationMessagesFactory.create(conversation.id);
    message = mockMessage.message;
    const mockWorkflow = await workflowFactory.create(mailbox.id);
    workflow = mockWorkflow;

    vi.mocked(getClerkOrganization).mockResolvedValue(mockUser.organization);
  });

  describe("actionType is 'send_email'", () => {
    it("sends an email", async () => {
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "send_email",
        actionValue: "Test email body",
      });

      const result = await runWorkflowAction(action, message);
      expect(result).toBe(true);
      const emails = await db.query.conversationMessages.findMany({
        where: and(eq(conversationMessages.role, "workflow")),
      });
      expect(emails.length).toBe(1);
      expect(emails[0]?.body).toEqual(action.actionValue);
    });
  });

  describe("actionType is 'send_auto_reply_from_metadata'", () => {
    vi.mock("@/lib/metadataApiClient", async (importOriginal) => ({
      ...(await importOriginal()),
      getMetadata: vi.fn(),
    }));
    vi.mock("@/lib/ai/generateResponseWithPrompt", () => ({
      generateResponseWithPrompt: vi.fn(),
    }));

    it("sends an auto-reply from metadata", async () => {
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "send_auto_reply_from_metadata",
        actionValue: mailboxMetadataApi.id?.toString(),
      });
      vi.mocked(getMetadata).mockResolvedValue({
        metadata: { name: "some name" },
        prompt: "test prompt",
      });
      vi.mocked(generateResponseWithPrompt).mockResolvedValue("Auto reply from metadata");

      const result = await runWorkflowAction(action, message);

      expect(result).toBe(true);
      expect(generateResponseWithPrompt).toHaveBeenCalledWith({
        message: expect.objectContaining({ id: message.id }),
        mailbox: expect.objectContaining({ id: mailbox.id }),
        metadata: {
          metadata: { name: "some name" },
          prompt: "test prompt",
        },
        appendPrompt: expect.any(String),
      });
      const emails = await db.query.conversationMessages.findMany({
        where: and(eq(conversationMessages.role, "workflow")),
      });
      expect(emails.length).toBe(1);
      expect(emails[0]?.body).toEqual("Auto reply from metadata");
    });

    it("returns false when metadata is null", async () => {
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "send_auto_reply_from_metadata",
        actionValue: mailboxMetadataApi.id?.toString(),
      });
      vi.mocked(getMetadata).mockResolvedValue(null);

      const result = await runWorkflowAction(action, message);
      expect(result).toBe(false);
      expect(generateResponseWithPrompt).not.toHaveBeenCalled();
    });
  });

  describe("actionType is 'change_status'", () => {
    it("shorts-circuit for deprecated actionType 'change_status'", async () => {
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "change_status",
        actionValue: "closed",
      });

      const result = await runWorkflowAction(action, message);
      expect(result).toBe(false);
    });
  });

  describe("actionType is 'add_note'", () => {
    it("creates a note", async () => {
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "add_note",
        actionValue: "This is a note",
      });

      const result = await runWorkflowAction(action, message);
      expect(result).toBe(true);
      const newNote = await db.query.notes.findFirst({
        where: eq(notes.conversationId, conversation.id),
      });
      expect(newNote?.body).toBe(action.actionValue);
    });
  });

  describe("actionType is 'change_helper_status'", () => {
    it("changes helper status", async () => {
      await db.update(conversations).set({ status: "open" }).where(eq(conversations.id, message.conversationId));
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "change_helper_status",
        actionValue: "closed",
      });

      const result = await runWorkflowAction(action, message);

      expect(result).toBe(true);
      const updatedConversation = await db
        .select({ status: conversations.status })
        .from(conversations)
        .where(eq(conversations.id, message.conversationId))
        .then(takeUniqueOrThrow);
      expect(updatedConversation.status).toBe("closed");
      expect(inngest.send).toHaveBeenCalledWith({
        name: "conversations/embedding.create",
        data: { conversationSlug: conversation.slug },
      });
    });
  });

  describe("actionType is 'assign_user'", () => {
    it("assigns the conversation to a user", async () => {
      const userId = "test-user-id";
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "assign_user",
        actionValue: userId,
      });

      const result = await runWorkflowAction(action, message);

      expect(result).toBe(true);
      const updatedConversation = await db
        .select({ assignedToClerkId: conversations.assignedToClerkId })
        .from(conversations)
        .where(eq(conversations.id, conversation.id))
        .then(takeUniqueOrThrow);
      expect(updatedConversation.assignedToClerkId).toBe(userId);
    });
  });

  describe("returns false for unknown action types", () => {
    it("returns false", async () => {
      const action = await workflowActionFactory.create(workflow.id, {
        actionType: "unknown_action" as any,
        actionValue: "some_value",
      });

      const result = await runWorkflowAction(action, message);
      expect(result).toBe(false);
    });
  });
});
