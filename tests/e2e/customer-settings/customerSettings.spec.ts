import { expect, test } from "@playwright/test";
import { CustomerSettingsPage } from "../utils/page-objects/customerSettingsPage";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Customer Settings", () => {
  let customerSettingsPage: CustomerSettingsPage;

  test.beforeEach(async ({ page }) => {
    customerSettingsPage = new CustomerSettingsPage(page);
    await customerSettingsPage.navigateToCustomerSettings();
  });

  test("should enable VIP customers", async () => {
    // First disable it if enabled
    await customerSettingsPage.disableVipCustomers();
    await customerSettingsPage.expectVipCustomersDisabled();

    // Then enable it
    await customerSettingsPage.enableVipCustomers();
    await customerSettingsPage.expectVipCustomersEnabled();

    // Verify all VIP settings are visible
    await expect(customerSettingsPage.page.getByTestId("vip-threshold-input")).toBeVisible();
    await expect(customerSettingsPage.page.getByTestId("response-hours-input")).toBeVisible();
    await expect(customerSettingsPage.page.getByTestId("slack-notifications-section")).toBeVisible();
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

    const thresholdInput = customerSettingsPage.page.getByTestId("vip-threshold-input");

    // Verify input type and constraints
    await expect(thresholdInput).toHaveAttribute("type", "number");
    await expect(thresholdInput).toHaveAttribute("min", "0");
    await expect(thresholdInput).toHaveAttribute("step", "0.01");
  });

  test("should validate numeric input for response hours", async () => {
    await customerSettingsPage.enableVipCustomers();

    const responseHoursInput = customerSettingsPage.page.getByTestId("response-hours-input");

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
    const thresholdInput = customerSettingsPage.page.getByTestId("vip-threshold-input");
    await thresholdInput.click();
    await thresholdInput.fill("123.45");

    // Wait for any save operations to complete (but don't require success)
    await customerSettingsPage.waitForSaveComplete();

    // Verify the input value is set (UI state)
    await expect(thresholdInput).toHaveValue("123.45");
  });
});
