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

  test("should display mailbox name setting and allow editing", async ({ page }) => {
    const preferencesPage = new SettingsPreferencesPage(page);

    await preferencesPage.expectMailboxNameSetting();

    const originalName = await preferencesPage.getMailboxNameValue();
    const testName = "Test Mailbox " + Date.now();

    await preferencesPage.fillMailboxName(testName);
    await preferencesPage.waitForSavingComplete();

    const updatedName = await preferencesPage.getMailboxNameValue();
    expect(updatedName).toBe(testName);

    await preferencesPage.fillMailboxName(originalName);
  });

  test("should display confetti setting and test confetti functionality", async ({ page }) => {
    const preferencesPage = new SettingsPreferencesPage(page);

    await preferencesPage.expectConfettiSetting();

    const testButton = page.locator('button:has-text("Test Confetti")');
    const isVisible = await testButton.isVisible();

    if (isVisible) {
      await preferencesPage.clickTestConfettiButton();
    }
  });
});
