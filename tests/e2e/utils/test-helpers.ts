import { promises as fs } from "fs";
import { expect, Page } from "@playwright/test";

export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState("networkidle", { timeout });
}

export function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test-${timestamp}@example.com`;
}

export function generateCustomerData() {
  const timestamp = Date.now();
  return {
    name: `Test Customer ${timestamp}`,
    email: `customer-${timestamp}@example.com`,
    value: Math.floor(Math.random() * 10000) + 1000,
  };
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

export async function waitForElementWithTimeout(page: Page, selector: string, timeout = 10000) {
  await page.waitForSelector(selector, { timeout, state: "visible" });
}

export function generateRandomString(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomNumber(min = 1, max = 1000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function simulateSlowNetwork(page: Page) {
  try {
    const client = await page.context().newCDPSession(page);
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: (500 * 1024) / 8,
      uploadThroughput: (500 * 1024) / 8,
      latency: 100,
    });
  } catch (error) {
    // Fallback for non-Chromium browsers: use route delays
    await page.route("**/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.continue();
    });
  }
}

export async function resetNetworkConditions(page: Page) {
  try {
    const client = await page.context().newCDPSession(page);
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  } catch (error) {
    await page.unroute("**/*");
  }
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
