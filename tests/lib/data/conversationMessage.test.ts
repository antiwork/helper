import { conversationEventsFactory } from "@tests/support/factories/conversationEvents";
import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { noteFactory } from "@tests/support/factories/notes";
import { userFactory } from "@tests/support/factories/users";
import { mockJobs, mockTriggerEvent } from "@tests/support/jobsUtils";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMAIL_UNDO_COUNTDOWN_SECONDS } from "@/components/constants";
import { assert } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, files } from "@/db/schema";
import { getConversationById } from "@/lib/data/conversation";
import {
  createConversationMessage,
  createReply,
  ensureCleanedUpText,
  getConversationMessageById,
  getMessages,
  serializeResponseAiDraft,
} from "@/lib/data/conversationMessage";
import { getFileUrl } from "@/lib/data/files";
import { getSlackPermalink } from "@/lib/slack/client";

vi.mock("@/lib/slack/client", () => ({
  getSlackPermalink: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/data/files", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/files")>();
  return {
    ...actual,
    getFileUrl: vi.fn(),
  };
});

beforeEach(() => {
  vi.useRealTimers();
});

describe("serializeResponseAiDraft", () => {
  it("returns null if draft is missing a responseToId", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message: draft } = await conversationMessagesFactory.create(conversation.id, {
      role: "ai_assistant" as const,
      responseToId: null,
    });

    expect(serializeResponseAiDraft(draft, mailbox)).toBeNull();
  });

  it("correctly serializes a valid draft", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const params = {
      role: "ai_assistant" as const,
      promptInfo: {},
    };
    const { message: draft1 } = await conversationMessagesFactory.create(conversation.id, {
      ...params,
      body: null,
      responseToId: null,
    });
    expect(serializeResponseAiDraft(draft1, mailbox)).toBeNull();

    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });
    const { message: draft2 } = await conversationMessagesFactory.create(conversation.id, {
      ...params,
      responseToId: message.id,
    });

    expect(serializeResponseAiDraft(draft2, mailbox)).toEqual({
      id: draft2.id,
      responseToId: message.id,
      body: draft2.body,
      isStale: true,
    });
  });
});

describe("getMessages", () => {
  it("returns messages, notes and events sorted by createdAt with correct fields", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      userOverrides: {
        user_metadata: {
          display_name: "Test User",
        },
      },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    const { message: message1 } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      createdAt: new Date("2023-01-01"),
      emailFrom: "user@example.com",
    });

    const { message: message2 } = await conversationMessagesFactory.create(conversation.id, {
      role: "staff",
      createdAt: new Date("2023-01-02"),
      userId: user.id,
    });

    const { note } = await noteFactory.create(conversation.id, {
      createdAt: new Date("2023-01-03"),
      userId: user.id,
    });

    const { event } = await conversationEventsFactory.create(conversation.id, {
      createdAt: new Date("2023-01-04"),
      byUserId: user.id,
      reason: "Sent reply",
    });

    const result = await getMessages(conversation.id, mailbox);

    expect(result).toHaveLength(4);

    assert(result[0]?.type === "message");
    expect(result[0].id).toBe(message1.id);
    expect(result[0].from).toBe("user@example.com");

    assert(result[1]?.type === "message");
    expect(result[1].id).toBe(message2.id);
    expect(result[1].userId).toBe(user.id);

    assert(result[2]?.type === "note");
    expect(result[2].id).toBe(note.id);

    assert(result[3]?.type === "event");
    expect(result[3].id).toBe(event.id);
    expect(result[3].reason).toBe("Sent reply");
  });

  it("handles 'from' field correctly for different message roles", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      userOverrides: {
        user_metadata: {
          display_name: "Test User",
        },
      },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      emailFrom: "customer@example.com",
    });
    await conversationMessagesFactory.create(conversation.id, {
      role: "staff",
      userId: user.id,
    });

    const result = await getMessages(conversation.id, mailbox);
    assert(result[0]?.type === "message");
    assert(result[1]?.type === "message");

    expect(result).toHaveLength(2);
    expect(result[0].from).toBe("customer@example.com");
    expect(result[1].from).toBe(null); // Staff messages: frontend resolves from userId
    expect(result[1].userId).toBe(user.id); // Backend returns userId, frontend resolves display name
  });

  it("includes files for messages", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id);
    const { file } = await fileFactory.create(message.id, { isInline: false, size: 1024 * 1024 });

    vi.mocked(getFileUrl).mockResolvedValue("https://presigned-url.com");

    const result = await getMessages(conversation.id, mailbox);
    assert(result[0]?.type === "message");
    expect(result[0].files[0]).toEqual({
      id: file.id,
      messageId: message.id,
      noteId: null,
      name: file.name,
      size: file.size,
      mimetype: file.mimetype,
      isInline: false,
      presignedUrl: "https://presigned-url.com",
      key: expect.any(String),
      sizeHuman: "1 MB",
      slug: file.slug,
      isPublic: file.isPublic,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      previewKey: null,
      previewUrl: null,
    });
  });

  it("generates Slack links", async () => {
    const { mailbox } = await mailboxFactory.create({ slackBotToken: "test-token" });
    const { conversation } = await conversationFactory.create(mailbox.id);
    await conversationMessagesFactory.create(conversation.id, {
      slackChannel: "test-channel",
      slackMessageTs: "1234567890.123456",
    });

    vi.mocked(getSlackPermalink).mockResolvedValueOnce("https://slack.com/permalink");

    const result = await getMessages(conversation.id, mailbox);

    assert(result[0]?.type === "message");
    expect(result[0].slackUrl).toBe("https://slack.com/permalink");
    expect(getSlackPermalink).toHaveBeenCalledWith("test-token", "test-channel", "1234567890.123456");
  });

  it("sanitizes message bodies", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const unsafeHtml = `
      <p>Safe content</p>
      <script>alert('XSS attack');</script>
      <style>.malicious { display: none; }</style>
      <img src="x" onerror="alert('Another XSS attack')">
      <p onclick="alert('Click me')">Click me</p>
    `;
    await conversationMessagesFactory.create(conversation.id, {
      body: unsafeHtml,
    });

    const result = await getMessages(conversation.id, mailbox);

    expect(result).toHaveLength(1);
    assert(result[0]?.type === "message");
    expect(result[0].body).not.toContain("<script>");
    expect(result[0].body).not.toContain("<style>");
    expect(result[0].body).not.toContain("onerror=");
    expect(result[0].body).toContain("<p>Safe content</p>");
    expect(result[0].body).toContain('<img src="x">');
    expect(result[0].body).not.toContain("onclick=");
  });
});

