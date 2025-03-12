import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversations, gmailSupportEmails } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { conversationChannelId, conversationsListChannelId } from "@/lib/ably/channels";
import { publishToAbly } from "@/lib/ably/client";
import { runAIQuery } from "@/lib/ai";
import {
  createConversation,
  getConversationById,
  getConversationBySlug,
  getConversationBySlugAndMailbox,
  getMatchingConversationsByPrompt,
  getNonSupportParticipants,
  getRelatedConversations,
  MAX_RELATED_CONVERSATIONS_COUNT,
  updateConversation,
} from "@/lib/data/conversation";
import { getClerkOrganization } from "@/lib/data/organization";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";

vi.mock("@/components/constants", () => ({
  getBaseUrl: () => "https://example.com",
}));

vi.mock("@/lib/data/conversation", async (importOriginal) => ({
  ...(await importOriginal()),
  MAX_RELATED_CONVERSATIONS_COUNT: 3,
}));

vi.mock("@/lib/emailSearchService/searchEmailsByKeywords", () => ({
  searchEmailsByKeywords: vi.fn(),
}));

// Workflow mocks removed

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

vi.mock("@/lib/ai", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("@/lib/ai")>()),
    runAIQuery: vi.fn(),
  };
});

vi.mock("@/lib/ably/client", () => ({
  publishToAbly: vi.fn(),
}));

vi.mock("@/lib/data/organization", () => ({
  getClerkOrganization: vi.fn(),
}));

describe("createConversation", () => {
  it("creates a new conversation", async () => {
    const { mailbox } = await userFactory.createRootUser();

    const conversation = await createConversation({
      mailboxId: mailbox.id,
      subject: "Test Conversation",
      status: "open",
      slug: "test-conversation",
      source: "email",
    });

    expect(conversation).toHaveProperty("id");
    expect(conversation.mailboxId).toBe(mailbox.id);
    expect(conversation.subject).toBe("Test Conversation");
    expect(conversation.status).toBe("open");
    expect(conversation.slug).toBe("test-conversation");
  });
});

describe("updateConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing conversation", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const result = await updateConversation(conversation.id, { set: { subject: "Updated Subject" } });

    expect(result).not.toBeNull();
    expect(result?.subject).toBe("Updated Subject");
  });

  it("sets closedAt when status changes to closed", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "open" });

    const result = await updateConversation(conversation.id, { set: { status: "closed" } });

    expect(result).not.toBeNull();
    expect(result?.status).toBe("closed");
    expect(result?.closedAt).toBeInstanceOf(Date);
  });

  it("publishes an Ably event when conversation is updated", async () => {
    const { mailbox, organization } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const result = await updateConversation(conversation.id, { set: { subject: "Updated Subject" } });

    await vi.waitUntil(() => vi.mocked(publishToAbly).mock.calls.length === 1);

    expect(result).not.toBeNull();
    expect(publishToAbly).toHaveBeenCalledWith({
      channel: conversationChannelId(mailbox.slug, conversation.slug),
      event: "conversation.updated",
      data: expect.objectContaining({
        slug: conversation.slug,
        subject: "Updated Subject",
      }),
    });
    expect(publishToAbly).not.toHaveBeenCalledWith(expect.objectContaining({ event: "conversation.statusChanged" }));
  });

  it("publishes an Ably event when conversation status changes to closed", async () => {
    const { mailbox, organization } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "open" });

    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const result = await updateConversation(conversation.id, { set: { status: "closed" } });

    await vi.waitUntil(() => vi.mocked(publishToAbly).mock.calls.length === 2);

    expect(result).not.toBeNull();
    expect(publishToAbly).toHaveBeenCalledWith({
      channel: conversationChannelId(mailbox.slug, conversation.slug),
      event: "conversation.updated",
      data: expect.objectContaining({
        id: conversation.id,
        status: "closed",
      }),
    });
    expect(publishToAbly).toHaveBeenCalledWith({
      channel: conversationsListChannelId(mailbox.slug),
      event: "conversation.statusChanged",
      data: {
        id: conversation.id,
        status: "closed",
      },
    });
  });

  it("sends conversations/assigned event when assignedToId changes", async () => {
    const { mailbox, user } = await userFactory.createRootUser();
    const user2 = userFactory.buildMockUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    await updateConversation(conversation.id, {
      set: { assignedToClerkId: user.id },
      byUserId: user2.id,
      message: null,
    });

    expect(inngest.send).toHaveBeenCalledWith({
      name: "conversations/assigned",
      data: {
        conversationId: conversation.id,
        assignEvent: {
          assignedToId: user.id,
          assignedById: user2.id,
          message: null,
        },
      },
    });
  });

  it("sends embedding event when status changes to closed", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "open" });

    await updateConversation(conversation.id, { set: { status: "closed" } });

    expect(inngest.send).toHaveBeenCalledWith({
      name: "conversations/embedding.create",
      data: { conversationSlug: conversation.slug },
    });
  });

  it("does not send embedding event when status is not changed to closed", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "open" });

    await updateConversation(conversation.id, { set: { subject: "Updated Subject" } });

    expect(inngest.send).not.toHaveBeenCalled();
  });
});

