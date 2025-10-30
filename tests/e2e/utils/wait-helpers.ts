import { expect, Page } from "@playwright/test";

export async function waitForEditorReady(page: Page, timeout = 5000) {
  const editor = page.locator('[role="textbox"][contenteditable="true"]');
  await expect(editor).toBeVisible({ timeout });
  await expect(editor).toBeEnabled({ timeout });
}

export async function waitForPageTitle(page: Page, titleText: string, timeout = 10000) {
  await expect(page.locator(`h1:has-text("${titleText}")`)).toBeVisible({ timeout });
}

export async function waitForSaveComplete(page: Page, timeout = 10000) {
  // Wait for any active "Save" buttons to be enabled/disabled transitions to finish
  const saveButton = page.locator('button:has-text("Save")');
  try {
    await expect(saveButton).toBeDisabled({ timeout: 2000 });
    await expect(saveButton).toBeEnabled({ timeout });
  } catch {
    // If save button isn't found or transitions aren't present, silently continue
  }
}
