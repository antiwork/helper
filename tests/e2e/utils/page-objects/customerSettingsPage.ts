import { expect, type Page } from "@playwright/test";

export class CustomerSettingsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToCustomerSettings() {
    await this.page.goto("/settings/customers");
    await expect(this.page.getByTestId("vip-customers-section")).toBeVisible();
  }

  async enableVipCustomers() {
    const vipSwitch = this.page.getByTestId("vip-customers-section-switch");
    const isChecked = await vipSwitch.isChecked();

    if (!isChecked) {
      await vipSwitch.click();
      await this.page.waitForLoadState("networkidle");
      await expect(this.page.getByTestId("vip-settings-content")).toBeVisible();
    }
  }

  async disableVipCustomers() {
    const vipSwitch = this.page.getByTestId("vip-customers-section-switch");
    const isChecked = await vipSwitch.isChecked();

    if (isChecked) {
      await vipSwitch.click();
      await this.page.waitForLoadState("networkidle");
      await expect(this.page.getByTestId("vip-settings-content")).not.toBeVisible();
    }
  }

  async setVipThreshold(threshold: string) {
    await this.enableVipCustomers();

    const thresholdInput = this.page.getByTestId("vip-threshold-input");
    await thresholdInput.click();
    await thresholdInput.fill(threshold);
    await this.waitForSaveComplete();
  }

  async setResponseHours(hours: string) {
    await this.enableVipCustomers();

    const responseHoursInput = this.page.getByTestId("response-hours-input");
    await responseHoursInput.click();
    await responseHoursInput.fill(hours);
    await this.waitForSaveComplete();
  }

  async clearResponseHours() {
    await this.enableVipCustomers();

    const responseHoursInput = this.page.getByTestId("response-hours-input");
    await responseHoursInput.click();
    await responseHoursInput.fill("");
    await this.waitForSaveComplete();
  }

  async expectVipCustomersEnabled() {
    const vipSwitch = this.page.getByTestId("vip-customers-section-switch");
    await expect(vipSwitch).toBeChecked();
    await expect(this.page.getByTestId("vip-settings-content")).toBeVisible();
  }

  async expectVipCustomersDisabled() {
    const vipSwitch = this.page.getByTestId("vip-customers-section-switch");
    await expect(vipSwitch).not.toBeChecked();
    await expect(this.page.getByTestId("vip-settings-content")).not.toBeVisible();
  }

  async expectVipThreshold(expectedValue: string) {
    await this.enableVipCustomers();

    const thresholdInput = this.page.getByTestId("vip-threshold-input");
    await expect(thresholdInput).toHaveValue(expectedValue);
  }

  async expectResponseHours(expectedValue: string) {
    await this.enableVipCustomers();

    const responseHoursInput = this.page.getByTestId("response-hours-input");
    await expect(responseHoursInput).toHaveValue(expectedValue);
  }

  async expectSlackIntegrationAlert() {
    await this.enableVipCustomers();

    await expect(this.page.getByTestId("slack-integration-alert")).toBeVisible();
    await expect(this.page.getByTestId("slack-integration-alert")).toContainText("Slack integration is required");
  }

  async expectSlackChannelSelector() {
    await this.enableVipCustomers();

    await expect(this.page.getByTestId("slack-channels-selector")).toBeVisible();
    await expect(this.page.getByTestId("slack-integration-alert")).not.toBeVisible();
  }

  async expectSavingIndicator(state: "saving" | "saved" | "error") {
    const savingIndicator = this.page.getByTestId("saving-indicator");

    // Wait for the indicator to show the expected state
    await expect(savingIndicator).toBeVisible();

    if (state === "saving") {
      await expect(savingIndicator).toContainText("Saving");
    } else if (state === "saved") {
      await expect(savingIndicator).toContainText("Saved");
    } else if (state === "error") {
      await expect(savingIndicator).toContainText("Error");
    }
  }

  async waitForSaveComplete() {
    // Wait for network idle to ensure any save operations are done
    await this.page.waitForLoadState("networkidle");

    // Wait a bit more to ensure any debounced saves have completed
    await this.page.waitForTimeout(1000);
  }

  async waitForSaved() {
    // For tests that specifically want to verify successful save
    await this.waitForSaveComplete();

    const savingIndicator = this.page.getByTestId("saving-indicator");
    const isVisible = await savingIndicator.isVisible().catch(() => false);

    if (isVisible) {
      const indicatorText = await savingIndicator.textContent();

      // If there's an error, throw to fail the test appropriately
      if (indicatorText?.includes("Error")) {
        throw new Error(`Save failed: ${indicatorText}`);
      }

      // If it's still saving, wait for it to complete
      if (indicatorText?.includes("Saving")) {
        await expect(savingIndicator).toContainText("Saved", { timeout: 10000 });
      }
    }
  }
}
