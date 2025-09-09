import { expect, Page, test } from "@playwright/test";
import { getMailbox } from "../../../lib/data/mailbox";
import { waitForSettingsSaved } from "../utils/settingsHelpers";
import { throttleNetworkRequest } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Customer Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/customers");
    await expect(page).toHaveURL("/settings/customers");
    await throttleNetworkRequest(page, "/api/trpc/lambda/mailbox.update");
  });

  async function toggleSwitch(page: Page, name: string, enable: boolean) {
    const switchEl = page.getByRole("switch", { name, exact: true });
    const isChecked = await switchEl.isChecked();
    if (isChecked !== enable) await switchEl.click();
    return switchEl;
  }

  test("VIP customers UI states and all functionality", async ({ page }) => {
    // Test disabled state first
    const vipSwitch = await toggleSwitch(page, "VIP Customers Switch", false);
    await expect(vipSwitch).not.toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();

    // Test all UI elements + functionality together
    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    const responseHoursInput = page.getByRole("spinbutton", { name: "Response Time Target", exact: true });
    await toggleSwitch(page, "VIP Customers Switch", true);
    await expect(vipSwitch).toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();
    await expect(thresholdInput).toBeVisible();
    await expect(responseHoursInput).toBeVisible();
    await expect(page.getByText("Slack Notifications", { exact: true })).toBeVisible();

    await thresholdInput.fill("500");
    await responseHoursInput.fill("2");

    await waitForSettingsSaved(page);

    // Verify persistence & database
    await page.reload();
    await expect(thresholdInput).toHaveValue("500");
    await expect(responseHoursInput).toHaveValue("2");

    const mailbox = await getMailbox();
    expect(mailbox?.vipThreshold).toBe(500);
    expect(mailbox?.vipExpectedResponseHours).toBe(2);
  });

  test("Auto-Close UI states and all functionality", async ({ page }) => {
    const autoCloseSwitch = await toggleSwitch(page, "Enable auto-close", false);
    await expect(autoCloseSwitch).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Run auto-close now", exact: true })).toBeDisabled();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();

    // Test all UI elements + functionality together
    await toggleSwitch(page, "Enable auto-close", true);
    await expect(autoCloseSwitch).toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    const runButton = page.getByRole("button", { name: "Run auto-close now", exact: true });

    await expect(daysInput).toBeVisible();
    await expect(runButton).toBeVisible();
    await expect(runButton).toBeEnabled();

    // Test single day label
    await daysInput.fill("1");
    await expect(page.getByText("day", { exact: true })).toBeVisible();

    // Test multiple days
    await daysInput.fill("14");
    await expect(page.getByText("days", { exact: true })).toBeVisible();

    await waitForSettingsSaved(page);

    // Verify persistence in UI & database
    await page.reload();
    await expect(daysInput).toHaveValue("14");
    expect((await getMailbox())?.autoCloseDaysOfInactivity).toBe(14);

    await runButton.click();
    await page.waitForResponse(
      (response) => response.url().includes("/api/trpc/lambda/mailbox.autoClose") && response.status() === 200,
    );
  });
});