describe("getConversationBySlug", () => {
  it("returns a conversation by slug", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { slug: "test-slug" });

    const result = await getConversationBySlug("test-slug");

    expect(result).not.toBeNull();
    expect(result?.id).toBe(conversation.id);
    expect(result?.slug).toBe("test-slug");
  });

  it("returns null if conversation not found", async () => {
    const result = await getConversationBySlug("non-existent-slug");
    expect(result).toBeNull();
  });
});

describe("getConversationById", () => {
  it("returns a conversation by id", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const result = await getConversationById(conversation.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(conversation.id);
  });

  it("returns null if conversation not found", async () => {
    const result = await getConversationById(999999);
    expect(result).toBeNull();
  });
});

describe("getConversationBySlugAndMailbox", () => {
  it("returns a conversation by slug and mailbox id", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { slug: "test-slug-mailbox" });

    const result = await getConversationBySlugAndMailbox("test-slug-mailbox", mailbox.id);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(conversation.id);
    expect(result?.slug).toBe("test-slug-mailbox");
    expect(result?.mailboxId).toBe(mailbox.id);
  });

  it("returns null if conversation not found", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const result = await getConversationBySlugAndMailbox("non-existent-slug", mailbox.id);
    expect(result).toBeNull();
  });
});

describe("getNonSupportParticipants", () => {
  it("returns non-support participants", async () => {
    const gmailSupportEmail = await db
      .insert(gmailSupportEmails)
      .values({
        email: "gmail@example.com",
        accessToken: "123",
        refreshToken: "123",
      })
      .returning({ id: gmailSupportEmails.id })
      .then(takeUniqueOrThrow);
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: { gmailSupportEmailId: gmailSupportEmail.id },
    });
    const { conversation } = await conversationFactory.create(mailbox.id, { emailFrom: "support@example.com" });
    await conversationMessagesFactory.create(conversation.id, {
      emailTo: "user1@example.com",
      emailCc: ["user2@example.com", "support@example.com"],
    });
    await conversationMessagesFactory.create(conversation.id, {
      emailTo: "user3@example.com,user4@example.com,gmail@example.com",
      emailCc: ["user5@example.com"],
    });

    const result = await getNonSupportParticipants(conversation);

    expect(result).toEqual(
      expect.arrayContaining([
        "user1@example.com",
        "user2@example.com",
        "user3@example.com",
        "user4@example.com",
        "user5@example.com",
      ]),
    );
  });

  it("parses the emailTo field", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, { emailFrom: "support@example.com" });
    await conversationMessagesFactory.create(conversation.id, {
      emailTo:
        "New Example <to1@example.com>, to2@example.com, Support Email <support@example.com>, Acme <to3@example.com>",
    });

    const result = await getNonSupportParticipants(conversation);
    expect(result).toEqual(["to1@example.com", "to2@example.com", "to3@example.com"]);
  });
});

