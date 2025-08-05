import { expect, type Page } from "@playwright/test";

export class CustomerSettingsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToCustomerSettings() {
    await this.page.goto("/settings/customers");
    await this.page.waitForLoadState("networkidle");
  }

  async enableVipCustomers() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers" });
    const isChecked = await vipSwitch.isChecked();

    if (!isChecked) {
      await vipSwitch.click();
      await this.page.waitForLoadState("networkidle");
      await expect(this.page.getByText("Customer Value Threshold")).toBeVisible();
    }
  }

  async disableVipCustomers() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers" });
    const isChecked = await vipSwitch.isChecked();

    if (isChecked) {
      await vipSwitch.click();
      await this.page.waitForLoadState("networkidle");
      await expect(this.page.getByText("Customer Value Threshold")).not.toBeVisible();
    }
  }

  async setVipThreshold(threshold: string) {
    await this.enableVipCustomers();

    const thresholdInput = this.page.getByRole("spinbutton", { name: "Customer Value Threshold" });
    await thresholdInput.click();
    await thresholdInput.fill(threshold);
    await this.waitForSaveComplete();
  }

  async setResponseHours(hours: string) {
    await this.enableVipCustomers();

    const responseHoursInput = this.page.getByRole("spinbutton", { name: "Response Time Target" });
    await responseHoursInput.click();
    await responseHoursInput.fill(hours);
    await this.waitForSaveComplete();
  }

  async expectVipCustomersEnabled() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers" });
    await expect(vipSwitch).toBeChecked();
    await expect(this.page.getByText("Customer Value Threshold")).toBeVisible();
  }

  async expectVipCustomersDisabled() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers" });
    await expect(vipSwitch).not.toBeChecked();
    await expect(this.page.getByText("Customer Value Threshold")).not.toBeVisible();
  }

  async expectVipThreshold(expectedValue: string) {
    const thresholdInput = this.page.getByRole("spinbutton", { name: "Customer Value Threshold" });
    await expect(thresholdInput).toHaveValue(expectedValue);
  }

  async expectResponseHours(expectedValue: string) {
    const responseHoursInput = this.page.getByRole("spinbutton", { name: "Response Time Target" });
    await expect(responseHoursInput).toHaveValue(expectedValue);
  }

  async waitForSaveComplete() {
    await this.page.waitForLoadState("networkidle");
  }

  async waitForSaved() {
    await this.waitForSaveComplete();

    const savingIndicator = this.page.getByText(/(Saving|Saved|Error saving)/);
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

  async enableAutoClose() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close" });
    const isChecked = await autoCloseSwitch.isChecked();

    if (!isChecked) {
      await autoCloseSwitch.click();
      await this.page.waitForLoadState("networkidle");
      await expect(this.page.getByText("Days of inactivity before auto-close")).toBeVisible();
    }
  }

  async disableAutoClose() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close" });
    const isChecked = await autoCloseSwitch.isChecked();

    if (isChecked) {
      await autoCloseSwitch.click();
      await this.page.waitForLoadState("networkidle");
      await expect(this.page.getByText("Days of inactivity before auto-close")).not.toBeVisible();
    }
  }

  async setAutoCloseDays(days: string) {
    await this.enableAutoClose();

    const daysInput = this.page.getByRole("spinbutton", { name: "Days of inactivity before auto-close" });
    await daysInput.click();
    await daysInput.fill(days);
    await this.waitForSaveComplete();
  }

  async expectAutoCloseEnabled() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close" });
    await expect(autoCloseSwitch).toBeChecked();
    await expect(this.page.getByText("Days of inactivity before auto-close")).toBeVisible();
  }

  async expectAutoCloseDisabled() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close" });
    await expect(autoCloseSwitch).not.toBeChecked();
    await expect(this.page.getByText("Days of inactivity before auto-close")).not.toBeVisible();
  }

  async expectAutoCloseDays(expectedDays: string) {
    const daysInput = this.page.getByRole("spinbutton", { name: "Days of inactivity before auto-close" });
    await expect(daysInput).toHaveValue(expectedDays);
  }

  async clickRunAutoCloseNow() {
    await this.enableAutoClose();
    const runButton = this.page.getByRole("button", { name: "Run auto-close now" });
    await runButton.click();
  }

  async expectRunAutoCloseButtonDisabled() {
    const runButton = this.page.getByRole("button", { name: "Run auto-close now" });
    await expect(runButton).toBeDisabled();
  }
}
