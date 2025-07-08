import { describe, expect, it } from "vitest";
import { searchConversations } from "@/lib/data/conversation/search";
import { conversationMessagesFactory } from "@/tests/support/factories/conversationMessages";
import { conversationFactory } from "@/tests/support/factories/conversations";
import { userFactory } from "@/tests/support/factories/users";

describe("searchConversations", () => {
  describe("reaction filtering", () => {
    it("should filter conversations by positive reactions within date range", async () => {
      const { mailbox } = await userFactory.createRootUser();

      const { conversation: conversation1 } = await conversationFactory.create({
        subject: "Conversation with positive reaction",
      });

      const { conversation: conversation2 } = await conversationFactory.create({
        subject: "Conversation with negative reaction",
      });

      const { conversation: conversation3 } = await conversationFactory.create({
        subject: "Conversation with no reactions",
      });

      const reactionDate1 = new Date("2025-01-15T12:00:00Z");
      const reactionDate2 = new Date("2025-01-16T12:00:00Z");

      await conversationMessagesFactory.create(conversation1.id, {
        role: "ai_assistant",
        body: "AI response 1",
        reactionType: "thumbs-up",
        reactionCreatedAt: reactionDate1,
      });

      await conversationMessagesFactory.create(conversation2.id, {
        role: "ai_assistant",
        body: "AI response 2",
        reactionType: "thumbs-down",
        reactionCreatedAt: reactionDate2,
      });

      await conversationMessagesFactory.create(conversation3.id, {
        role: "ai_assistant",
        body: "AI response 3",
      });

      const search = await searchConversations(mailbox, {
        reactionType: "thumbs-up",
        reactionAfter: "2025-01-15T00:00:00Z",
        reactionBefore: "2025-01-15T23:59:59Z",
        limit: 10,
      });

      const result = await search.list;

      expect(result.results).toHaveLength(1);
      expect(result.results?.[0]?.id).toBe(conversation1.id);
      expect(result.results?.[0]?.subject).toBe("Conversation with positive reaction");
    });

    it("should filter conversations by negative reactions within date range", async () => {
      const { mailbox } = await userFactory.createRootUser();

      const { conversation: conversation1 } = await conversationFactory.create({
        subject: "Conversation with positive reaction",
      });

      const { conversation: conversation2 } = await conversationFactory.create({
        subject: "Conversation with negative reaction",
      });

      const reactionDate1 = new Date("2025-01-15T12:00:00Z");
      const reactionDate2 = new Date("2025-01-16T12:00:00Z");

      await conversationMessagesFactory.create(conversation1.id, {
        role: "ai_assistant",
        body: "AI response 1",
        reactionType: "thumbs-up",
        reactionCreatedAt: reactionDate1,
      });

      await conversationMessagesFactory.create(conversation2.id, {
        role: "ai_assistant",
        body: "AI response 2",
        reactionType: "thumbs-down",
        reactionCreatedAt: reactionDate2,
      });

      const search = await searchConversations(mailbox, {
        reactionType: "thumbs-down",
        reactionAfter: "2025-01-16T00:00:00Z",
        reactionBefore: "2025-01-16T23:59:59Z",
        limit: 10,
      });

      const result = await search.list;

      expect(result.results).toHaveLength(1);
      expect(result.results?.[0]?.id).toBe(conversation2.id);
      expect(result.results?.[0]?.subject).toBe("Conversation with negative reaction");
    });

    it("should return empty results when no reactions exist in date range", async () => {
      const { mailbox } = await userFactory.createRootUser();

      const { conversation } = await conversationFactory.create({
        subject: "Conversation with reaction outside date range",
      });

      await conversationMessagesFactory.create(conversation.id, {
        role: "ai_assistant",
        body: "AI response",
        reactionType: "thumbs-up",
        reactionCreatedAt: new Date("2025-01-10T12:00:00Z"),
      });

      const search = await searchConversations(mailbox, {
        reactionType: "thumbs-up",
        reactionAfter: "2025-01-15T00:00:00Z",
        reactionBefore: "2025-01-15T23:59:59Z",
        limit: 10,
      });

      const result = await search.list;

      expect(result.results).toHaveLength(0);
    });

    it("should filter by reactionAfter only", async () => {
      const { mailbox } = await userFactory.createRootUser();

      const { conversation: conversation1 } = await conversationFactory.create({
        subject: "Old reaction",
      });

      const { conversation: conversation2 } = await conversationFactory.create({
        subject: "New reaction",
      });

      await conversationMessagesFactory.create(conversation1.id, {
        role: "ai_assistant",
        body: "AI response 1",
        reactionType: "thumbs-up",
        reactionCreatedAt: new Date("2025-01-10T12:00:00Z"),
      });

      await conversationMessagesFactory.create(conversation2.id, {
        role: "ai_assistant",
        body: "AI response 2",
        reactionType: "thumbs-up",
        reactionCreatedAt: new Date("2025-01-20T12:00:00Z"),
      });

      const search = await searchConversations(mailbox, {
        reactionType: "thumbs-up",
        reactionAfter: "2025-01-15T00:00:00Z",
        limit: 10,
      });

      const result = await search.list;
      expect(result.results).toHaveLength(1);
      expect(result.results?.[0]?.id).toBe(conversation2.id);
      expect(result.results?.[0]?.subject).toBe("New reaction");
    });

    it("should filter by reactionBefore only", async () => {
      const { mailbox } = await userFactory.createRootUser();

      const { conversation: conversation1 } = await conversationFactory.create({
        subject: "Old reaction",
      });

      const { conversation: conversation2 } = await conversationFactory.create({
        subject: "New reaction",
      });

      await conversationMessagesFactory.create(conversation1.id, {
        role: "ai_assistant",
        body: "AI response 1",
        reactionType: "thumbs-up",
        reactionCreatedAt: new Date("2025-01-10T12:00:00Z"),
      });

      await conversationMessagesFactory.create(conversation2.id, {
        role: "ai_assistant",
        body: "AI response 2",
        reactionType: "thumbs-up",
        reactionCreatedAt: new Date("2025-01-20T12:00:00Z"),
      });

      const search = await searchConversations(mailbox, {
        reactionType: "thumbs-up",
        reactionBefore: "2025-01-15T00:00:00Z",
        limit: 10,
      });

      const result = await search.list;

      expect(result.results).toHaveLength(1);
      expect(result.results?.[0]?.id).toBe(conversation1.id);
      expect(result.results?.[0]?.subject).toBe("Old reaction");
    });

    it("should ignore deleted messages when filtering reactions", async () => {
      const { mailbox } = await userFactory.createRootUser();

      const { conversation } = await conversationFactory.create({
        subject: "Conversation with deleted reaction",
      });

      await conversationMessagesFactory.create(conversation.id, {
        role: "ai_assistant",
        body: "AI response",
        reactionType: "thumbs-up",
        reactionCreatedAt: new Date("2025-01-15T12:00:00Z"),
        deletedAt: new Date("2025-01-15T13:00:00Z"),
      });

      const search = await searchConversations(mailbox, {
        reactionType: "thumbs-up",
        reactionAfter: "2025-01-15T00:00:00Z",
        reactionBefore: "2025-01-15T23:59:59Z",
        limit: 10,
      });

      const result = await search.list;

      expect(result.results).toHaveLength(0);
    });
  });
});
