import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { styleLinterFactory } from "@tests/support/factories/styleLinters";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { setPrivateMetadata } from "@/lib/data/organization";
import { createCaller } from "@/trpc";

vi.mock("@/lib/data/organization", () => ({
  setPrivateMetadata: vi.fn(),
}));

beforeEach(() => {
  vi.useRealTimers();
});

describe("styleLintersRouter", () => {
  describe("list", () => {
    it("returns a list of style linters", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const linter1 = await styleLinterFactory.create(organization.id, { before: "before1", after: "after1" });
      const linter2 = await styleLinterFactory.create(organization.id, { before: "before2", after: "after2" });
      const linter3 = await styleLinterFactory.create(organization.id, { before: "before3", after: "after3" });

      // Linters from other organizations are not returned
      const { organization: otherOrganization } = await userFactory.createRootUser();
      await styleLinterFactory.create(otherOrganization.id, { before: "before4", after: "after4" });

      const caller = createCaller(createTestTRPCContext(user, organization));
      const result = (await caller.mailbox.styleLinters.list({ mailboxSlug: mailbox.slug })).sort(
        (a, b) => a.id - b.id,
      );
      expect(result).toEqual([
        {
          id: linter1.id,
          before: "before1",
          after: "after1",
        },
        {
          id: linter2.id,
          before: "before2",
          after: "after2",
        },
        {
          id: linter3.id,
          before: "before3",
          after: "after3",
        },
      ]);

      // The same linters get returned for other mailboxes in the same organization
      const { mailbox: otherMailbox } = await mailboxFactory.create(organization.id);
      expect(
        (await caller.mailbox.styleLinters.list({ mailboxSlug: otherMailbox.slug })).sort((a, b) => a.id - b.id),
      ).toEqual(result);
    });
  });

  describe("setEnabled", () => {
    it("enables/disables style linters", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      expect(organization.privateMetadata.isStyleLinterEnabled).toBe(true);

      const caller = createCaller(createTestTRPCContext(user, organization));

      const time = new Date("2023-01-01");
      vi.setSystemTime(time);

      await caller.mailbox.styleLinters.setEnabled({ mailboxSlug: mailbox.slug, enabled: false });
      expect(setPrivateMetadata).toHaveBeenCalledWith(organization.id, { isStyleLinterEnabled: false });
      expect((await db.query.mailboxes.findFirst({ where: eq(mailboxes.id, mailbox.id) }))?.promptUpdatedAt).toEqual(
        time,
      );

      const time2 = new Date("2023-01-02");
      vi.setSystemTime(time2);

      await caller.mailbox.styleLinters.setEnabled({ mailboxSlug: mailbox.slug, enabled: true });
      expect(setPrivateMetadata).toHaveBeenCalledWith(organization.id, { isStyleLinterEnabled: true });
      expect((await db.query.mailboxes.findFirst({ where: eq(mailboxes.id, mailbox.id) }))?.promptUpdatedAt).toEqual(
        time2,
      );
    }, 30000); // Increase timeout to 30 seconds to prevent flaky test failures
  });
});
