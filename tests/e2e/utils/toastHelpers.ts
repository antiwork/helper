import { expect, Page } from "@playwright/test";

export async function waitForToast(page: Page, message: string) {
  const toast = page.locator("[data-sonner-toast]").filter({ hasText: message });
  await expect(toast.first()).toBeVisible({ timeout: 8000 });
}
