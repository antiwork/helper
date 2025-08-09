import { expect, test } from "@playwright/test";
import { waitForToast } from "../utils/toastHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Website Learning UI Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/settings/knowledge");
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Navigation failed, retrying...", error);
      await page.goto("/settings/knowledge");
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    }
  });

  test("displays the website learning section and add website form", async ({ page }) => {
    await expect(page.locator('h2:has-text("Website Learning")')).toBeVisible();
    await expect(page.locator('text="Helper will learn about your product by reading your websites to provide better responses."')).toBeVisible();
    await expect(page.locator('button:has-text("Add website")')).toBeVisible();
    
    await page.locator('button:has-text("Add website")').click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('label[for="url"]')).toBeVisible();
    await expect(page.locator("input#url")).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test("hides form when cancelled", async ({ page }) => {
    await page.locator('button:has-text("Add website")').click();
    await page.waitForTimeout(500);
    
    await page.locator('button:has-text("Cancel")').click();
    
    await expect(page.locator("input#url")).not.toBeVisible();
  });

  test("validates invalid URL format", async ({ page }) => {
    await page.locator('button:has-text("Add website")').click();
    await page.waitForTimeout(500);
    
    await page.locator("input#url").fill("invalid url");
    await page.locator('form button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText("Failed to add website. Please try again.")).toBeVisible();
  });

  test("adds website with valid URL", async ({ page }) => {
    const timestamp = Date.now();
    const testUrl = `https://test-${timestamp}.example.com`;
    const testName = `test-${timestamp}.example.com`;

    await page.locator('button:has-text("Add website")').click();
    await page.waitForTimeout(500);
    
    await page.locator("input#url").fill(testUrl);
    await page.locator('form button[type="submit"]').click();
    await page.waitForLoadState("networkidle");

    await waitForToast(page, "Website added!");
    
    const websiteItem = page.locator('[data-testid="website-item"]').filter({
      has: page.locator(`text="${testName}"`),
    });
    await expect(websiteItem).toBeVisible({ timeout: 15000 });
  });
});
