import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { getMailboxInfo } from "@/lib/data/mailbox";
import { UserRoles } from "@/lib/data/user";
import { createCaller } from "@/trpc";

vi.mock("@/lib/data/user", () => ({
  UserRoles: {
    CORE: "core",
    NON_CORE: "nonCore",
    AFK: "afk",
  },
  updateUserMailboxData: vi.fn(),
  getUsersWithMailboxAccess: vi.fn(),
}));

describe("mailboxRouter", () => {
  describe("list", () => {
    it("returns a list of mailboxes for the user's organization", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { mailbox: mailbox2 } = await mailboxFactory.create();

      const caller = createCaller(createTestTRPCContext(user));

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
      const { user, mailbox } = await userFactory.createRootUser();
      await db.delete(mailboxes).where(eq(mailboxes.id, mailbox.id));
      const caller = createCaller(createTestTRPCContext(user));

      const result = await caller.mailbox.list();

      expect(result.length).toEqual(1);
      expect(result[0]!.id).not.toEqual(mailbox.id);
    });
  });

  describe("update", () => {
    it("updates slack settings", async () => {
      const { user, mailbox } = await userFactory.createRootUser();

      const caller = createCaller(createTestTRPCContext(user));

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
      const { user, mailbox } = await userFactory.createRootUser();

      const user2 = await userFactory.createUser();
      const { conversation: conversation1 } = await conversationFactory.create(mailbox.id);
      await conversationFactory.createStaffEmail(conversation1.id, user2.id);
      await conversationFactory.createStaffEmail(conversation1.id, user2.id);

      const user3 = await userFactory.createUser();
      const { conversation: conversation2 } = await conversationFactory.create(mailbox.id);
      await conversationFactory.createStaffEmail(conversation2.id, user3.id);

      const caller = createCaller(createTestTRPCContext(user));

      const result = await caller.mailbox.members.stats({ mailboxSlug: mailbox.slug, period: "1y" });

      expect(result.sort((a, b) => a.replyCount - b.replyCount)).toEqual([
        {
          id: user.id,
          email: user.email,
          displayName: user.email,
          replyCount: 0,
          role: UserRoles.AFK,
        },
        {
          id: user3.id,
          email: user3.email,
          displayName: user3.email,
          replyCount: 1,
          role: UserRoles.AFK,
        },
        {
          id: user2.id,
          email: user2.email,
          displayName: user2.email,
          replyCount: 2,
          role: UserRoles.AFK,
        },
      ]);
    });
  });
  describe("get", () => {
    it("returns info for the requested mailbox", async () => {
      const { user, mailbox } = await userFactory.createRootUser();

      const caller = createCaller(createTestTRPCContext(user));

      expect(await caller.mailbox.get({ mailboxSlug: mailbox.slug })).toEqual(await getMailboxInfo(mailbox));
    });
  });
});
