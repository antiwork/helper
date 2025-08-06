import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function navigateToCustomerSettings(page: Page) {
  await page.goto("/settings/customers");
  await page.waitForLoadState("networkidle");
}

async function enableVipCustomers(page: Page) {
  const vipSwitch = page.getByRole("switch", { name: "VIP Customers" });
  const isChecked = await vipSwitch.isChecked();

  if (!isChecked) {
    await vipSwitch.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Customer Value Threshold")).toBeVisible();
  }
}

async function disableVipCustomers(page: Page) {
  const vipSwitch = page.getByRole("switch", { name: "VIP Customers" });
  const isChecked = await vipSwitch.isChecked();

  if (isChecked) {
    await vipSwitch.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Customer Value Threshold")).not.toBeVisible();
  }
}

async function waitForSaveComplete(page: Page) {
  await page.waitForLoadState("networkidle");
}

async function waitForSaved(page: Page) {
  await waitForSaveComplete(page);

  const savingIndicator = page.getByText(/(Saving|Saved|Error saving)/);
  const isVisible = await savingIndicator.isVisible().catch(() => false);

  if (isVisible) {
    const indicatorText = await savingIndicator.textContent();

    if (indicatorText?.includes("Error")) {
      throw new Error(`Save failed: ${indicatorText}`);
    }

    if (indicatorText?.includes("Saving")) {
      await expect(savingIndicator).toContainText("Saved", { timeout: 10000 });
    }
  }
}

async function setVipThreshold(page: Page, threshold: string) {
  await enableVipCustomers(page);

  const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold" });
  await thresholdInput.click();
  await thresholdInput.fill(threshold);
  await waitForSaveComplete(page);
}

async function setResponseHours(page: Page, hours: string) {
  await enableVipCustomers(page);

  const responseHoursInput = page.getByRole("spinbutton", { name: "Response Time Target" });
  await responseHoursInput.click();
  await responseHoursInput.fill(hours);
  await waitForSaveComplete(page);
}

async function expectVipCustomersEnabled(page: Page) {
  const vipSwitch = page.getByRole("switch", { name: "VIP Customers" });
  await expect(vipSwitch).toBeChecked();
  await expect(page.getByText("Customer Value Threshold")).toBeVisible();
}

async function expectVipCustomersDisabled(page: Page) {
  const vipSwitch = page.getByRole("switch", { name: "VIP Customers" });
  await expect(vipSwitch).not.toBeChecked();
  await expect(page.getByText("Customer Value Threshold")).not.toBeVisible();
}

async function expectVipThreshold(page: Page, expectedValue: string) {
  const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold" });
  await expect(thresholdInput).toHaveValue(expectedValue);
}

async function expectResponseHours(page: Page, expectedValue: string) {
  const responseHoursInput = page.getByRole("spinbutton", { name: "Response Time Target" });
  await expect(responseHoursInput).toHaveValue(expectedValue);
}

async function enableAutoClose(page: Page) {
  const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close" });
  const isChecked = await autoCloseSwitch.isChecked();

  if (!isChecked) {
    await autoCloseSwitch.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Days of inactivity before auto-close")).toBeVisible();
  }
}

async function disableAutoClose(page: Page) {
  const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close" });
  const isChecked = await autoCloseSwitch.isChecked();

  if (isChecked) {
    await autoCloseSwitch.click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Days of inactivity before auto-close")).not.toBeVisible();
  }
}

async function setAutoCloseDays(page: Page, days: string) {
  await enableAutoClose(page);

  const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close" });
  await daysInput.click();
  await daysInput.fill(days);
  await waitForSaveComplete(page);
}

async function expectAutoCloseEnabled(page: Page) {
  const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close" });
  await expect(autoCloseSwitch).toBeChecked();
  await expect(page.getByText("Days of inactivity before auto-close")).toBeVisible();
}

async function expectAutoCloseDisabled(page: Page) {
  const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close" });
  await expect(autoCloseSwitch).not.toBeChecked();
  await expect(page.getByText("Days of inactivity before auto-close")).not.toBeVisible();
}

async function expectAutoCloseDays(page: Page, expectedDays: string) {
  const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close" });
  await expect(daysInput).toHaveValue(expectedDays);
}

async function clickRunAutoCloseNow(page: Page) {
  await enableAutoClose(page);
  const runButton = page.getByRole("button", { name: "Run auto-close now" });
  await runButton.click();
}

async function expectRunAutoCloseButtonDisabled(page: Page) {
  const runButton = page.getByRole("button", { name: "Run auto-close now" });
  await expect(runButton).toBeDisabled();
}

test.describe("Customer Settings", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCustomerSettings(page);
  });

  test("should toggle VIP customers", async ({ page }) => {
    await enableVipCustomers(page);
    await expectVipCustomersEnabled(page);

    await disableVipCustomers(page);
    await expectVipCustomersDisabled(page);
  });

  test("should update VIP settings and save successfully", async ({ page }) => {
    await enableVipCustomers(page);

    await setVipThreshold(page, "250.50");
    await expectVipThreshold(page, "250.50");
    await waitForSaved(page);

    await setResponseHours(page, "4");
    await expectResponseHours(page, "4");
    await waitForSaved(page);
  });

  test("should validate input constraints", async ({ page }) => {
    await enableVipCustomers(page);

    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold" });
    await expect(thresholdInput).toHaveAttribute("type", "number");
    await expect(thresholdInput).toHaveAttribute("min", "0");
  });

  test("should show Slack integration alert when not connected", async ({ page }) => {
    await enableVipCustomers(page);

    const slackAlert = page.getByRole("alert").filter({ hasText: "Slack integration is required" });
    await expect(slackAlert).toBeVisible();
  });

  test("should toggle auto-close inactive tickets", async ({ page }) => {
    await enableAutoClose(page);
    await expectAutoCloseEnabled(page);

    await disableAutoClose(page);
    await expectAutoCloseDisabled(page);
  });

  test("should update auto-close days and save successfully", async ({ page }) => {
    await enableAutoClose(page);

    await setAutoCloseDays(page, "7");
    await expectAutoCloseDays(page, "7");
    await waitForSaved(page);

    await setAutoCloseDays(page, "14");
    await expectAutoCloseDays(page, "14");
    await waitForSaved(page);
  });

  test("should disable run button when auto-close is disabled", async ({ page }) => {
    await disableAutoClose(page);
    await expectRunAutoCloseButtonDisabled(page);
  });

  test("should validate auto-close days input", async ({ page }) => {
    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", {
      name: "Days of inactivity before auto-close",
    });
    await expect(daysInput).toHaveAttribute("type", "number");
    await expect(daysInput).toHaveAttribute("min", "1");
  });

  test("should run auto-close and show success toast", async ({ page }) => {
    await enableAutoClose(page);

    await clickRunAutoCloseNow(page);

    const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Auto-close triggered" });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
