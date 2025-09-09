import { expect, Page } from "@playwright/test";

export async function waitForSettingsSaved(page: Page) {
  const saving = page.getByText("Saving");
  const saved = page.getByText("Saved", { exact: true });
  const error = page.getByText("Error", { exact: true });

  try {
    await expect(saving).toBeVisible();
    await expect(saved).toBeVisible();
  } catch (_e) {
    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }
    console.warn("No saving indicator found. This should mean there were no changes, but may be worth checking.");
  }
}
