import { expect, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class SettingsIntegrationsPage extends BasePage {
  private readonly connectApiButton = '[data-testid="connect-api-button"]';
  private readonly toolsSection = '[data-testid="tools-section"]';
  private readonly slackSection = '[data-testid="slack-section"]';
  private readonly apiFormContainer = '[data-testid="api-form"]';

  private readonly apiNameInput = '[data-testid="api-name-input"]';
  private readonly apiUrlInput = '[data-testid="api-url-input"]';
  private readonly apiKeyInput = '[data-testid="api-key-input"]';
  private readonly importApiButton = '[data-testid="import-api-button"]';
  private readonly cancelButton = '[data-testid="cancel-button"]';
  private readonly toggleSchemaButton = '[data-testid="toggle-schema-button"]';
  private readonly toggleUrlButton = '[data-testid="toggle-url-button"]';
  private readonly apiSchemaTextarea = '[data-testid="api-schema-textarea"]';

  constructor(page: Page) {
    super(page);
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

  async fillApiName(name: string) {
    await this.page.locator(this.apiNameInput).fill(name);
  }

  async fillApiUrl(url: string) {
    await this.page.locator(this.apiUrlInput).fill(url);
  }

  async fillApiKey(key: string) {
    await this.page.locator(this.apiKeyInput).fill(key);
  }

  async clickImportApi() {
    await this.page.locator(this.importApiButton).click();
  }

  async clickCancel() {
    await this.page.locator(this.cancelButton).click();
  }

  async toggleToSchemaInput() {
    await this.page.locator(this.toggleSchemaButton).click();
  }

  async toggleToUrlInput() {
    await this.page.locator(this.toggleUrlButton).click();
  }

  async fillApiSchema(schema: string) {
    await this.page.locator(this.apiSchemaTextarea).fill(schema);
  }

  async expectApiFormNotVisible() {
    await expect(this.page.locator(this.apiFormContainer)).not.toBeVisible();
  }
}
