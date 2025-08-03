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
  
  for (const selector of toastSelectors) {
    const toast = page.locator(selector).filter({ hasText: message });
    try {
      await expect(toast.first()).toBeVisible({ timeout: 2000 });
      return; 
    } catch {
    }
  }
  
  await expect(page.getByText(message)).toBeVisible({ timeout: 8000 });
}