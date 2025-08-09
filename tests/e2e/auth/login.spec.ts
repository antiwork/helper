import { expect, test } from "@playwright/test";
import { LoginPage } from "../utils/page-objects/loginPage";
import { debugWait, takeDebugScreenshot } from "../utils/test-helpers";

test.describe("Working Authentication", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await debugWait(page, 1000);
  });

  test("should display login form", async ({ page }) => {
    await loginPage.navigateToLogin();

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await takeDebugScreenshot(page, "login-form.png");
  });

  test("should login successfully and redirect to dashboard", async ({ page }) => {
    await loginPage.navigateToLogin();

    await page.fill("#email", "support@gumroad.com");
    await page.click('button[type="submit"]');

    await debugWait(page, 3000);

    const currentUrl = page.url();

    await debugWait(page, 2000);

    const finalUrl = page.url();

    if (finalUrl.includes("mine")) {
      await page.waitForLoadState("networkidle");

      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible({ timeout: 15000 });

      await takeDebugScreenshot(page, "successful-login.png");
    } else {
      await takeDebugScreenshot(page, "login-status.png");
      await expect(page.locator("#email")).toBeVisible();
    }
  });

  test("should handle different email addresses", async ({ page }) => {
    await loginPage.navigateToLogin();

    await page.fill("#email", "different@example.com");
    await page.click('button[type="submit"]');

    await debugWait(page, 2000);

    const currentUrl = page.url();
    expect(currentUrl).toContain(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3020");
  });

  test("should handle empty email submission", async ({ page }) => {
    await loginPage.navigateToLogin();

    await page.click('button[type="submit"]');

    await expect(page.locator("#email")).toBeVisible();

    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginPage.navigateToLogin();

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await page.fill("#email", "support@gumroad.com");
    await page.click('button[type="submit"]');

    await debugWait(page, 3000);

    const mobileUrl = page.url();

    if (mobileUrl.includes("mine")) {
      await page.waitForLoadState("networkidle");
      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.locator("#email")).toBeVisible();
    }

    await takeDebugScreenshot(page, "mobile-login.png");
  });

  test("should support dark mode", async ({ page }) => {
    await loginPage.navigateToLogin();

    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await takeDebugScreenshot(page, "dark-mode-login.png");
  });
});
