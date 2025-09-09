import { expect, test } from "@playwright/test";
import { waitForSettingsSaved } from "../utils/settingsHelpers";
import { throttleNetworkRequest } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Settings - Mailbox", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/settings/mailbox");
      await page.waitForLoadState("networkidle");
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/settings/mailbox");
      await page.waitForLoadState("domcontentloaded");
    }
  });

  test("should display mailbox name setting and allow editing", async ({ page }) => {
    await throttleNetworkRequest(page, "/api/chat");

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
});
