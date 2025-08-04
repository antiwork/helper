import { expect, test } from "@playwright/test";
import { SettingsIntegrationsPage } from "../utils/page-objects/settingsIntegrationsPage";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Settings - Integrations", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/settings/integrations", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/settings/integrations", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });


  test("should show Connect API button and open API form", async ({ page }) => {
    const integrationsPage = new SettingsIntegrationsPage(page);

    await integrationsPage.expectToolsSection();
    await integrationsPage.clickConnectApiButton();
    await integrationsPage.expectApiForm();
  });

  test("should handle API form interactions and validation", async ({ page }) => {
    const integrationsPage = new SettingsIntegrationsPage(page);

    await integrationsPage.clickConnectApiButton();
    await integrationsPage.expectApiForm();

    await integrationsPage.clickImportApi();

    await integrationsPage.fillApiName("Test API");
    await integrationsPage.fillApiUrl("https://api.example.com/openapi.json");
    await integrationsPage.fillApiKey("test-api-key-123");

    await integrationsPage.clickCancel();
    await integrationsPage.expectApiFormNotVisible();
  });

  test("should toggle between URL and schema input in API form", async ({ page }) => {
    const integrationsPage = new SettingsIntegrationsPage(page);

    await integrationsPage.clickConnectApiButton();
    await integrationsPage.expectApiForm();

    await integrationsPage.toggleToSchemaInput();
    await expect(page.locator('textarea')).toBeVisible();

    const testSchema = '{"products": {"GET": {"url": "/products/:id"}}}';
    await integrationsPage.fillApiSchema(testSchema);

    await integrationsPage.toggleToUrlInput();
    await expect(page.locator('input[placeholder="https://yourapp.com/api"]')).toBeVisible();

    await integrationsPage.clickCancel();
  });

});
