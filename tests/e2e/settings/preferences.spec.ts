import { expect, test } from "@playwright/test";

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
    const mailboxNameSetting = page.locator('section:has(h2:text("Mailbox name"))');
    const mailboxNameInput = page.locator('input[placeholder="Enter mailbox name"]');

    await expect(mailboxNameSetting).toBeVisible();

    const originalName = await mailboxNameInput.inputValue();
    const testName = "Test Mailbox " + Date.now();

    await mailboxNameInput.fill(testName);

    await page.waitForFunction(
      () => {
        const savingIndicator = document.querySelector('[data-testid="saving-indicator"]');
        return !savingIndicator || !savingIndicator.textContent?.includes("Saving");
      },
      { timeout: 10000 },
    );

    const updatedName = await mailboxNameInput.inputValue();
    expect(updatedName).toBe(testName);

    await mailboxNameInput.fill(originalName);
  });

  test("should display confetti setting and test confetti functionality", async ({ page }) => {
    const confettiSetting = page.locator('section:has(h2:text("Confetti"))');
    const testConfettiButton = page.locator('button:has-text("Test Confetti")');

    await expect(confettiSetting).toBeVisible();

    const isVisible = await testConfettiButton.isVisible();

    if (isVisible) {
      await testConfettiButton.click();
    }
  });
});
