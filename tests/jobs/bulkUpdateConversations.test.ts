import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { mockJobs, mockTriggerEvent } from "@tests/support/jobsUtils";
import { count, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import type { authUsers } from "@/db/supabaseSchema/auth";
import { bulkUpdateConversations } from "@/jobs/bulkUpdateConversations";

vi.mock("@/lib/data/mailbox", () => ({
  getMailbox: vi.fn().mockResolvedValue({
    id: 1,
    slug: "test-mailbox",
  }),
}));

mockJobs();

let user: typeof authUsers.$inferSelect;

beforeEach(async () => {
  vi.clearAllMocks();
  ({ user } = await userFactory.createRootUser());
});

describe("bulkUpdateConversations", () => {
  describe("with conversation IDs array", () => {
    it("assigns conversations to AI", async () => {
      const { user: assigneeUser } = await userFactory.createUser();
      const { conversation: conversation1 } = await conversationFactory.create({
        assignedToId: assigneeUser.id,
        assignedToAI: false,
        status: "open",
      });
      const { conversation: conversation2 } = await conversationFactory.create({
        assignedToId: assigneeUser.id,
        assignedToAI: false,
        status: "open",
      });

      await bulkUpdateConversations({
        conversationFilter: [conversation1.id, conversation2.id],
        assignedToAI: true,
        userId: user.id,
      });

      const updatedConversations = await db.query.conversations.findMany({
        where: (conversations, { inArray }) => inArray(conversations.id, [conversation1.id, conversation2.id]),
      });

      updatedConversations.forEach((conv) => {
        expect(conv).toMatchObject({
          status: "closed",
          assignedToAI: true,
          assignedToId: null,
        });
        expect(conv.closedAt).toBeInstanceOf(Date);
      });
    });

    it("assigns conversations to specific user", async () => {
      const { user } = await userFactory.createRootUser();
      const { user: assigneeUser } = await userFactory.createUser();
      const { conversation: conversation1 } = await conversationFactory.create({
        assignedToId: assigneeUser.id,
      });
      const { conversation: conversation2 } = await conversationFactory.create({
        assignedToId: assigneeUser.id,
      });

      await bulkUpdateConversations({
        conversationFilter: [conversation1.id, conversation2.id],
        assignedToId: user.id,
        userId: user.id,
      });

      const updatedConversations = await db.query.conversations.findMany({
        where: (conversations, { inArray }) => inArray(conversations.id, [conversation1.id, conversation2.id]),
      });

      updatedConversations.forEach((conv) => {
        expect(conv).toMatchObject({
          assignedToId: user.id,
          assignedToAI: false,
        });
      });
    });

    it("closes multiple conversations", async () => {
      const { conversation: conversation1 } = await conversationFactory.create({
        assignedToId: null,
        status: "open",
      });
      const { conversation: conversation2 } = await conversationFactory.create({
        assignedToId: null,
        status: "open",
      });
      const { conversation: conversation3 } = await conversationFactory.create({
        assignedToId: null,
        status: "open",
      });

      await bulkUpdateConversations({
        conversationFilter: [conversation1.id, conversation2.id, conversation3.id],
        status: "closed",
        userId: user.id,
      });

      const updatedConversations = await db.query.conversations.findMany({
        where: (conversations, { inArray }) =>
          inArray(conversations.id, [conversation1.id, conversation2.id, conversation3.id]),
      });

      updatedConversations.forEach((conv) => {
        expect(conv).toMatchObject({
          status: "closed",
        });
        expect(conv.closedAt).toBeInstanceOf(Date);
      });

      expect(mockTriggerEvent).toHaveBeenCalledWith("conversations/embedding.create", {
        conversationSlug: conversation1.slug,
      });
      expect(mockTriggerEvent).toHaveBeenCalledWith("conversations/embedding.create", {
        conversationSlug: conversation2.slug,
      });
      expect(mockTriggerEvent).toHaveBeenCalledWith("conversations/embedding.create", {
        conversationSlug: conversation3.slug,
      });
    });

    it("does not change assignment when conversation is already assigned", async () => {
      const { user: otherUser } = await userFactory.createRootUser();

      const { conversation: conversation1 } = await conversationFactory.create({
        assignedToId: otherUser.id,
        status: "open",
      });

      await bulkUpdateConversations({
        conversationFilter: [conversation1.id],
        status: "closed",
        userId: user.id,
      });

      const updatedConversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversation1.id),
      });

      expect(updatedConversation).toMatchObject({
        status: "closed",
        assignedToId: otherUser.id,
      });
    });

    it("includes message in conversation events", async () => {
      const { conversation } = await conversationFactory.create({
        status: "open",
      });

      const testMessage = "Bulk closing due to resolution";

      await bulkUpdateConversations({
        conversationFilter: [conversation.id],
        status: "closed",
        userId: user.id,
        message: testMessage,
      });

      const updatedConversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversation.id),
      });

      expect(updatedConversation).toMatchObject({
        status: "closed",
      });

      const conversationEvent = await db.query.conversationEvents.findFirst({
        where: (conversationEvents, { eq }) => eq(conversationEvents.conversationId, conversation.id),
      });

      expect(conversationEvent).toMatchObject({
        conversationId: conversation.id,
        byUserId: user.id,
        reason: testMessage,
        type: "update",
      });
    });

    it("reopens multiple conversations", async () => {
      const { conversation: conversation1 } = await conversationFactory.create({
        status: "closed",
        closedAt: new Date(),
      });
      const { conversation: conversation2 } = await conversationFactory.create({
        status: "closed",
        closedAt: new Date(),
      });

      await bulkUpdateConversations({
        conversationFilter: [conversation1.id, conversation2.id],
        status: "open",
        userId: user.id,
      });

      const updatedConversations = await db.query.conversations.findMany({
        where: (conversations, { inArray }) => inArray(conversations.id, [conversation1.id, conversation2.id]),
      });

      updatedConversations.forEach((conv) => {
        expect(conv).toMatchObject({
          status: "open",
        });

        expect(conv.closedAt).toBeInstanceOf(Date);
      });
    });

    it("marks multiple conversations as spam", async () => {
      const { conversation: conversation1 } = await conversationFactory.create({
        status: "open",
      });
      const { conversation: conversation2 } = await conversationFactory.create({
        status: "open",
      });

      await bulkUpdateConversations({
        conversationFilter: [conversation1.id, conversation2.id],
        status: "spam",
        userId: user.id,
      });

      const updatedConversations = await db.query.conversations.findMany({
        where: (conversations, { inArray }) => inArray(conversations.id, [conversation1.id, conversation2.id]),
      });

      updatedConversations.forEach((conv) => {
        expect(conv).toMatchObject({
          status: "spam",
        });

        expect(conv.closedAt).toBeNull();
      });
    });
  });

  describe("with search schema", () => {
    it("updates conversations matching search criteria", async () => {
      const { conversation: firstOpenConv } = await conversationFactory.create({
        status: "open",
        assignedToId: null,
      });
      const { conversation: secondOpenConv } = await conversationFactory.create({
        status: "open",
        assignedToId: null,
      });
      const { conversation: _closedConv } = await conversationFactory.create({
        status: "closed",
      });
      const result = await bulkUpdateConversations({
        conversationFilter: {
          status: ["open"],
          cursor: null,
          limit: 25,
          sort: null,
          search: null,
          category: null,
        },
        status: "closed",
        userId: user.id,
      });

      const openConversations = await db.query.conversations.findMany({
        where: (conversations, { inArray }) => inArray(conversations.id, [firstOpenConv.id, secondOpenConv.id]),
      });

      expect(result).toMatchObject({
        message: "Updated 2 conversations to status: closed",
      });

      const openConv = await db.select({ count: count() }).from(conversations).where(eq(conversations.status, "open"));
      expect(openConv[0]?.count).toBe(0);

      openConversations.forEach((conv) => {
        expect(conv).toMatchObject({
          status: "closed",
        });
        expect(conv.closedAt).toBeInstanceOf(Date);
      });
    });
  });
});