describe("ensureCleanedUpText", () => {
  it("returns existing cleanedUpText if already present", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: "<p>Original content</p>",
      cleanedUpText: "Existing cleaned up text",
    });

    const result = await ensureCleanedUpText(message);

    expect(result).toBe("Existing cleaned up text");
  });

  it("generates and stores cleanedUpText if not present", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: "<p>Hello</p><p>World</p>",
      cleanedUpText: null,
    });

    const result = await ensureCleanedUpText(message);

    expect(result).toBe("Hello\n\nWorld");

    const updatedMessage = await getConversationMessageById(message.id);
    expect(updatedMessage?.cleanedUpText).toBe("Hello\n\nWorld");
  });

  it("handles empty body", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: "",
      cleanedUpText: null,
    });

    const result = await ensureCleanedUpText(message);

    expect(result).toBe("");
  });

  it("removes HTML tags and extra whitespace", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: "<div>  Hello  </div><br><br><p>  World  </p>",
      cleanedUpText: null,
    });

    const result = await ensureCleanedUpText(message);

    expect(result).toBe("Hello\n\nWorld");
  });

  it("removes invisible tags", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: "<p>Hello</p><script>alert('test');</script><style>.test{color:red;}</style><p>World</p>",
      cleanedUpText: null,
    });

    const result = await ensureCleanedUpText(message);

    expect(result).toBe("Hello\n\nWorld");
  });
});

mockJobs();

