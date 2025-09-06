import { expect } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversations } from "../../../db/schema";

export async function openCommandBar(page: any) {
  await page.getByLabel("Command Bar Input").click();

  const commandBar = page.locator('[data-testid="command-bar"]');
  await expect(commandBar).toBeVisible();
  await commandBar.waitFor({ state: "visible" });
}

export async function getOpenConversation() {
  const result = await db
    .select({ id: conversations.id, slug: conversations.slug })
    .from(conversations)
    .where(eq(conversations.status, "open"))
    .limit(1);

  if (!result.length) {
    throw new Error(
      "No open conversation found in database. Please ensure there's at least one open conversation for testing.",
    );
  }

  return result[0];
}
