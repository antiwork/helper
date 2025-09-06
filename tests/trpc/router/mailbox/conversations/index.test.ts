import { conversationFollowersFactory } from "@tests/support/factories/conversationFollowers";
import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { mockTriggerEvent } from "@tests/support/jobsUtils";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationFollowers, conversations, mailboxes } from "@/db/schema";
import type { authUsers } from "@/db/supabaseSchema/auth";
import { createCaller } from "@/trpc";

vi.mock("@/lib/slack/client", () => ({
  getSlackPermalink: vi.fn().mockResolvedValue("https://slack.com/mock-permalink"),
}));

vi.mock("@/lib/data/conversationMessage", () => ({
  createReply: vi.fn(),
}));

vi.mock("@/lib/data/organization", () => ({
  getOrganizationMembers: vi.fn(),
}));

let user: typeof authUsers.$inferSelect;

beforeEach(async () => {
  vi.clearAllMocks();
  await db.delete(conversationFollowers);
  await db.delete(conversations);
  await db.delete(mailboxes);
  ({ user } = await userFactory.createRootUser({
    mailboxOverrides: {
      slackBotToken: "slackBotToken",
      slackAlertChannel: "slackAlertChannel",
    },
  }));
});

const defaultParams = {
  status: null,
  page: 1,
  sort: null,
  search: null,
  category: null,
};

