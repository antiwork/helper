import { expect, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversations } from "../../../db/schema";

export async function waitForSettingsSaved(page: Page) {
  const saving = page.getByText("Saving");
  const saved = page.getByText("Saved", { exact: true });
  const error = page.getByText("Error", { exact: true });

  try {
    await saving.waitFor({ state: "visible", timeout: 5000 });
    await saved.waitFor({ state: "visible" });
  } catch (e) {
    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }
    console.warn("No saving indicator found. This should mean there were no changes, but may be worth checking.");
  }
}

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
