import { expect, test } from "@playwright/test";
import { CustomerSettingsPage } from "../utils/page-objects/customerSettingsPage";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Customer Settings", () => {
  let customerSettingsPage: CustomerSettingsPage;

  test.beforeEach(async ({ page }) => {
    customerSettingsPage = new CustomerSettingsPage(page);
    await page.goto("/settings/customers");
    await expect(page).toHaveURL("/settings/customers");
  });

  test("should enable VIP customers", async () => {
    // First disable it if enabled
    await customerSettingsPage.disableVipCustomers();
    await customerSettingsPage.expectVipCustomersDisabled();

    // Then enable it
    await customerSettingsPage.enableVipCustomers();
    await customerSettingsPage.expectVipCustomersEnabled();

    // Verify all VIP settings are visible
    await expect(
      customerSettingsPage.page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true }),
    ).toBeVisible();
    await expect(
      customerSettingsPage.page.getByRole("spinbutton", { name: "Response Time Target", exact: true }),
    ).toBeVisible();
    await expect(customerSettingsPage.page.getByText("Slack Notifications", { exact: true })).toBeVisible();
  });

  test("should disable VIP customers", async () => {
    // First enable it if disabled
    await customerSettingsPage.enableVipCustomers();
    await customerSettingsPage.expectVipCustomersEnabled();

    // Then disable it
    await customerSettingsPage.disableVipCustomers();
    await customerSettingsPage.expectVipCustomersDisabled();
  });

  test("should set VIP threshold value", async () => {
    const testThreshold = "250";

    await customerSettingsPage.setVipThreshold(testThreshold);
    await customerSettingsPage.expectVipThreshold(testThreshold);
  });

  test("should set response hours", async () => {
    const testHours = "4";

    await customerSettingsPage.setResponseHours(testHours);
    await customerSettingsPage.expectResponseHours(testHours);
  });

  test("should update threshold and response hours together", async () => {
    const testThreshold = "500.75";
    const testHours = "2";

    // Enable VIP customers first
    await customerSettingsPage.enableVipCustomers();

    // Set both values
    await customerSettingsPage.setVipThreshold(testThreshold);
    await customerSettingsPage.setResponseHours(testHours);

    // Verify both values are set
    await customerSettingsPage.expectVipThreshold(testThreshold);
    await customerSettingsPage.expectResponseHours(testHours);
    await customerSettingsPage.waitForSaved();
  });

  test("should validate numeric input for threshold", async () => {
    await customerSettingsPage.enableVipCustomers();

    const thresholdInput = customerSettingsPage.page.getByRole("spinbutton", {
      name: "Customer Value Threshold",
      exact: true,
    });
    // Verify input type and constraints
    await expect(thresholdInput).toHaveAttribute("type", "number");
    await expect(thresholdInput).toHaveAttribute("min", "0");
    await expect(thresholdInput).toHaveAttribute("step", "0.01");
  });

  test("should validate numeric input for response hours", async () => {
    await customerSettingsPage.enableVipCustomers();

    const responseHoursInput = customerSettingsPage.page.getByRole("spinbutton", {
      name: "Response Time Target",
      exact: true,
    });
    // Verify input type and constraints
    await expect(responseHoursInput).toHaveAttribute("type", "number");
    await expect(responseHoursInput).toHaveAttribute("min", "1");
    await expect(responseHoursInput).toHaveAttribute("step", "1");
  });

  test("should handle decimal values in threshold", async () => {
    const decimalThreshold = "99.99";

    await customerSettingsPage.setVipThreshold(decimalThreshold);
    await customerSettingsPage.expectVipThreshold(decimalThreshold);
    await customerSettingsPage.waitForSaved();
  });

  test("should accept input changes", async () => {
    await customerSettingsPage.enableVipCustomers();

    // Set a value and wait for any save attempts to complete
    const thresholdInput = customerSettingsPage.page.getByRole("spinbutton", {
      name: "Customer Value Threshold",
      exact: true,
    });
    await thresholdInput.click();
    await thresholdInput.fill("123.45");

    // Verify the input value is set (UI state)
    await expect(thresholdInput).toHaveValue("123.45");
  });

  test("should enable auto-close functionality", async () => {
    // First disable it if enabled
    await customerSettingsPage.disableAutoClose();
    await customerSettingsPage.expectAutoCloseDisabled();

    // Then enable it
    await customerSettingsPage.enableAutoClose();
    await customerSettingsPage.expectAutoCloseEnabled();

    // Verify auto-close settings are visible
    await expect(
      customerSettingsPage.page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).toBeVisible();
    await expect(
      customerSettingsPage.page.getByRole("button", { name: "Run auto-close now", exact: true }),
    ).toBeVisible();
  });

  test("should disable auto-close functionality", async () => {
    // First enable it if disabled
    await customerSettingsPage.enableAutoClose();
    await customerSettingsPage.expectAutoCloseEnabled();

    // Then disable it
    await customerSettingsPage.disableAutoClose();
    await customerSettingsPage.expectAutoCloseDisabled();
  });

  test("should set days of inactivity", async () => {
    const testDays = "15";

    await customerSettingsPage.setDaysOfInactivity(testDays);
    await customerSettingsPage.expectDaysOfInactivity(testDays);
  });

  test("should validate numeric input for days of inactivity", async () => {
    await customerSettingsPage.enableAutoClose();

    const daysInput = customerSettingsPage.page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
      exact: true,
    });
    // Verify input type and constraints
    await expect(daysInput).toHaveAttribute("type", "number");
    await expect(daysInput).toHaveAttribute("min", "1");
  });

  test("should handle single day input", async () => {
    const singleDay = "1";

    await customerSettingsPage.setDaysOfInactivity(singleDay);
    await customerSettingsPage.expectDaysOfInactivity(singleDay);
    await customerSettingsPage.expectDayLabel("day");
    await customerSettingsPage.waitForSaved();
  });

  test("should handle multiple days input", async () => {
    const multipleDays = "30";

    await customerSettingsPage.setDaysOfInactivity(multipleDays);
    await customerSettingsPage.expectDaysOfInactivity(multipleDays);
    await customerSettingsPage.expectDayLabel("days");
    await customerSettingsPage.waitForSaved();
  });

  test("should enable run auto-close button when auto-close is enabled", async () => {
    await customerSettingsPage.enableAutoClose();

    const runButton = customerSettingsPage.page.getByRole("button", { name: "Run auto-close now", exact: true });
    await expect(runButton).toBeEnabled();
  });

  test("should disable run auto-close button when auto-close is disabled", async () => {
    await customerSettingsPage.disableAutoClose();

    const runButton = customerSettingsPage.page.getByRole("button", { name: "Run auto-close now", exact: true });
    await expect(runButton).toBeDisabled();
  });

  test("should show correct button text when auto-close is running", async () => {
    await customerSettingsPage.enableAutoClose();

    const runButton = customerSettingsPage.page.getByRole("button", { name: "Run auto-close now", exact: true });
    await runButton.click();

    // The button should show "Running..." when the auto-close is triggered
    await expect(customerSettingsPage.page.getByRole("button", { name: "Running...", exact: true })).toBeVisible();
  });

  test("should update days of inactivity and verify saving", async () => {
    const testDays = "7";

    // Enable auto-close first
    await customerSettingsPage.enableAutoClose();

    // Set days of inactivity
    await customerSettingsPage.setDaysOfInactivity(testDays);

    // Verify the value is set
    await customerSettingsPage.expectDaysOfInactivity(testDays);
    await customerSettingsPage.waitForSaved();
  });

  test("should handle decimal values in days of inactivity", async () => {
    const decimalDays = "14.5";

    await customerSettingsPage.setDaysOfInactivity(decimalDays);
    await customerSettingsPage.expectDaysOfInactivity(decimalDays);
    await customerSettingsPage.waitForSaved();
  });

  test("should show saving indicator when updating auto-close settings", async () => {
    await customerSettingsPage.enableAutoClose();

    const daysInput = customerSettingsPage.page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
      exact: true,
    });
    await daysInput.click();
    await daysInput.fill("25");

    // Should wait for saved state
    await customerSettingsPage.waitForSaved();
  });

  test("should show saved indicator after successful update", async () => {
    await customerSettingsPage.enableAutoClose();

    const daysInput = customerSettingsPage.page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
      exact: true,
    });
    await daysInput.click();
    await daysInput.fill("10");

    // Should wait for saved state
    await customerSettingsPage.waitForSaved();
  });

  test("should hide days input when auto-close is disabled", async () => {
    await customerSettingsPage.enableAutoClose();
    await customerSettingsPage.expectDaysInputVisible();

    await customerSettingsPage.disableAutoClose();
    await customerSettingsPage.expectDaysInputHidden();
  });

  test("should show days input when auto-close is enabled", async () => {
    await customerSettingsPage.disableAutoClose();
    await customerSettingsPage.expectDaysInputHidden();

    await customerSettingsPage.enableAutoClose();
    await customerSettingsPage.expectDaysInputVisible();
  });
});
