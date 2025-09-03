import { expect, test } from "@playwright/test";
import { waitForSettingsSaved } from "../utils/settingsHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Settings - User preferences", () => {
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

  test("should allow toggling on/off the next ticket preview", async ({ page }) => {
    const nextTicketPreviewSetting = page.locator('h2:text("Show Next Ticket Preview")');
    const nextTicketPreviewSwitch = page.locator('[aria-label="Show Next Ticket Preview Switch"]');

    await expect(nextTicketPreviewSetting).toBeVisible();
    await expect(nextTicketPreviewSwitch).toBeChecked();

    await nextTicketPreviewSwitch.click();
    await waitForSettingsSaved(page);
    await expect(nextTicketPreviewSwitch).not.toBeChecked();
  });
});
