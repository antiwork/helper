import { expect, test } from "@playwright/test";
import { SettingsPreferencesPage } from "../utils/page-objects/settingsPreferencesPage";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Settings - Preferences", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/settings/preferences", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/settings/preferences", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should display preferences page and load successfully", async ({ page }) => {
    const preferencesPage = new SettingsPreferencesPage(page);

    await expect(page).toHaveURL(/\/settings\/preferences/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be responsive on mobile devices", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/settings/preferences");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/settings\/preferences/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be responsive on tablet devices", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto("/settings/preferences");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/settings\/preferences/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should maintain URL after page refresh", async ({ page }) => {
    const currentUrl = page.url();

    await page.reload();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toBe(currentUrl);
    await expect(page).toHaveURL(/\/settings\/preferences/);
  });

  test("should load without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/settings/preferences");
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });
});
