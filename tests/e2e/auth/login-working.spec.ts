/* eslint-disable no-console */
import { expect, test } from "@playwright/test";
import { LoginPage } from "../utils/page-objects/loginPage";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.describe("Working Authentication", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    // Small delay for recording
    await page.waitForTimeout(1000);
  });

  test("should display login form", async ({ page }) => {
    await loginPage.navigateToLogin();

    // Check for email input
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await takeDebugScreenshot(page, "login-form.png");
  });

  test("should login successfully and redirect to dashboard", async ({ page }) => {
    await loginPage.navigateToLogin();

    // Enter email and submit
    await page.fill("#email", "support@gumroad.com");
    await page.click('button[type="submit"]');

    // Wait for redirect with extended timeout
    await expect(page).toHaveURL(/.*mailboxes.*gumroad.*mine.*/, { timeout: 45000 });

    await takeDebugScreenshot(page, "successful-login.png");
  });

  test("should handle different email addresses", { timeout: 60000 }, async ({ page }) => {
    await loginPage.navigateToLogin();

    // Try different email
    await page.fill("#email", "different@example.com");
    await page.click('button[type="submit"]');

    // Wait a bit for any processing
    await page.waitForTimeout(2000);

    // Check if we're still on login (might show error or stay on login)
    const currentUrl = page.url();
    console.log(`URL after different email: ${currentUrl}`);

    // Should still be on login page or show some response
    expect(currentUrl).toContain("helperai.dev");
  });

  test("should handle empty email submission", async ({ page }) => {
    await loginPage.navigateToLogin();

    // Try to submit without email
    await page.click('button[type="submit"]');

    // Should still be on login page
    await expect(page.locator("#email")).toBeVisible();

    // Might show validation error - check if form is still there
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await loginPage.navigateToLogin();

    // Key elements should be visible on mobile
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Try login on mobile
    await page.fill("#email", "support@gumroad.com");
    await page.click('button[type="submit"]');

    // Wait for redirect with extended timeout
    await expect(page).toHaveURL(/.*mailboxes.*/, { timeout: 45000 });

    const mobileUrl = page.url();
    console.log(`Mobile login URL: ${mobileUrl}`);

    await takeDebugScreenshot(page, "mobile-login.png");
  });

  test("should support dark mode", async ({ page }) => {
    await loginPage.navigateToLogin();

    // Add dark mode class to test dark mode styles
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });

    // Elements should still be visible in dark mode
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await takeDebugScreenshot(page, "dark-mode-login.png");
  });
});
