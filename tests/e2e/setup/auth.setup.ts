import { join } from "path";
import { expect, test as setup } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

const authFile = join(process.cwd(), "tests/e2e/.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Navigate to login page
  await page.goto("/login");

  // Verify we're on the login page
  await expect(page).toHaveTitle(/Helper/);

  // Fill in email (using support@gumroad.com which works)
  await page.fill("#email", "support@gumroad.com");

  // Submit email form
  await page.click('button[type="submit"]');

  // Wait for successful authentication - be flexible about redirect path
  await expect(page).toHaveURL(/.*mine.*/, { timeout: 40000 });

  // Wait for page to fully load
  await page.waitForLoadState("networkidle");

  // Verify we're authenticated by checking for the search input (key dashboard element)
  const searchInput = page.locator('input[placeholder="Search conversations"]');
  await expect(searchInput).toBeVisible({ timeout: 15000 });

  // Take screenshot of authenticated state
  await takeDebugScreenshot(page, "authenticated-dashboard.png");

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
