import { userFactory } from "@tests/support/factories/users";
import { describe, expect, it } from "vitest";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";

describe("randomSlugField", () => {
  it("auto-sets the specified column with a random slug", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const conversation = await db
      .insert(conversations)
      .values({
        mailboxId: mailbox.id,
      })
      .returning()
      .then(takeUniqueOrThrow);

    expect(typeof conversation.slug).toBe("string");
    expect(conversation.slug.length).toEqual(32);
  });
});
