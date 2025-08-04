import { expect, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class SettingsIntegrationsPage extends BasePage {
  private readonly connectApiButton = 'button:has-text("Connect API")';
  private readonly toolsSection = 'section:has(h2:text("Tools"))';
  private readonly slackSection = 'section:has(h2:text("Slack Integration"))';
  private readonly apiFormContainer = '[data-testid="api-form"]';

  private readonly apiNameInput = 'input#apiName[placeholder="Your App"]';
  private readonly apiUrlInput = 'input#apiUrl[placeholder="https://yourapp.com/api"]';
  private readonly apiKeyInput = 'input#apiKey[type="password"]';
  private readonly importApiButton = 'button:has-text("Import API")';
  private readonly cancelButton = 'button:has-text("Cancel")';
  private readonly toggleSchemaButton = 'button:has-text("Enter OpenAPI schema instead")';
  private readonly toggleUrlButton = 'button:has-text("Enter OpenAPI URL instead")';
  private readonly apiSchemaTextarea = '[data-testid="api-schema-textarea"]';

  constructor(page: Page) {
    super(page);
  }

  async navigateToIntegrations() {
    await this.goto("/settings/integrations");
    await this.waitForPageLoad();
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
