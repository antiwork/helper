import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import type { Message } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as aiChat from "@/lib/ai/chat";

describe("respondWithAI - spam check", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns immediately and skips AI generation when conversation is spam", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({ status: "spam" });

    const loadPrevSpy = vi.spyOn(aiChat, "loadPreviousMessages");
    const genSpy = vi.spyOn(aiChat, "generateAIResponse");

    const message: Message = { id: "1", role: "user", content: "Hello" };

    const result = await aiChat.respondWithAI({
      conversation,
      mailbox,
      userEmail: null,
      sendEmail: false,
      message,
      messageId: 1,
      readPageTool: null,
      guideEnabled: false,
    });

    expect(loadPrevSpy).not.toHaveBeenCalled();
    expect(genSpy).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
