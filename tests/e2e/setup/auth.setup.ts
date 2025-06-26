import { existsSync, statSync } from "fs";
import { join } from "path";
import { expect, test as setup } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

const authFile = join(process.cwd(), "tests/e2e/.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Skip auth setup if we have a recent authentication file
  if (existsSync(authFile)) {
    const stats = statSync(authFile);
    const fileAge = Date.now() - stats.mtime.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (fileAge < maxAge) {
      console.log("Recent authentication file exists, skipping auth setup");
      return;
    } else {
      console.log("Authentication file is old, will re-authenticate");
    }
  }

  console.log("Performing authentication setup...");

  // Navigate to login page
  await page.goto("/login");
  await expect(page).toHaveTitle(/Helper/);

  // Fill in email
  await page.fill("#email", "support@gumroad.com");
  await page.click('button[type="submit"]');

  // Wait for either OTP form or successful redirect
  await page.waitForTimeout(3000);

  const currentUrl = page.url();

  if (currentUrl.includes("/login")) {
    // We're still on login page - check for OTP form
    const otpInputs = page.locator("[data-input-otp-slot]");
    const hasOtpForm = (await otpInputs.count()) > 0;

    if (hasOtpForm) {
      // OTP form is present - in a real test environment, you'd:
      // 1. Retrieve OTP from email API or test database
      // 2. Fill OTP inputs programmatically
      // For now, we'll create a manual auth file or skip

      console.log("OTP form detected. In a real test environment:");
      console.log("1. Integrate with email API to retrieve OTP");
      console.log("2. Or use test database with known OTP");
      console.log("3. Or use mock authentication service");

      // For development testing, try to use any existing valid auth
      throw new Error(
        "Authentication requires OTP verification. " +
          "Please run manual login once to create auth file, or integrate OTP retrieval.",
      );
    }
  } else if (currentUrl.includes("mailboxes")) {
    // Successfully redirected - save auth state
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 });
    } catch (error) {
      // Fallback to domcontentloaded if networkidle times out
      await page.waitForLoadState("domcontentloaded", { timeout: 3000 });
    }

    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    await takeDebugScreenshot(page, "authenticated-dashboard.png");
    await page.context().storageState({ path: authFile });
    console.log("Authentication successful, saved to:", authFile);
  } else {
    throw new Error(`Unexpected URL after login attempt: ${currentUrl}`);
  }
});
