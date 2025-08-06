import { test, expect } from "../baseTest";
import { test as playwrightTest } from "@playwright/test";
import { createJSErrorTracker, checkForJavaScriptErrors } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("JavaScript Error Tracking Examples", () => {
  test.describe("Automatic JS Error Tracking", () => {
    test("should automatically detect and report JS errors", async ({ page }) => {
      await page.goto("/mine");
      await page.waitForLoadState("networkidle");

      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();

    });

    test("should work with responsive design tests", async ({ page }) => {
      await page.goto("/mine");

      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForLoadState("networkidle");
      
      const openFilter = page.locator('button:has-text("open")');
      await expect(openFilter).toBeVisible();

      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForLoadState("networkidle");
      
      await expect(openFilter).toBeVisible();

      await page.setViewportSize({ width: 1024, height: 768 });
      await page.waitForLoadState("networkidle");
      
      await expect(openFilter).toBeVisible();

    });
  });

  test.describe("Manual JS Error Tracking", () => {
    test("manual error checking at specific points", async ({ page }) => {
      const jsTracker = await createJSErrorTracker(page);
      
      await page.goto("/mine");
      await page.waitForLoadState("networkidle");
      
      await checkForJavaScriptErrors(page);
      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await searchInput.fill("test search");
      await checkForJavaScriptErrors(page);
      
      await searchInput.clear();
      await checkForJavaScriptErrors(page);
    });

    playwrightTest("advanced error handling with custom logic", async ({ page }) => {
      const { JSErrorTracker } = await import("../utils/jsErrorTracker");
      const tracker = new JSErrorTracker(page);

      tracker.clearErrors();
      
      await page.goto("/mine");

      await page.click('button:has-text("open")');

      const allErrors = await tracker.getAllErrors();
      const hasErrors = await tracker.hasAnyErrors();
      
      if (hasErrors) {
        const errorDetails = await tracker.getErrorsAsString();
        console.log("Detailed error information:", errorDetails);

        const criticalErrors = allErrors.filter(error => 
          error.message.includes('TypeError') || 
          error.message.includes('ReferenceError')
        );
        
        expect(criticalErrors).toHaveLength(0);
      }
    });
  });

  test.describe("Error Tracking with Environment Variables", () => {
    test("should respect FAIL_ON_JS_ERRORS environment variable", async ({ page }) => {

      await page.goto("/mine");
      await page.waitForLoadState("networkidle");
      
      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();

      await searchInput.fill("test search");
      await page.keyboard.press("Enter");

    });
  });
});
