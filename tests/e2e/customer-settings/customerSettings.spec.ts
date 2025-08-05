import { expect, test } from "@playwright/test";
import { CustomerSettingsPage } from "../utils/page-objects/customerSettingsPage";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Customer Settings", () => {
  let customerSettingsPage: CustomerSettingsPage;

  test.beforeEach(async ({ page }) => {
    customerSettingsPage = new CustomerSettingsPage(page);
    await customerSettingsPage.navigateToCustomerSettings();
  });

  test("should toggle VIP customers", async () => {
    await customerSettingsPage.enableVipCustomers();
    await customerSettingsPage.expectVipCustomersEnabled();

    await customerSettingsPage.disableVipCustomers();
    await customerSettingsPage.expectVipCustomersDisabled();
  });

  test("should update VIP settings and save successfully", async () => {
    await customerSettingsPage.enableVipCustomers();

    await customerSettingsPage.setVipThreshold("250.50");
    await customerSettingsPage.expectVipThreshold("250.50");
    await customerSettingsPage.waitForSaved();

    await customerSettingsPage.setResponseHours("4");
    await customerSettingsPage.expectResponseHours("4");
    await customerSettingsPage.waitForSaved();
  });

  test("should validate input constraints", async () => {
    await customerSettingsPage.enableVipCustomers();

    const thresholdInput = customerSettingsPage.page.getByRole("spinbutton", { name: "Customer Value Threshold" });
    await expect(thresholdInput).toHaveAttribute("type", "number");
    await expect(thresholdInput).toHaveAttribute("min", "0");
  });

  test("should show Slack integration alert when not connected", async () => {
    await customerSettingsPage.enableVipCustomers();

    const slackAlert = customerSettingsPage.page
      .getByRole("alert")
      .filter({ hasText: "Slack integration is required" });
    await expect(slackAlert).toBeVisible();
  });

  test("should toggle auto-close inactive tickets", async () => {
    await customerSettingsPage.enableAutoClose();
    await customerSettingsPage.expectAutoCloseEnabled();

    await customerSettingsPage.disableAutoClose();
    await customerSettingsPage.expectAutoCloseDisabled();
  });

  test("should update auto-close days and save successfully", async () => {
    await customerSettingsPage.enableAutoClose();

    await customerSettingsPage.setAutoCloseDays("7");
    await customerSettingsPage.expectAutoCloseDays("7");
    await customerSettingsPage.waitForSaved();

    await customerSettingsPage.setAutoCloseDays("14");
    await customerSettingsPage.expectAutoCloseDays("14");
    await customerSettingsPage.waitForSaved();
  });

  test("should disable run button when auto-close is disabled", async () => {
    await customerSettingsPage.disableAutoClose();
    await customerSettingsPage.expectRunAutoCloseButtonDisabled();
  });

  test("should validate auto-close days input", async () => {
    await customerSettingsPage.enableAutoClose();

    const daysInput = customerSettingsPage.page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
    });
    await expect(daysInput).toHaveAttribute("type", "number");
    await expect(daysInput).toHaveAttribute("min", "1");
  });

  test("should run auto-close and show success toast", async () => {
    await customerSettingsPage.enableAutoClose();

    await customerSettingsPage.clickRunAutoCloseNow();

    const toast = customerSettingsPage.page.locator("[data-sonner-toast]").filter({ hasText: "Auto-close triggered" });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
