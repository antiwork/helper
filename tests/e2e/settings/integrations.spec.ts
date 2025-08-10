import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Settings - Integrations", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/settings/integrations");
      await page.waitForLoadState("networkidle");
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/settings/integrations");
      await page.waitForLoadState("domcontentloaded");
    }
  });

  test("should show Connect API button and open API form", async ({ page }) => {
    const connectApiButton = page.locator('button:has-text("Connect API")');

    await expect(connectApiButton).toBeVisible();
    await connectApiButton.click();

    await expect(page.locator('input#apiName[placeholder="Your App"]')).toBeVisible();
    await expect(page.locator('input#apiUrl[placeholder="https://yourapp.com/api"]')).toBeVisible();
    await expect(page.locator('input#apiKey[type="password"]')).toBeVisible();
  });

  test("should handle API form interactions and validation", async ({ page }) => {
    const connectApiButton = page.locator('button:has-text("Connect API")');
    const apiNameInput = page.locator('input#apiName[placeholder="Your App"]');
    const apiUrlInput = page.locator('input#apiUrl[placeholder="https://yourapp.com/api"]');
    const apiKeyInput = page.locator('input#apiKey[type="password"]');
    const importApiButton = page.locator('button:has-text("Import API")');
    const cancelButton = page.locator('button:has-text("Cancel")');

    await connectApiButton.click();

    await expect(apiNameInput).toBeVisible();
    await expect(apiUrlInput).toBeVisible();
    await expect(apiKeyInput).toBeVisible();

    await importApiButton.click();

    await apiNameInput.fill("Test API");
    await apiUrlInput.fill("https://api.example.com/openapi.json");
    await apiKeyInput.fill("test-api-key-123");

    await cancelButton.click();
    await expect(apiNameInput).not.toBeVisible();
  });

  test("should toggle between URL and schema input in API form", async ({ page }) => {
    const connectApiButton = page.locator('button:has-text("Connect API")');
    const toggleSchemaButton = page.locator('button:has-text("Enter OpenAPI schema instead")');
    const toggleUrlButton = page.locator('button:has-text("Enter OpenAPI URL instead")');
    const apiSchemaTextarea = page.locator("textarea#apiSchema");
    const apiUrlInput = page.locator('input[placeholder="https://yourapp.com/api"]');
    const cancelButton = page.locator('button:has-text("Cancel")');

    await connectApiButton.click();

    await expect(page.locator('input#apiName[placeholder="Your App"]')).toBeVisible();

    await toggleSchemaButton.click();
    await expect(apiSchemaTextarea).toBeVisible();

    const testSchema = '{"products": {"GET": {"url": "/products/:id"}}}';
    await apiSchemaTextarea.fill(testSchema);

    await toggleUrlButton.click();
    await expect(apiUrlInput).toBeVisible();

    await cancelButton.click();
  });
});
