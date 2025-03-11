import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addNote } from "@/lib/data/note";

describe("addNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a note for a conversation", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const note = await addNote({
      conversationId: conversation.id,
      message: "Test note",
      user,
      slackChannel: "C123456",
      slackMessageTs: "1234567890.123456",
    });

    expect(note).toEqual(
      expect.objectContaining({
        conversationId: conversation.id,
        body: "Test note",
        clerkUserId: user.id,
        role: "staff",
        slackChannel: "C123456",
        slackMessageTs: "1234567890.123456",
      }),
    );
  });

  it("creates a note without a user", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const note = await addNote({
      conversationId: conversation.id,
      message: "Anonymous note",
      user: null,
    });

    expect(note).toEqual(
      expect.objectContaining({
        conversationId: conversation.id,
        body: "Anonymous note",
        clerkUserId: null,
        role: "staff",
        slackChannel: null,
        slackMessageTs: null,
      }),
    );
  });
});
