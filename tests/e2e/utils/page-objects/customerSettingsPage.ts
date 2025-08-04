import { expect, type Page } from "@playwright/test";

export class CustomerSettingsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async enableVipCustomers() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    const isChecked = await vipSwitch.isChecked();

    if (!isChecked) {
      await vipSwitch.click();
      await expect(this.page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();
    }
  }

  async disableVipCustomers() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    const isChecked = await vipSwitch.isChecked();

    if (isChecked) {
      await vipSwitch.click();
      await expect(this.page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();
    }
  }

  async setVipThreshold(threshold: string) {
    await this.enableVipCustomers();

    const thresholdInput = this.page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await thresholdInput.click();
    await thresholdInput.fill(threshold);
  }

  async setResponseHours(hours: string) {
    await this.enableVipCustomers();

    const responseHoursInput = this.page.getByRole("spinbutton", { name: "Response Time Target", exact: true });
    await responseHoursInput.click();
    await responseHoursInput.fill(hours);
  }

  async expectVipCustomersEnabled() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    await expect(vipSwitch).toBeChecked();
    await expect(this.page.getByText("Customer Value Threshold", { exact: true })).toBeVisible();
  }

  async expectVipCustomersDisabled() {
    const vipSwitch = this.page.getByRole("switch", { name: "VIP Customers Switch", exact: true });
    await expect(vipSwitch).not.toBeChecked();
    await expect(this.page.getByText("Customer Value Threshold", { exact: true })).not.toBeVisible();
  }

  async expectVipThreshold(expectedValue: string) {
    await this.enableVipCustomers();

    const thresholdInput = this.page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await expect(thresholdInput).toHaveValue(expectedValue);
  }

  async expectResponseHours(expectedValue: string) {
    await this.enableVipCustomers();

    const responseHoursInput = this.page.getByRole("spinbutton", { name: "Response Time Target", exact: true });
    await expect(responseHoursInput).toHaveValue(expectedValue);
  }

  async waitForSaved() {
    const saving = this.page.getByText("Saving", { exact: true });
    const saved = this.page.getByText("Saved", { exact: true });
    const error = this.page.getByText("Error", { exact: true });

    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }

    if (await saving.isVisible().catch(() => false)) {
      await expect(saved).toBeVisible({ timeout: 10000 });
    }
  }

  async enableAutoClose() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close", exact: true });
    const isChecked = await autoCloseSwitch.isChecked();

    if (!isChecked) {
      await autoCloseSwitch.click();
      await expect(this.page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();
    }
  }

  async disableAutoClose() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close", exact: true });
    const isChecked = await autoCloseSwitch.isChecked();

    if (isChecked) {
      await autoCloseSwitch.click();
      await expect(this.page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();
    }
  }

  async setDaysOfInactivity(days: string) {
    await this.enableAutoClose();

    const daysInput = this.page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await daysInput.click();
    await daysInput.fill(days);
  }

  async expectAutoCloseEnabled() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close", exact: true });
    await expect(autoCloseSwitch).toBeChecked();
    await expect(this.page.getByText("Days of inactivity before auto-close", { exact: true })).toBeVisible();
  }

  async expectAutoCloseDisabled() {
    const autoCloseSwitch = this.page.getByRole("switch", { name: "Enable auto-close", exact: true });
    await expect(autoCloseSwitch).not.toBeChecked();
    await expect(this.page.getByText("Days of inactivity before auto-close", { exact: true })).not.toBeVisible();
  }

  async expectDaysOfInactivity(expectedValue: string) {
    await this.enableAutoClose();

    const daysInput = this.page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true });
    await expect(daysInput).toHaveValue(expectedValue);
  }

  async expectDayLabel(expectedLabel: "day" | "days") {
    await this.enableAutoClose();

    const dayLabel = this.page.getByText(expectedLabel, { exact: true });
    await expect(dayLabel).toBeVisible();
  }

  async expectDaysInputVisible() {
    await expect(
      this.page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).toBeVisible();
  }

  async expectDaysInputHidden() {
    await expect(
      this.page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true }),
    ).not.toBeVisible();
  }
}
