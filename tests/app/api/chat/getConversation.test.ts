import { describe, expect, it } from "vitest";
import { getConversation } from "@/app/api/chat/getConversation";
import type { WidgetSessionPayload } from "@/lib/widgetSession";
import { conversationFactory } from "@/tests/support/factories/conversations";

describe("getConversation", () => {
  describe("successful access", () => {
    it("allows access with matching anonymous session", async () => {
      const { conversation } = await conversationFactory.create({
        emailFrom: "user@example.com",
        anonymousSessionId: "anonymous-session-123",
        subject: "Test Subject",
        status: "open",
      });

      const session: WidgetSessionPayload = {
        isAnonymous: true,
        anonymousSessionId: "anonymous-session-123",
        showWidget: true,
        isWhitelabel: false,
      };

      const result = await getConversation(conversation.slug, session);

      expect(result).toEqual(conversation);
    });

    it("allows access with matching email address", async () => {
      const { conversation } = await conversationFactory.create({
        emailFrom: "user@example.com",
        anonymousSessionId: "anonymous-session-123",
        subject: "Test Subject",
        status: "open",
      });

      const session: WidgetSessionPayload = {
        isAnonymous: false,
        email: "user@example.com",
        showWidget: true,
        isWhitelabel: false,
      };

      const result = await getConversation(conversation.slug, session);

      expect(result).toEqual(conversation);
    });
  });

  it("throws error when conversation does not exist", async () => {
    const session: WidgetSessionPayload = {
      isAnonymous: true,
      anonymousSessionId: "anonymous-session-123",
      showWidget: true,
      isWhitelabel: false,
    };

    await expect(getConversation("non-existent-slug", session)).rejects.toThrow("Conversation not found");
  });

  describe("unauthorized access", () => {
    it("throws error when session does not match conversation", async () => {
      const { conversation } = await conversationFactory.create({
        emailFrom: "user@example.com",
        anonymousSessionId: "anonymous-session-123",
        subject: "Test Subject",
        status: "open",
      });

      const wrongAnonymousSession: WidgetSessionPayload = {
        isAnonymous: true,
        anonymousSessionId: "different-session-456",
        showWidget: true,
        isWhitelabel: false,
      };

      await expect(getConversation(conversation.slug, wrongAnonymousSession)).rejects.toThrow("Unauthorized");

      const wrongEmailSession: WidgetSessionPayload = {
        isAnonymous: false,
        email: "different@example.com",
        showWidget: true,
        isWhitelabel: false,
      };

      await expect(getConversation(conversation.slug, wrongEmailSession)).rejects.toThrow("Unauthorized");
    });

    it("throws error when session is missing required credentials", async () => {
      const { conversation } = await conversationFactory.create({
        emailFrom: "user@example.com",
        anonymousSessionId: "anonymous-session-123",
        subject: "Test Subject",
        status: "open",
      });

      const incompleteAnonymousSession: WidgetSessionPayload = {
        isAnonymous: true,
        showWidget: true,
        isWhitelabel: false,
      };

      await expect(getConversation(conversation.slug, incompleteAnonymousSession)).rejects.toThrow("Unauthorized");

      const incompleteEmailSession: WidgetSessionPayload = {
        isAnonymous: false,
        showWidget: true,
        isWhitelabel: false,
      };

      await expect(getConversation(conversation.slug, incompleteEmailSession)).rejects.toThrow("Unauthorized");
    });
  });
});
