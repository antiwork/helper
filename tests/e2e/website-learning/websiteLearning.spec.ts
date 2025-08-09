import { expect, test } from "@playwright/test";
import { waitForToast } from "../utils/toastHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Website Learning UI Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/knowledge");
    await page.waitForLoadState("networkidle");
    
    // Wait for the page to fully load by checking for a known element
    await expect(page.getByRole("heading", { name: "Knowledge Bank" })).toBeVisible({ timeout: 15000 });
  });

  test("displays the website learning section and add website form", async ({ page }) => {
    // Wait for Website Learning section to be visible
    await expect(page.getByRole("heading", { name: "Website Learning" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Helper will learn about your product by reading your websites to provide better responses.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add website" })).toBeVisible();
    
    await page.getByRole("button", { name: "Add website" }).click();
    await page.waitForTimeout(500);
    
    await expect(page.locator('label[for="url"]')).toBeVisible();
    await expect(page.locator("input#url")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test("hides form when cancelled", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Website Learning" })).toBeVisible({ timeout: 15000 });
    
    await page.getByRole("button", { name: "Add website" }).click();
    await page.waitForTimeout(500);
    
    await page.getByRole("button", { name: "Cancel" }).click();
    
    await expect(page.locator("input#url")).not.toBeVisible();
  });

  test("validates invalid URL format", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Website Learning" })).toBeVisible({ timeout: 15000 });
    
    await page.getByRole("button", { name: "Add website" }).click();
    await page.waitForTimeout(500);
    
    await page.locator("input#url").fill("invalid url");
    await page.locator('form button[type="submit"]').click();
    await page.waitForLoadState("networkidle");
    
    await expect(page.getByText("Failed to add website. Please try again.")).toBeVisible({ timeout: 10000 });
  });

  test("adds website with valid URL", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Website Learning" })).toBeVisible({ timeout: 15000 });
    
    const timestamp = Date.now();
    const testUrl = `https://test-${timestamp}.example.com`;
    const testName = `test-${timestamp}.example.com`;

    await page.getByRole("button", { name: "Add website" }).click();
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
