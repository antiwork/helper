import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";

beforeEach(() => {
  vi.useRealTimers();
});

describe("withTimestamps", () => {
  it("sets createdAt/updatedAt on create/update", async () => {
    const time = new Date("2023-01-01");
    vi.setSystemTime(time);

    const mailbox = await db
      .insert(mailboxes)
      .values({
        name: "Test Mailbox",
        slug: "test-mailbox",
        promptUpdatedAt: time,
        widgetHMACSecret: "secret",
      })
      .returning()
      .then(takeUniqueOrThrow);

    expect(mailbox.createdAt).toEqual(time);
    expect(mailbox.updatedAt).toEqual(time);

    const time2 = new Date("2023-01-02");
    vi.setSystemTime(time2);

    await db.update(mailboxes).set({ name: "New name" }).where(eq(mailboxes.id, mailbox.id));
    const newMailbox = await db.query.mailboxes.findFirst({ where: eq(mailboxes.id, mailbox.id) });
    expect(newMailbox?.createdAt).toEqual(time);
    expect(newMailbox?.updatedAt).toEqual(time2);
  });
});
