import { test, expect } from "../baseTest";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("JS Error Detection Demo", () => {
  test.skip("should fail when JavaScript errors occur", async ({ page }) => {
    await page.goto("/mine");
    await page.waitForLoadState("networkidle");
    
    await page.evaluate(() => {
      (window as any).undefinedFunction();
    });
    
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();
  });

  test.skip("should fail on unhandled promise rejection", async ({ page }) => {
    await page.goto("/mine");
    await page.waitForLoadState("networkidle");
    
    await page.evaluate(() => {
      Promise.reject(new Error("Intentional unhandled rejection"));
    });
    
    await page.waitForTimeout(1000);
    
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();
  });

  test("should pass when FAIL_ON_JS_ERRORS is false", async ({ page }) => {

    await page.goto("/mine");
    await page.waitForLoadState("networkidle");
    
    if (process.env.FAIL_ON_JS_ERRORS === "false") {
      await page.evaluate(() => {
        console.error("This is a test console error");
      });
    }
    
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();
  });
});
