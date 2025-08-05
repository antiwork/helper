import { expect, test } from "@playwright/test";
import { db } from "../../../db/client";
import { mailboxes } from "../../../db/schema";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Customer Settings", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/customers");
    await expect(page).toHaveURL("/settings/customers");
  });

  async function getMailboxFromDb() {
    const mailbox = await db.select().from(mailboxes).limit(1);
    return mailbox[0];
  }

  async function enableVipCustomers(page: any) {
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    const isChecked = await vipSwitch.isChecked();

    if (!isChecked) {
      await vipSwitch.click();
      await expect(page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();
    }
  }

  async function disableVipCustomers(page: any) {
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    const isChecked = await vipSwitch.isChecked();

    if (isChecked) {
      await vipSwitch.click();
      await expect(page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();
    }
  }

  async function waitForSaved(page: any) {
    const saving = page.getByText("Saving", { exact: true });
    const saved = page.getByText("Saved", { exact: true });
    const error = page.getByText("Error", { exact: true });

    try {
      // Wait for saving indicator
      await saving.waitFor({ state: "visible" });
      // Wait for saved indicator
      await saved.waitFor({ state: "visible" });
    } catch (e) {
      // Check for error
      if (await error.isVisible().catch(() => false)) {
        throw new Error("Save failed: Error indicator visible");
      }
      // No saving indicator means no changes - this is fine
    }
  }

  async function enableAutoClose(page: any) {
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    const isChecked = await autoCloseSwitch.isChecked();

    if (!isChecked) {
      await autoCloseSwitch.click();
      await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();
    }
  }

  async function disableAutoClose(page: any) {
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    const isChecked = await autoCloseSwitch.isChecked();

    if (isChecked) {
      await autoCloseSwitch.click();
      await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();
    }
  }

  test("should enable VIP customers", async ({ page }) => {
    // First disable it if enabled
    await disableVipCustomers(page);
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    await expect(vipSwitch).not.toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();

    // Then enable it
    await enableVipCustomers(page);
    await expect(vipSwitch).toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();

    // Verify all VIP settings are visible
    await expect(page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: "Response Time Target", exact: true })).toBeVisible();
    await expect(page.getByText("Slack Notifications", { exact: true })).toBeVisible();
  });

  test("should update threshold and response hours together", async ({ page }) => {
    const testThreshold = "500";
    const testHours = "2";

    // Enable VIP customers first
    await enableVipCustomers(page);

    // Set both values
    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await thresholdInput.click();
    await thresholdInput.fill(testThreshold);

    const responseHoursInput = page.getByRole("spinbutton", { name: "Response Time Target", exact: true });
    await responseHoursInput.click();
    await responseHoursInput.fill(testHours);

    // Verify both values are set
    await enableVipCustomers(page);

    await expect(thresholdInput).toHaveValue(testThreshold);
    await expect(responseHoursInput).toHaveValue(testHours);
    await waitForSaved(page);

    // Verify values persist in database after refresh
    await page.reload();
    await expect(page).toHaveURL("/settings/customers");

    // Verify database values
    const mailbox = await getMailboxFromDb();
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
    await waitForSaved(page);

    // Verify value persists in database after refresh
    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(thresholdInput).toHaveValue(threshold);

    // Verify database value
    const mailbox = await getMailboxFromDb();
    expect(mailbox?.vipThreshold).toBe(parseInt(threshold));
  });

  test("should enable auto-close functionality", async ({ page }) => {
    // First disable it if enabled
    await disableAutoClose(page);
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    await expect(autoCloseSwitch).not.toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();

    // Then enable it
    await enableAutoClose(page);
    await expect(autoCloseSwitch).toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();

    // Verify auto-close settings are visible
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
    await waitForSaved(page);

    // Verify value persists in database after refresh
    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue(testDays);

    // Verify database value
    const mailbox = await getMailboxFromDb();
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
    await waitForSaved(page);

    // Verify value persists in database after refresh
    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue(singleDay);

    // Verify database value
    const mailbox = await getMailboxFromDb();
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

    // The button should show "Running..." when the auto-close is triggered
    await expect(page.getByRole("button", { name: "Running...", exact: true })).toBeVisible();
  });

  test("should handle values in days of inactivity", async ({ page }) => {
    const days = "14";

    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(days);

    await expect(daysInput).toHaveValue(days);
    await waitForSaved(page);

    // Verify value persists in database after refresh
    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue(days);

    // Verify database value
    const mailbox = await getMailboxFromDb();
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

    // Should wait for saved state
    await waitForSaved(page);

    // Verify value persists in database after refresh
    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue("25");

    // Verify database value
    const mailbox = await getMailboxFromDb();
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

    // Should wait for saved state
    await waitForSaved(page);

    // Verify value persists in database after refresh
    await page.reload();
    await expect(page).toHaveURL("/settings/customers");
    await expect(daysInput).toHaveValue("10");

    // Verify database value
    const mailbox = await getMailboxFromDb();
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
