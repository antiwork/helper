import { expect, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class SettingsIntegrationsPage extends BasePage {
  readonly page: Page;

  private readonly connectApiButton = '[data-testid="connect-api-button"]';
  private readonly toolsSection = '[data-testid="tools-section"]';
  private readonly slackSection = '[data-testid="slack-section"]';
  private readonly apiFormContainer = '[data-testid="api-form"]';

  constructor(page: Page) {
    super(page);
    this.page = page;
  }

  async navigateToIntegrations() {
    await this.goto("/settings/integrations");
    await this.waitForPageLoad();
  }

  async waitForIntegrationsLoad() {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector(this.toolsSection, { timeout: 10000 });
  }

  async expectIntegrationsPageVisible() {
    await expect(this.page).toHaveURL(/\/settings\/integrations/);
    await expect(this.page.locator("body")).toBeVisible();
  }

  async expectToolsSection() {
    await expect(this.page.locator(this.toolsSection)).toBeVisible();
  }

  async expectConnectApiButton() {
    await expect(this.page.locator(this.connectApiButton)).toBeVisible();
  }

  async clickConnectApiButton() {
    await this.page.locator(this.connectApiButton).click();
  }

  async expectApiForm() {
    await expect(this.page.locator(this.apiFormContainer)).toBeVisible();
  }

  async expectSlackSection() {
    await expect(this.page.locator(this.slackSection)).toBeVisible();
  }
}
