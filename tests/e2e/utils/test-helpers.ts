import { promises as fs } from "fs";
import { expect, Page } from "@playwright/test";

export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState("networkidle", { timeout });
}

export function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test-${timestamp}@example.com`;
}

export async function takeDebugScreenshot(page: Page, filename: string) {
  await ensureDirectoryExists("tests/e2e/debug");
  await page.screenshot({
    path: `tests/e2e/debug/${filename}`,
    fullPage: true,
  });
}

export async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export function generateRandomString(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function debugWait(page: Page, ms = 1000) {
  if (process.env.HEADED === "true" || process.env.DEBUG === "true") {
    await page.waitForTimeout(ms);
  }
}

export async function loadWidget(
  page: Page,
  config?: { token?: string; email?: string; name?: string; userId?: string },
) {
  if (config) {
    await page.evaluate((cfg) => {
      (window as any).helperWidgetConfig = { ...cfg };
    }, config);
  }

  await page.click("[data-helper-toggle]", { timeout: 15000 });
  await expect(page.locator("iframe")).toBeVisible({ timeout: 15000 });

  const widgetFrame = page.frameLocator("iframe.helper-widget-iframe");
  await expect(widgetFrame.getByRole("textbox", { name: "Ask a question" })).toBeVisible({ timeout: 15000 });

  return { widgetFrame };
}

export function throttleNetworkRequest(page: Page, url: string | RegExp | ((url: URL) => boolean)): Promise<void> {
  return page.route(url, async (route) => {
    // Add delay to slow down network call for loading state checks
    await page.waitForTimeout(500);
    await route.continue();
  });
}
