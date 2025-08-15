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

    const isInitiallyEnabled = (await confettiSwitch.getAttribute("aria-checked")) === "true";

    if (!isInitiallyEnabled) {
      await confettiSwitch.click();
      await waitForSettingsSaved(page);
      await expect(confettiSwitch).toHaveAttribute("aria-checked", "true");
    }

    await expect(testConfettiButton).toBeVisible();
    await testConfettiButton.click();

    if (!isInitiallyEnabled) {
      await confettiSwitch.click();
      await waitForSettingsSaved(page);
      await expect(confettiSwitch).toHaveAttribute("aria-checked", "false");
      await expect(testConfettiButton).not.toBeVisible();
    }
  });

  test("should toggle Next Ticket Preview setting", async ({ page }) => {
    const nextTicketPreviewSetting = page.locator('section:has(h2:has-text("Show Next Ticket Preview"))');
    const nextTicketPreviewSwitch = page
      .locator('button[role="switch"][aria-label="Show Next Ticket Preview Switch"]')
      .first();

    await expect(nextTicketPreviewSetting).toBeVisible();

    // Store initial state
    const isInitiallyEnabled = (await nextTicketPreviewSwitch.getAttribute("aria-checked")) === "true";

    // Toggle the setting off
    if (isInitiallyEnabled) {
      await nextTicketPreviewSwitch.click();
      await waitForSettingsSaved(page);
      await expect(nextTicketPreviewSwitch).toHaveAttribute("aria-checked", "false");
    }

    // Navigate to a conversation to verify the preview is hidden
    await page.goto("/mine");
    await page.waitForLoadState("networkidle");

    // Click on the first conversation
    const firstConversation = page.locator('a[href*="/conversation/"]').first();
    if (await firstConversation.isVisible()) {
      await firstConversation.click();
      await page.waitForLoadState("networkidle");

      // Verify Next Ticket Preview is not visible
      const nextTicketPreview = page.locator('text="Next Ticket:"');
      await expect(nextTicketPreview).not.toBeVisible();
    }

    // Go back to settings and toggle it on
    await page.goto("/settings/preferences");
    await nextTicketPreviewSwitch.click();
    await waitForSettingsSaved(page);
    await expect(nextTicketPreviewSwitch).toHaveAttribute("aria-checked", "true");

    // Navigate back to conversation to verify the preview is shown
    await page.goto("/mine");
    await page.waitForLoadState("networkidle");

    const conversationAgain = page.locator('a[href*="/conversation/"]').first();
    if (await conversationAgain.isVisible()) {
      await conversationAgain.click();
      await page.waitForLoadState("networkidle");

      // Verify Next Ticket Preview is visible (if there are multiple conversations)
      const nextTicketPreviewVisible = page.locator('text="Next Ticket:"');
      // Note: Preview only shows if there are multiple conversations
      // So we check for either visibility or verify the setting is respected
      const conversationCount = await page.locator('a[href*="/conversation/"]').count();
      if (conversationCount > 1) {
        await expect(nextTicketPreviewVisible).toBeVisible();
      }
    }

    // Restore original state
    const currentState = (await nextTicketPreviewSwitch.getAttribute("aria-checked")) === "true";
    if (isInitiallyEnabled !== currentState) {
      await page.goto("/settings/preferences");
      await nextTicketPreviewSwitch.click();
      await waitForSettingsSaved(page);
    }
  });
});