describe("createReply", () => {
  it("creates a reply and closes the conversation", async () => {
    const time = new Date("2023-01-01 01:00:00");
    vi.setSystemTime(time);

    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "open" });

    const messageId = await createReply({ conversationId: conversation.id, message: "Test message", user });

    const createdMessage = await getConversationMessageById(messageId);
    expect(createdMessage).toMatchObject({
      body: "Test message",
      role: "staff",
    });

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.status).toBe("closed");

    expect(mockTriggerEvent).toHaveBeenCalledWith(
      "conversations/message.created",
      { messageId, conversationId: conversation.id },
      {},
    );

    expect(mockTriggerEvent).toHaveBeenCalledWith(
      "conversations/email.enqueued",
      { messageId },
      { sleepSeconds: EMAIL_UNDO_COUNTDOWN_SECONDS },
    );
  });

  it("creates a reply without closing the conversation", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "open" });

    const result = await createReply({
      conversationId: conversation.id,
      message: "Test message",
      user,
      close: false,
    });

    const createdMessage = await getConversationMessageById(result);
    expect(createdMessage).toMatchObject({
      body: "Test message",
      role: "staff",
    });

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.status).toBe("open");
  });

  it("creates a reply with CC and BCC recipients", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const result = await createReply({
      conversationId: conversation.id,
      message: "Test message",
      user,
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
    });

    const createdMessage = await getConversationMessageById(result);
    expect(createdMessage).toMatchObject({
      body: "Test message",
      emailCc: ["cc@example.com"],
      emailBcc: ["bcc@example.com"],
    });
  });

  it("creates a reply with Slack information", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const result = await createReply({
      conversationId: conversation.id,
      message: "Test message",
      user,
      slack: {
        channel: "C12345",
        messageTs: "1234567890.123456",
      },
    });

    const createdMessage = await getConversationMessageById(result);
    expect(createdMessage).toMatchObject({
      body: "Test message",
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    });
  });

  it("assigns the conversation to the user when replying to an unassigned conversation", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToId: null });

    await createReply({
      conversationId: conversation.id,
      message: "Test message",
      user,
    });

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.assignedToId).toBe(user.id);
  });

  it("does not change assignment when replying to an already assigned conversation", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { user: otherUser } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToId: otherUser.id });

    await createReply({
      conversationId: conversation.id,
      message: "Test message",
      user,
    });

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.assignedToId).toBe(otherUser.id);
  });

  it("handles reply without user (no assignment)", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToId: null });

    await createReply({
      conversationId: conversation.id,
      message: "Test message",
      user: null,
    });

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.assignedToId).toBeNull();
  });

  it("handles file uploads", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { file } = await fileFactory.create(null, { isInline: true });

    const emailId = await createReply({
      conversationId: conversation.id,
      message: "Test message with files",
      user,
      fileSlugs: [file.slug],
    });

    const updatedFile = await db.query.files.findFirst({
      where: eq(files.id, file.id),
    });
    expect(updatedFile).toMatchObject({ messageId: emailId });
  });

  it("marks message as perfect if it matches the last AI draft", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    await conversationMessagesFactory.create(conversation.id, {
      role: "ai_assistant",
      body: "AI generated response",
      status: "draft",
    });

    const result = await createReply({
      conversationId: conversation.id,
      message: `<p>AI generated response</p>`,
      user,
    });

    const createdMessage = await getConversationMessageById(result);
    expect(createdMessage).toMatchObject({
      body: `<p>AI generated response</p>`,
      isPerfect: true,
    });
  });

  it("discards AI-generated drafts after creating a reply", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    await conversationMessagesFactory.create(conversation.id, {
      role: "ai_assistant",
      body: "AI draft 1",
      status: "draft",
    });
    await conversationMessagesFactory.create(conversation.id, {
      role: "ai_assistant",
      body: "AI draft 2",
      status: "draft",
    });

    await createReply({
      conversationId: conversation.id,
      message: "Human response",
      user,
    });

    const remainingDrafts = await db.query.conversationMessages.findMany({
      where: and(eq(conversationMessages.conversationId, conversation.id), eq(conversationMessages.status, "draft")),
    });
    expect(remainingDrafts).toHaveLength(0);
  });
});

describe("createConversationMessage", () => {
  it("creates a conversation message", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = await createConversationMessage({
      conversationId: conversation.id,
      body: "Test message",
      userId: user.id,
      role: "staff",
      isPerfect: false,
      isFlaggedAsBad: false,
      status: "sent",
    });

    expect(message).toBeTruthy();
    expect(message.body).toBe("Test message");

    expect(mockTriggerEvent).toHaveBeenCalledWith(
      "conversations/message.created",
      { messageId: message.id, conversationId: message.conversationId },
      {},
    );

    expect(mockTriggerEvent).not.toHaveBeenCalledWith(
      "conversations/email.enqueued",
      expect.anything(),
      expect.anything(),
    );
  });

  it("enqueues a queueing message", async () => {
    const time = new Date("2023-01-01 01:00:00");
    vi.setSystemTime(time);

    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = await createConversationMessage({
      conversationId: conversation.id,
      body: "Test message",
      userId: user.id,
      role: "staff",
      isPerfect: false,
      isFlaggedAsBad: false,
      status: "queueing",
    });

    expect(mockTriggerEvent).toHaveBeenCalledWith(
      "conversations/message.created",
      { messageId: message.id, conversationId: message.conversationId },
      {},
    );

    expect(mockTriggerEvent).toHaveBeenCalledWith(
      "conversations/email.enqueued",
      { messageId: message.id },
      { sleepSeconds: EMAIL_UNDO_COUNTDOWN_SECONDS },
    );
  });
});

describe("getConversationMessageById", () => {
  it("finds a conversation message", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id);

    const foundMessage = await getConversationMessageById(message.id);

    expect(foundMessage).toMatchObject({
      id: message.id,
      body: message.body,
    });
  });
});
