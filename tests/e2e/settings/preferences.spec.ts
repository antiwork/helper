import { expect, test } from "@playwright/test";
import { waitForSettingsSaved } from "../utils/settingsHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Settings - Preferences", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/settings/preferences");
      await page.waitForLoadState("networkidle");
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/settings/preferences");
      await page.waitForLoadState("domcontentloaded");
    }
  });

  test("should display mailbox name setting and allow editing", async ({ page }) => {
    const mailboxNameSetting = page.locator('section:has(h2:text("Mailbox name"))');
    const mailboxNameInput = page.locator('input[placeholder="Enter mailbox name"]');

    await expect(mailboxNameSetting).toBeVisible();

    const originalName = await mailboxNameInput.inputValue();
    const testName = "Test Mailbox " + Date.now();

    await mailboxNameInput.fill(testName);

    await waitForSettingsSaved(page);

    const updatedName = await mailboxNameInput.inputValue();
    expect(updatedName).toBe(testName);

    await mailboxNameInput.fill(originalName);
  });

  test("should display confetti setting and test confetti functionality", async ({ page }) => {
    const confettiSetting = page.locator('section:has(h2:text("Confetti Settings"))');
    const confettiSwitch = page.locator('[aria-label="Confetti Settings Switch"]');
    const testConfettiButton = page.locator('button:has-text("Test Confetti")');

    await expect(confettiSetting).toBeVisible();

    const isInitiallyEnabled = await confettiSwitch.isChecked();

    if (!isInitiallyEnabled) {
      await confettiSwitch.click();
      await waitForSettingsSaved(page);
      await expect(confettiSwitch).toBeChecked();
    }

    await expect(testConfettiButton).toBeVisible();
    await testConfettiButton.click();

    if (!isInitiallyEnabled) {
      await confettiSwitch.click();
      await waitForSettingsSaved(page);
      await expect(confettiSwitch).not.toBeChecked();
      await expect(testConfettiButton).not.toBeVisible();
    }
  });
});
