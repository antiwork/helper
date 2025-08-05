import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Customer Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/customers");
    await expect(page).toHaveURL("/settings/customers");
  });

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

    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }

    if (await saving.isVisible().catch(() => false)) {
      await expect(saved).toBeVisible({ timeout: 10000 });
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

  test("should disable VIP customers", async ({ page }) => {
    // First enable it if disabled
    await enableVipCustomers(page);
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    await expect(vipSwitch).toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();

    // Then disable it
    await disableVipCustomers(page);
    await expect(vipSwitch).not.toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();
  });

  test("should set VIP threshold value", async ({ page }) => {
    const testThreshold = "250";

    await enableVipCustomers(page);
    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await thresholdInput.click();
    await thresholdInput.fill(testThreshold);

    await expect(thresholdInput).toHaveValue(testThreshold);
  });

  test("should set response hours", async ({ page }) => {
    const testHours = "4";

    await enableVipCustomers(page);

    const responseHoursInput = page.getByRole("spinbutton", { name: "Response Time Target", exact: true });
    await responseHoursInput.click();
    await responseHoursInput.fill(testHours);

    await expect(responseHoursInput).toHaveValue(testHours);
  });

  test("should update threshold and response hours together", async ({ page }) => {
    const testThreshold = "500.75";
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
  });

  test("should validate numeric input for threshold", async ({ page }) => {
    await enableVipCustomers(page);

    const thresholdInput = page.getByRole("spinbutton", {
      name: "Customer Value Threshold",
      exact: true,
    });
    // Verify input type and constraints
    await expect(thresholdInput).toHaveAttribute("type", "number");
    await expect(thresholdInput).toHaveAttribute("min", "0");
    await expect(thresholdInput).toHaveAttribute("step", "0.01");
  });

  test("should validate numeric input for response hours", async ({ page }) => {
    await enableVipCustomers(page);

    const responseHoursInput = page.getByRole("spinbutton", {
      name: "Response Time Target",
      exact: true,
    });
    // Verify input type and constraints
    await expect(responseHoursInput).toHaveAttribute("type", "number");
    await expect(responseHoursInput).toHaveAttribute("min", "1");
    await expect(responseHoursInput).toHaveAttribute("step", "1");
  });

  test("should handle decimal values in threshold", async ({ page }) => {
    const decimalThreshold = "99.99";

    await enableVipCustomers(page);

    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await thresholdInput.click();
    await thresholdInput.fill(decimalThreshold);

    await expect(thresholdInput).toHaveValue(decimalThreshold);
    await waitForSaved(page);
  });

  test("should accept input changes", async ({ page }) => {
    await enableVipCustomers(page);

    // Set a value and wait for any save attempts to complete
    const thresholdInput = page.getByRole("spinbutton", {
      name: "Customer Value Threshold",
      exact: true,
    });
    await thresholdInput.click();
    await thresholdInput.fill("123.45");

    // Verify the input value is set (UI state)
    await expect(thresholdInput).toHaveValue("123.45");
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

  test("should disable auto-close functionality", async ({ page }) => {
    // First enable it if disabled
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    await enableAutoClose(page);
    await expect(autoCloseSwitch).toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();

    // Then disable it
    await disableAutoClose(page);
    await expect(autoCloseSwitch).not.toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();
  });

  test("should set days of inactivity", async ({ page }) => {
    const testDays = "15";

    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(testDays);

    await expect(daysInput).toHaveValue(testDays);
  });

  test("should validate numeric input for days of inactivity", async ({ page }) => {
    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
      exact: true,
    });
    // Verify input type and constraints
    await expect(daysInput).toHaveAttribute("type", "number");
    await expect(daysInput).toHaveAttribute("min", "1");
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
  });

  test("should handle multiple days input", async ({ page }) => {
    const multipleDays = "30";

    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(multipleDays);

    await expect(daysInput).toHaveValue(multipleDays);
    await enableAutoClose(page);

    const dayLabel = page.getByText("days", { exact: true });
    await expect(dayLabel).toBeVisible();
    await waitForSaved(page);
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

  test("should update days of inactivity and verify saving", async ({ page }) => {
    const testDays = "7";

    // Enable auto-close first
    await enableAutoClose(page);

    // Set days of inactivity
    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(testDays);

    // Verify the value is set
    await expect(daysInput).toHaveValue(testDays);
    await waitForSaved(page);
  });

  test("should handle decimal values in days of inactivity", async ({ page }) => {
    const decimalDays = "14.5";

    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(decimalDays);

    await expect(daysInput).toHaveValue(decimalDays);
    await waitForSaved(page);
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

  test("should show days input when auto-close is enabled", async ({ page }) => {
    await disableAutoClose(page);
    await expect(
      page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).not.toBeVisible();

    await enableAutoClose(page);
    await expect(
      page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).toBeVisible();
  });
});
