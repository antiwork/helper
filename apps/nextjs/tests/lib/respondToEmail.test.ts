import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { mockInngest } from "@tests/support/inngestUtils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes, messageNotifications } from "@/db/schema";
import * as conversationMessagesDataModule from "@/lib/data/conversationMessage";
import { fetchMetadata } from "@/lib/data/retrieval";
import { respondToEmail } from "@/lib/respondToEmail";

vi.mock("@/lib/data/retrieval", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/data/retrieval")>();
  return {
    ...mod,
    fetchMetadata: vi.fn().mockResolvedValue({ prompt: "prompt", metadata: { name: "John Doe", value: 123 } }),
  };
});

vi.mock("@/emails/autoReply", () => ({
  default: vi.fn().mockReturnValue("Mock auto reply email component"),
}));

vi.mock("@/lib/resend/client", () => ({
  sendEmail: vi.fn(),
}));

const inngestMock = mockInngest();

beforeEach(() => {
  vi.clearAllMocks();
});

const createConversationWithUserEmail = async ({
  conversationOverrides,
}: {
  conversationOverrides?: Partial<typeof conversations.$inferInsert>;
}) => {
  const { mailbox } = await userFactory.createRootUser();
  const { conversation } = await conversationFactory.create(mailbox.id, conversationOverrides);
  const email = await conversationFactory.createUserEmail(conversation.id);

  return { conversation, email, mailbox };
};

describe("respondToEmail", () => {
  it("short-circuits for emails on spam conversations", async () => {
    vi.spyOn(conversationMessagesDataModule, "ensureCleanedUpText");
    const { email } = await createConversationWithUserEmail({
      conversationOverrides: { status: "spam" },
    });

    await respondToEmail(email.id);

    expect(conversationMessagesDataModule.ensureCleanedUpText).not.toHaveBeenCalled();
    expect(fetchMetadata).not.toHaveBeenCalled();
  });

  it("enqueues auto response creation when autoRespondEmailToChat is enabled", async () => {
    const { email, mailbox } = await createConversationWithUserEmail({});
    await db
      .update(mailboxes)
      .set({
        autoRespondEmailToChat: true,
        widgetHost: "https://widget.example.com",
      })
      .where(eq(mailboxes.id, mailbox.id));

    await respondToEmail(email.id);

    expect(inngestMock.send).toHaveBeenCalledWith({
      name: "conversations/auto-response.create",
      data: { messageId: email.id },
    });
  });

  it("does not enqueue auto response when autoRespondEmailToChat is disabled", async () => {
    const { email, mailbox } = await createConversationWithUserEmail({});
    await db
      .update(mailboxes)
      .set({
        autoRespondEmailToChat: false,
        widgetHost: null,
      })
      .where(eq(mailboxes.id, mailbox.id));

    await respondToEmail(email.id);

    expect(inngestMock.send).not.toHaveBeenCalledWith({
      name: "conversations/auto-response.create",
      data: { messageId: email.id },
    });
  });

  it("does not enqueue auto response for follow-up messages", async () => {
    const { email, mailbox, conversation } = await createConversationWithUserEmail({});
    await db
      .update(mailboxes)
      .set({
        autoRespondEmailToChat: true,
        widgetHost: "https://widget.example.com",
      })
      .where(eq(mailboxes.id, mailbox.id));

    // Create an additional message to make this a follow-up
    await conversationFactory.createUserEmail(conversation.id);

    await respondToEmail(email.id);

    expect(inngestMock.send).not.toHaveBeenCalledWith({
      name: "conversations/auto-response.create",
    });
  });
});
