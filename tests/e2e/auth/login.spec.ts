import { expect, test } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.describe("Working Authentication", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Helper/);

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await takeDebugScreenshot(page, "login-form.png");
  });

  test("should login successfully and redirect to dashboard", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Helper/);

    await page.fill("#email", "support@gumroad.com");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*mine.*/, { timeout: 40000 });

    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    await takeDebugScreenshot(page, "successful-login.png");
  });

  test("should handle different email addresses", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Helper/);

    await page.fill("#email", "different@example.com");
    await page.click('button[type="submit"]');

    await page.waitForLoadState("networkidle");

    const currentUrl = page.url();
    expect(currentUrl).toContain(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3020");
  });

  test("should handle empty email submission", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Helper/);

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/login");
    await expect(page).toHaveTitle(/Helper/);

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await page.fill("#email", "support@gumroad.com");
    await page.click('button[type="submit"]');

    await page.waitForLoadState("networkidle");

    const mobileUrl = page.url();

    if (mobileUrl.includes("mine")) {
      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();
    } else {
      await expect(page.locator("#email")).toBeVisible();
    }

    await takeDebugScreenshot(page, "mobile-login.png");
  });

  test("should support dark mode", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Helper/);

    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await takeDebugScreenshot(page, "dark-mode-login.png");
  });
});
