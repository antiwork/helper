import { expect, Page } from "@playwright/test";

export async function waitForToast(page: Page, message: string) {
  const toastSelectors = [
    '[data-sonner-toast]',
    '[data-sonner-toaster] li',
    '.toaster li',
    '[role="status"]',
    '[role="alert"]',
    '[aria-live="polite"]'
  ];
  
  let found = false;
  for (const selector of toastSelectors) {
    const toast = page.locator(selector).filter({ hasText: message });
    if (await toast.count() > 0) {
      await expect(toast.first()).toBeVisible({ timeout: 8000 });
      found = true;
      break;
    }
  }
  
  if (!found) {
    const fallbackToast = page.locator(`text=${message}`).first();
    await expect(fallbackToast).toBeVisible({ timeout: 8000 });
  }
}