describe("getRelatedConversations", () => {
  it("returns related conversations based on email keywords", async () => {
    vi.mocked(runAIQuery).mockResolvedValue("keyword1 keyword2");
    const { mailbox } = await userFactory.createRootUser();
    const { conversation: conversation1 } = await conversationFactory.create(mailbox.id, {
      emailFrom: "related1@example.com",
      subject: "Related Conversation 1",
      status: "open",
    });
    const { conversation: conversation2 } = await conversationFactory.create(mailbox.id, {
      emailFrom: "related2@example.com",
      subject: "Related Conversation 2",
      status: "closed",
    });
    const { message: message1 } = await conversationMessagesFactory.create(conversation1.id, {
      role: "user",
      body: "I have a question about my order.",
      status: null,
    });
    const { message: message2 } = await conversationMessagesFactory.create(conversation2.id, {
      role: "user",
      body: "Can you help me with my account?",
      status: null,
    });

    vi.mocked(searchEmailsByKeywords).mockResolvedValue([
      { id: message1.id, conversationId: conversation1.id },
      { id: message2.id, conversationId: conversation2.id },
    ]);

    // Get all related conversations
    const result = await getRelatedConversations(conversation1.id);
    expect(result).toHaveLength(1);
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: conversation2.id })]));

    // Get all related conversations with status "open"
    const result2 = await getRelatedConversations(conversation1.id, {
      where: eq(conversations.status, "open"),
    });
    expect(result2).toHaveLength(0);
  });

  it("returns an empty array when the conversaiton has no user message", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    await conversationMessagesFactory.create(conversation.id, {
      role: "staff",
      body: "A staff message",
      status: "sent",
    });
    const { conversation: conversation2 } = await conversationFactory.create(mailbox.id);
    await conversationMessagesFactory.create(conversation2.id, {
      role: "staff",
      body: "Another staff message",
      status: "sent",
    });
    const result = await getRelatedConversations(conversation.id);
    expect(result).toHaveLength(0);
  });

  it("returns an empty array when the subject or body is empty", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      emailFrom: "user@example.com",
      subject: "Test Conversation",
    });
    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "",
      status: null,
    });
    const { conversation: conversation2 } = await conversationFactory.create(mailbox.id, {
      emailFrom: "user@example.com",
      subject: "Test Conversation 2",
    });
    await conversationMessagesFactory.create(conversation2.id, {
      role: "user",
      body: "User message 2",
      status: null,
    });

    vi.mocked(searchEmailsByKeywords).mockResolvedValue([]);

    const result = await getRelatedConversations(conversation.id);
    expect(result).toHaveLength(0);
  });

  it("returns an empty array when conversation ID is not found", async () => {
    const result = await getRelatedConversations(999999);
    expect(result).toHaveLength(0);
  });
});

describe("getMatchingConversationsByPrompt", () => {
  const createConversationsWithMessages = async (mailboxId: number, count: number) => {
    const subjects = Array.from({ length: count }, (_, i) => `Subject ${i + 1}`);
    const messages = Array.from({ length: count }, (_, i) => `Message ${i + 1}`);

    const conversations = await Promise.all(
      subjects.map(async (subject) => {
        const { conversation } = await conversationFactory.create(mailboxId, { subject });
        return conversation;
      }),
    );

    await Promise.all(
      conversations.map((conversation, index) =>
        conversationMessagesFactory.create(conversation.id, { role: "user", cleanedUpText: messages[index] }),
      ),
    );
    return conversations;
  };

  it("returns an empty array since workflows have been removed", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const mockConversations = await createConversationsWithMessages(mailbox.id, 3);

    const prompt = "reset my password";
    const result = await getMatchingConversationsByPrompt(mockConversations, prompt);
    expect(result).toEqual([]);
  });
});
