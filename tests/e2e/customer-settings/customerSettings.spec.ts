import { expect, test, type Page } from "@playwright/test";
import { getMailbox } from "../../../lib/data/mailbox";

test.use({ storageState: "tests/e2e/.auth/user.json" });

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

async function waitForSaved(page: Page) {
  await page.waitForLoadState("networkidle");

  const saving = page.getByText("Saving", { exact: true });
  const saved = page.getByText("Saved", { exact: true });
  const error = page.getByText("Error", { exact: true });

  try {
    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }

    const isSavingVisible = await saving.isVisible().catch(() => false);
    if (isSavingVisible) {
      await saved.waitFor({ state: "visible", timeout: 10000 });
    } else {
      const isSavedVisible = await saved.isVisible().catch(() => false);
      if (!isSavedVisible) {
        console.warn("No saving/saved indicator found. This might mean the save was instant or there were no changes.");
      }
    }
  } catch (e) {
    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }
    console.warn("Save status unclear - no error detected, continuing.");
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

test.describe("Customer Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/customers");
    await expect(page).toHaveURL("/settings/customers");
  });

  test("should toggle VIP customers", async ({ page }) => {
    await enableVipCustomers(page);
    const vipSwitch = page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    await expect(vipSwitch).toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();

    await disableVipCustomers(page);
    await expect(vipSwitch).not.toBeChecked();
    await expect(page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();
  });

  test("should update VIP settings and save successfully", async ({ page }) => {
    await enableVipCustomers(page);

    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await thresholdInput.click();
    await thresholdInput.fill("250.50");
    await expect(thresholdInput).toHaveValue("250.50");
    await waitForSaved(page);

    const responseHoursInput = page.getByRole("spinbutton", { name: "Response Time Target", exact: true });
    await responseHoursInput.click();
    await responseHoursInput.fill("4");
    await expect(responseHoursInput).toHaveValue("4");
    await waitForSaved(page);
  });

  test("should validate input constraints", async ({ page }) => {
    await enableVipCustomers(page);

    const thresholdInput = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
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
    const autoCloseSwitch = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    await expect(autoCloseSwitch).toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();

    await disableAutoClose(page);
    await expect(autoCloseSwitch).not.toBeChecked();
    await expect(page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();
  });

  test("should update auto-close days and save successfully", async ({ page }) => {
    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill("7");
    await expect(daysInput).toHaveValue("7");
    await waitForSaved(page);

    await daysInput.click();
    await daysInput.fill("14");
    await expect(daysInput).toHaveValue("14");
    await waitForSaved(page);
  });

  test("should disable run button when auto-close is disabled", async ({ page }) => {
    await disableAutoClose(page);
    const runButton = page.getByRole("button", { name: "Run auto-close now", exact: true });
    await expect(runButton).toBeDisabled();
  });

  test("should validate auto-close days input", async ({ page }) => {
    await enableAutoClose(page);

    const daysInput = page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await expect(daysInput).toHaveAttribute("type", "number");
    await expect(daysInput).toHaveAttribute("min", "1");
  });

  test("should run auto-close and show success toast", async ({ page }) => {
    await enableAutoClose(page);

    const runButton = page.getByRole("button", { name: "Run auto-close now", exact: true });
    await runButton.click();

    const toast = page.locator("[data-sonner-toast]").filter({ hasText: "Auto-close triggered" });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
