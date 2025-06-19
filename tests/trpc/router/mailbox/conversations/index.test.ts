import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { mailboxMetadataApiFactory } from "@tests/support/factories/mailboxesMetadataApi";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { userFactory } from "@tests/support/factories/users";
import { mockTriggerEvent } from "@tests/support/jobsUtils";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
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

beforeEach(() => {
  vi.clearAllMocks();
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
      const { user } = await userFactory.createRootUser();
      const { mailbox } = await mailboxFactory.create({
        slackBotToken: "slackBotToken",
        slackAlertChannel: "slackAlertChannel",
      });
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { conversation: assignedConversation } = await conversationFactory.create(mailbox.id, {
        assignedToId: user.id,
      });

      const caller = createCaller(createTestTRPCContext(user));
      expect(await caller.mailbox.conversations.list({ ...defaultParams, mailboxSlug: mailbox.slug })).toMatchObject({
        conversations: expect.arrayContaining([
          expect.objectContaining({ slug: conversation.slug }),
          expect.objectContaining({ slug: assignedConversation.slug }),
        ]),
      });

      expect(
        await caller.mailbox.conversations.list({
          ...defaultParams,
          mailboxSlug: mailbox.slug,
          category: "mine",
        }),
      ).toMatchObject({
        conversations: [{ slug: assignedConversation.slug }],
        defaultSort: "oldest",
        assignedToIds: [user.id],
      });
    });

    it("sorts by platformCustomers.value with nulls last", async () => {
      const { user } = await userFactory.createRootUser();
      const { mailbox } = await mailboxFactory.create();
      await mailboxMetadataApiFactory.create(mailbox.id);

      await conversationFactory.create(mailbox.id, {
        emailFrom: "high@example.com",
      });
      await conversationFactory.create(mailbox.id, {
        emailFrom: "low@example.com",
      });
      await conversationFactory.create(mailbox.id, {
        emailFrom: "no-value@example.com",
      });

      await platformCustomerFactory.create(mailbox.id, {
        email: "high@example.com",
        value: "1000",
      });
      await platformCustomerFactory.create(mailbox.id, {
        email: "low@example.com",
        value: "500",
      });
      // No platformCustomer for no-value@example.com

      const caller = createCaller(createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.list({ ...defaultParams, mailboxSlug: mailbox.slug });

      expect(result.conversations.map((c) => c.emailFrom)).toEqual([
        "high@example.com",
        "low@example.com",
        "no-value@example.com",
      ]);
    });
  });

  describe("count", () => {
    it("returns the total number of conversations", async () => {
      const { user } = await userFactory.createRootUser();
      const { mailbox } = await mailboxFactory.create();
      await conversationFactory.create(mailbox.id);
      await conversationFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.count({ ...defaultParams, mailboxSlug: mailbox.slug });

      expect(result.total).toBe(2);
    });
  });

  describe("update", () => {
    it("updates an existing conversation", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user));
      await caller.mailbox.conversations.update({
        mailboxSlug: mailbox.slug,
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
        mailboxSlug: mailbox.slug,
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
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user));
      await caller.mailbox.conversations.update({
        mailboxSlug: mailbox.slug,
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
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id, {
        status: "closed",
      });
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id);
      const { file } = await fileFactory.create(message.id);

      const caller = createCaller(createTestTRPCContext(user));
      await caller.mailbox.conversations.undo({
        mailboxSlug: mailbox.slug,
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
});