describe("conversationsRouter", () => {
  describe("list", () => {
    it("returns conversations", async () => {
      const { conversation } = await conversationFactory.create();
      const { conversation: assignedConversation } = await conversationFactory.create({
        assignedToId: user.id,
      });
      const caller = createCaller(await createTestTRPCContext(user));
      expect(await caller.mailbox.conversations.list({ ...defaultParams })).toMatchObject({
        conversations: expect.arrayContaining([
          expect.objectContaining({ slug: conversation.slug }),
          expect.objectContaining({ slug: assignedConversation.slug }),
        ]),
      });
      expect(
        await caller.mailbox.conversations.list({
          ...defaultParams,
          category: "mine",
        }),
      ).toMatchObject({
        conversations: [{ slug: assignedConversation.slug }],
        defaultSort: "newest",
        assignedToIds: [user.id],
      });
    });

    it("sorts by platformCustomers.value with nulls last", async () => {
      await conversationFactory.create({
        emailFrom: "high@example.com",
      });
      await conversationFactory.create({
        emailFrom: "low@example.com",
      });
      await conversationFactory.create({
        emailFrom: "no-value@example.com",
      });
      await platformCustomerFactory.create({
        email: "high@example.com",
        value: "1000",
      });
      await platformCustomerFactory.create({
        email: "low@example.com",
        value: "500",
      });
      // No platformCustomer for no-value@example.com
      const caller = createCaller(await createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.list({ ...defaultParams, status: ["open"] });
      expect(result.conversations.map((c) => c.emailFrom)).toEqual([
        "high@example.com",
        "low@example.com",
        "no-value@example.com",
      ]);
    });
  });

  describe("count", () => {
    it("returns the total number of conversations", async () => {
      await conversationFactory.create();
      await conversationFactory.create();
      const caller = createCaller(await createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.count({ ...defaultParams });
      expect(result.total).toBe(2);
    });
  });

  describe("update", () => {
    it("updates an existing conversation", async () => {
      const { conversation } = await conversationFactory.create();

      const caller = createCaller(await createTestTRPCContext(user));
      await caller.mailbox.conversations.update({
        conversationSlug: conversation.slug,
        status: "closed",
      });

      let updatedConversation = await db.query.conversations.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, conversation.id),
      });

      expect(updatedConversation).toMatchObject({
        id: conversation.id,
        slug: conversation.slug,
        status: "closed",
      });
      expect(updatedConversation!.closedAt).toBeInstanceOf(Date);

      await caller.mailbox.conversations.update({
        conversationSlug: conversation.slug,
        assignedToId: user.id,
      });

      updatedConversation = await db.query.conversations.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, conversation.id),
      });

      expect(updatedConversation).toMatchObject({
        id: conversation.id,
        slug: conversation.slug,
        assignedToId: user.id,
      });

      expect(mockTriggerEvent).toHaveBeenCalledWith("conversations/embedding.create", {
        conversationSlug: conversation.slug,
      });
    });

    it("updates status without setting closedAt or calling triggerEvent when not closed", async () => {
      const { conversation } = await conversationFactory.create();

      const caller = createCaller(await createTestTRPCContext(user));
      await caller.mailbox.conversations.update({
        conversationSlug: conversation.slug,
        status: "spam",
      });

      const updatedConversation = await db.query.conversations.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, conversation.id),
      });

      expect(updatedConversation).toMatchObject({
        id: conversation.id,
        slug: conversation.slug,
        status: "spam",
      });
      expect(updatedConversation!.closedAt).toBeNull();

      expect(mockTriggerEvent).not.toHaveBeenCalled();
    });
  });

  describe("undo", () => {
    it("undoes the provided email", async () => {
      const { conversation } = await conversationFactory.create({
        status: "closed",
      });
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id);
      const { file } = await fileFactory.create(message.id);

      const caller = createCaller(await createTestTRPCContext(user));
      await caller.mailbox.conversations.undo({
        conversationSlug: conversation.slug,
        emailId: message.id,
      });

      const updatedConversation = await db.query.conversations.findFirst({
        where: (conversations, { eq }) => eq(conversations.id, conversation.id),
      });
      const updatedMessage = await db.query.conversationMessages.findFirst({
        where: (conversationMessages, { eq }) => eq(conversationMessages.id, message.id),
      });
      const updatedFile = await db.query.files.findFirst({
        where: (files, { eq }) => eq(files.id, file.id),
      });

      expect(updatedConversation).toMatchObject({
        id: conversation.id,
        slug: conversation.slug,
        status: "open",
      });
      expect(updatedMessage).toMatchObject({
        id: message.id,
        deletedAt: expect.any(Date),
      });
      expect(updatedFile).toMatchObject({
        id: file.id,
        messageId: null,
      });
    });
  });

  describe("follow", () => {
    it("allows a user to follow a conversation", async () => {
      const { conversation } = await conversationFactory.create();
      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.mailbox.conversations.follow({
        conversationSlug: conversation.slug,
      });

      expect(result).toMatchObject({
        success: true,
        following: true,
      });

      const followers = await db.query.conversationFollowers.findMany({
        where: (conversationFollowers, { eq }) => eq(conversationFollowers.conversationId, conversation.id),
      });

      expect(followers).toHaveLength(1);
      expect(followers[0]).toMatchObject({
        conversationId: conversation.id,
        userId: user.id,
      });
    });

    it("handles duplicate follows gracefully", async () => {
      const { conversation } = await conversationFactory.create();
      await conversationFollowersFactory.create({
        conversationId: conversation.id,
        userId: user.id,
      });

      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.mailbox.conversations.follow({
        conversationSlug: conversation.slug,
      });

      expect(result).toMatchObject({
        success: true,
        following: true,
      });

      const followers = await db.query.conversationFollowers.findMany({
        where: (conversationFollowers, { eq }) => eq(conversationFollowers.conversationId, conversation.id),
      });

      expect(followers).toHaveLength(1);
    });
  });

  describe("unfollow", () => {
    it("allows a user to unfollow a conversation", async () => {
      const { conversation } = await conversationFactory.create();
      await conversationFollowersFactory.create({
        conversationId: conversation.id,
        userId: user.id,
      });

      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.mailbox.conversations.unfollow({
        conversationSlug: conversation.slug,
      });

      expect(result).toMatchObject({
        success: true,
        following: false,
      });

      const followers = await db.query.conversationFollowers.findMany({
        where: (conversationFollowers, { eq }) => eq(conversationFollowers.conversationId, conversation.id),
      });

      expect(followers).toHaveLength(0);
    });

    it("handles unfollowing when not following gracefully", async () => {
      const { conversation } = await conversationFactory.create();

      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.mailbox.conversations.unfollow({
        conversationSlug: conversation.slug,
      });

      expect(result).toMatchObject({
        success: true,
        following: false,
      });
    });
  });

  describe("isFollowing", () => {
    it("returns true when user is following the conversation", async () => {
      const { conversation } = await conversationFactory.create();
      await conversationFollowersFactory.create({
        conversationId: conversation.id,
        userId: user.id,
      });

      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.mailbox.conversations.isFollowing({
        conversationSlug: conversation.slug,
      });

      expect(result).toMatchObject({
        following: true,
      });
    });

    it("returns false when user is not following the conversation", async () => {
      const { conversation } = await conversationFactory.create();

      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.mailbox.conversations.isFollowing({
        conversationSlug: conversation.slug,
      });

      expect(result).toMatchObject({
        following: false,
      });
    });
  });

  describe("bulkUpdate", () => {
    it("handles non-existent conversation IDs gracefully", async () => {
      const caller = createCaller(await createTestTRPCContext(user));

      await expect(
        caller.mailbox.conversations.bulkUpdate({
          conversationFilter: [99999, 99998],
          status: "closed",
        }),
      ).rejects.toThrow();
    });

    it("triggers job for more than 25 conversations", async () => {
      const manyConversationIds = Array.from({ length: 26 }, (_, i) => i + 1);

      const caller = createCaller(await createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.bulkUpdate({
        conversationFilter: manyConversationIds,
        status: "spam",
      });

      expect(result).toMatchObject({
        updatedImmediately: false,
      });

      expect(mockTriggerEvent).toHaveBeenCalledWith("conversations/bulk-update", {
        userId: user.id,
        conversationFilter: manyConversationIds,
        status: "spam",
        assignedToId: undefined,
        assignedToAI: undefined,
        message: undefined,
      });
    });

    it("updates conversations immediately for ≤25 conversations", async () => {
      const promises = Array.from({ length: 25 }, () => conversationFactory.create({ status: "open" }));
      const manyConversations = await Promise.all(promises);
      const manyConversationIds = manyConversations.map(({ conversation }) => conversation.id);

      const caller = createCaller(await createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.bulkUpdate({
        conversationFilter: manyConversationIds,
        status: "closed",
      });

      expect(result).toMatchObject({
        updatedImmediately: true,
      });

      const bulkUpdateCalls = vi
        .mocked(mockTriggerEvent)
        .mock.calls.filter(([eventName]) => eventName === "conversations/bulk-update");
      expect(bulkUpdateCalls).toHaveLength(0);
    });

    it("uses search schema for job queue", async () => {
      const caller = createCaller(await createTestTRPCContext(user));

      const searchFilter = {
        status: ["open"],
        cursor: null,
        limit: 25,
        sort: null,
        search: null,
        category: null,
      };

      const result = await caller.mailbox.conversations.bulkUpdate({
        conversationFilter: searchFilter,
        status: "open",
        assignedToAI: true,
      });

      expect(result).toMatchObject({
        updatedImmediately: false,
      });

      expect(mockTriggerEvent).toHaveBeenCalledWith("conversations/bulk-update", {
        userId: user.id,
        conversationFilter: searchFilter,
        status: "open",
        assignedToId: undefined,
        assignedToAI: true,
        message: undefined,
      });
    });
  });
});
