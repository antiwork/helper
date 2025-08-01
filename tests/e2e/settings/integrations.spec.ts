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

  test("should display integrations page and load successfully", async ({ page }) => {
    const integrationsPage = new SettingsIntegrationsPage(page);

    await expect(page).toHaveURL(/\/settings\/integrations/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display Tools section", async ({ page }) => {
    const integrationsPage = new SettingsIntegrationsPage(page);

    await integrationsPage.expectToolsSection();
  });

  test("should be responsive on mobile devices", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/settings\/integrations/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be responsive on tablet devices", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/settings\/integrations/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("should maintain URL after page refresh", async ({ page }) => {
    const currentUrl = page.url();

    await page.reload();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toBe(currentUrl);
    await expect(page).toHaveURL(/\/settings\/integrations/);
  });

  test("should load without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/settings/integrations");
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });
});
