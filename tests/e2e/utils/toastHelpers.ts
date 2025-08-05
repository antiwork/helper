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
  
  let toastFound = false;
  for (const selector of toastSelectors) {
    const toast = page.locator(selector).filter({ hasText: message });
    try {
      await expect(toast.first()).toBeVisible({ timeout: 2000 });
      toastFound = true;
      break;
    } catch {
    }
  }
  
  if (!toastFound) {
    await expect(page.getByText(message)).toBeVisible({ timeout: 8000 });
  }
}