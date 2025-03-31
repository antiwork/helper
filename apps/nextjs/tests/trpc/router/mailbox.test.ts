import { currentUser, User } from "@clerk/nextjs/server";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { getMailboxInfo } from "@/lib/data/mailbox";
import { getClerkOrganization } from "@/lib/data/organization";
import { getClerkUserList } from "@/lib/data/user";
import { createCaller } from "@/trpc";

vi.mock("@/lib/data/user", () => ({
  getClerkUserList: vi.fn(),
}));

vi.mock("@/lib/data/organization", () => ({
  getClerkOrganization: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

describe("mailboxRouter", () => {
  describe("list", () => {
    it("returns a list of mailboxes for the user's organization", async () => {
      const { user, organization, mailbox } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);

      const { mailbox: mailbox2 } = await mailboxFactory.create(organization.id);
      const { organization: otherOrg } = await userFactory.createRootUser();
      await mailboxFactory.create(otherOrg.id);

      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.mailbox.list();

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        {
          id: mailbox.id,
          name: mailbox.name,
          slug: mailbox.slug,
        },
        {
          id: mailbox2.id,
          name: mailbox2.name,
          slug: mailbox2.slug,
        },
      ]);
    });

    it("creates a mailbox if user has no mailboxes", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      vi.mocked(currentUser).mockResolvedValue(user);

      await db.delete(mailboxes).where(eq(mailboxes.id, mailbox.id));
      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.mailbox.list();

      expect(result.length).toEqual(1);
      expect(result[0]!.id).not.toEqual(mailbox.id);
    });
  });

  describe("update", () => {
    it("updates slack settings", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);

      const caller = createCaller(createTestTRPCContext(user, organization));

      const promptUpdatedAtBefore = mailbox.promptUpdatedAt;

      const updateData = {
        slackAlertChannel: "#another-channel",
      };

      await caller.mailbox.update({ mailboxSlug: mailbox.slug, ...updateData });

      const updatedMailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.id, mailbox.id),
      });

      expect(updatedMailbox).toMatchObject(updateData);
      expect(updatedMailbox?.promptUpdatedAt).toEqual(promptUpdatedAtBefore);
    });
  });

  describe("members", () => {
    it("returns a list of mailbox members", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);

      const user2 = userFactory.buildMockUser();
      const { conversation: conversation1 } = await conversationFactory.create(mailbox.id);
      await conversationFactory.createStaffEmail(conversation1.id, user2.id);
      await conversationFactory.createStaffEmail(conversation1.id, user2.id);

      const user3 = userFactory.buildMockUser();
      const { conversation: conversation2 } = await conversationFactory.create(mailbox.id);
      await conversationFactory.createStaffEmail(conversation2.id, user3.id);

      // Assert that other mailbox members are excluded
      const { user: otherUser, mailbox: otherMailbox } = await userFactory.createRootUser();
      const { conversation: otherConversation } = await conversationFactory.create(otherMailbox.id);
      await conversationFactory.createStaffEmail(otherConversation.id, otherUser.id);
      await conversationFactory.createStaffEmail(otherConversation.id, otherUser.id);

      // Mock the Clerk user list response
      vi.mocked(getClerkUserList).mockResolvedValue({
        data: [
          {
            id: user.id,
            emailAddresses: [{ emailAddress: user.emailAddresses[0]?.emailAddress }] as User["emailAddresses"],
            fullName: user.fullName,
          } as User,
          {
            id: user2.id,
            emailAddresses: [{ emailAddress: user2.emailAddresses[0]?.emailAddress }] as User["emailAddresses"],
            fullName: user2.fullName,
          } as User,
          {
            id: user3.id,
            emailAddresses: [{ emailAddress: user3.emailAddresses[0]?.emailAddress }] as User["emailAddresses"],
            fullName: user3.fullName,
          } as User,
        ],
        totalCount: 3,
      });

      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.mailbox.members.stats({ mailboxSlug: mailbox.slug, period: "1y" });

      expect(result.sort((a, b) => a.replyCount - b.replyCount)).toEqual([
        {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          displayName: user.fullName,
          replyCount: 0,
        },
        {
          id: user3.id,
          email: user3.emailAddresses[0]?.emailAddress,
          displayName: user3.fullName,
          replyCount: 1,
        },
        {
          id: user2.id,
          email: user2.emailAddresses[0]?.emailAddress,
          displayName: user2.fullName,
          replyCount: 2,
        },
      ]);

      expect(getClerkUserList).toHaveBeenCalledWith(organization.id);
    });
  });
  describe("get", () => {
    it("returns info for the requested mailbox", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);

      const caller = createCaller(createTestTRPCContext(user, organization));

      expect(await caller.mailbox.get({ mailboxSlug: mailbox.slug })).toEqual(await getMailboxInfo(mailbox));
    });
  });
});
