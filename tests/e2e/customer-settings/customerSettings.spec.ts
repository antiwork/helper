import { expect, Page, test } from "@playwright/test";
import { getMailbox } from "../../../lib/data/mailbox";
import { waitForSettingsSaved } from "../utils/settingsHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Customer Settings", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/customers");
    await expect(page).toHaveURL("/settings/customers");
  });

  async function enableVipCustomers(page: Page) {
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    const isChecked = await vipSwitch.isChecked();

    if (!isChecked) {
      await vipSwitch.click();
      await expect(page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();
    }
  }

  async function disableVipCustomers(page: Page) {
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    const isChecked = await vipSwitch.isChecked();

    if (isChecked) {
      await vipSwitch.click();
      await expect(page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();
    }
  }

  async function enableAutoClose(page: Page) {
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    const isChecked = await autoCloseSwitch.isChecked();

    if (!isChecked) {
      await autoCloseSwitch.click();
      await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();
    }
  }

  async function disableAutoClose(page: Page) {
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    const isChecked = await autoCloseSwitch.isChecked();

    if (isChecked) {
      await autoCloseSwitch.click();
      await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();
    }
  }

  test("should enable VIP customers", async ({ page }) => {
    await disableVipCustomers(page);
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    await expect(vipSwitch).not.toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();

    await enableVipCustomers(page);
    await expect(vipSwitch).toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();

    await expect(page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Response Time Target", exact: true })).toBeVisible();
    await expect(page.getByText("Slack Notifications", { exact: true })).toBeVisible();
  });

  test("should update threshold and response hours together", async ({ page }) => {
    const testThreshold = "500";
    const testHours = "2";

    await enableVipCustomers(page);

    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await thresholdInput.click();
    await thresholdInput.fill(testThreshold);

    const responseHoursInput = page.getByRole("spinbutton", { name: "Response Time Target", exact: true });
    await responseHoursInput.click();
    await responseHoursInput.fill(testHours);

    await enableVipCustomers(page);

    await expect(thresholdInput).toHaveValue(testThreshold);
    await expect(responseHoursInput).toHaveValue(testHours);
    await waitForSettingsSaved(page);

    await page.reload();
    await expect(page).toHaveURL("/settings/customers");

    const mailbox = await getMailbox();
    expect(mailbox?.vipThreshold).toBe(parseInt(testThreshold));
    expect(mailbox?.vipExpectedResponseHours).toBe(parseInt(testHours));
  });

  test("should handle values in threshold", async ({ page }) => {
    const threshold = "99";

    await enableVipCustomers(page);

    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await thresholdInput.click();
    await thresholdInput.fill(threshold);

    await expect(thresholdInput).toHaveValue(threshold);
    await waitForSettingsSaved(page);

    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(thresholdInput).toHaveValue(threshold);

    const mailbox = await getMailbox();
    expect(mailbox?.vipThreshold).toBe(parseInt(threshold));
  });

  test("should enable auto-close functionality", async ({ page }) => {
    await disableAutoClose(page);
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    await expect(autoCloseSwitch).not.toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();

    await enableAutoClose(page);
    await expect(autoCloseSwitch).toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();

    await expect(
      page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Run auto-close now", exact: true })).toBeVisible();
  });

  test("should set days of inactivity", async ({ page }) => {
    const testDays = "15";

    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(testDays);

    await expect(daysInput).toHaveValue(testDays);
    await waitForSettingsSaved(page);

    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue(testDays);

    const mailbox = await getMailbox();
    expect(mailbox?.autoCloseDaysOfInactivity).toBe(parseInt(testDays));
  });

  test("should handle single day input", async ({ page }) => {
    const singleDay = "1";

    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(singleDay);

    await expect(daysInput).toHaveValue(singleDay);
    await enableAutoClose(page);

    const dayLabel = page.getByText("day", { exact: true });
    await expect(dayLabel).toBeVisible();
    await waitForSettingsSaved(page);

    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue(singleDay);

    const mailbox = await getMailbox();
    expect(mailbox?.autoCloseDaysOfInactivity).toBe(parseInt(singleDay));
  });

  test("should enable run auto-close button when auto-close is enabled", async ({ page }) => {
    await enableAutoClose(page);

    const runButton = page.getByRole("button", { name: "Run auto-close now", exact: true });
    await expect(runButton).toBeEnabled();
  });

  test("should disable run auto-close button when auto-close is disabled", async ({ page }) => {
    await disableAutoClose(page);

    const runButton = page.getByRole("button", { name: "Run auto-close now", exact: true });
    await expect(runButton).toBeDisabled();
  });

  test("should show correct button text when auto-close is running", async ({ page }) => {
    await enableAutoClose(page);

    const runButton = page.getByRole("button", { name: "Run auto-close now", exact: true });
    await runButton.click();

    await expect(page.getByRole("button", { name: "Running...", exact: true })).toBeVisible();
  });

  test("should handle values in days of inactivity", async ({ page }) => {
    const days = "14";

    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(days);

    await expect(daysInput).toHaveValue(days);
    await waitForSettingsSaved(page);

    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue(days);

    const mailbox = await getMailbox();
    expect(mailbox?.autoCloseDaysOfInactivity).toBe(parseInt(days));
  });

  test("should show saving indicator when updating auto-close settings", async ({ page }) => {
    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
      exact: true,
    });
    await daysInput.click();
    await daysInput.fill("25");

    await waitForSettingsSaved(page);

    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue("25");

    const mailbox = await getMailbox();
    expect(mailbox?.autoCloseDaysOfInactivity).toBe(25);
  });

  test("should show saved indicator after successful update", async ({ page }) => {
    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
      exact: true,
    });
    await daysInput.click();
    await daysInput.fill("10");

    await waitForSettingsSaved(page);

    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue("10");

    const mailbox = await getMailbox();
    expect(mailbox?.autoCloseDaysOfInactivity).toBe(10);
  });

  test("should hide days input when auto-close is disabled", async ({ page }) => {
    await enableAutoClose(page);
    await expect(
      page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).toBeVisible();

    await disableAutoClose(page);
    await expect(
      page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).not.toBeVisible();
  });
});
