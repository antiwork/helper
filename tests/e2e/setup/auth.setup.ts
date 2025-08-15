import { join } from "path";
import { expect, test as setup } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

const authFile = join(process.cwd(), "tests/e2e/.auth/user.json");

setup("authenticate", async ({ page, request }) => {
  // For test environment, use the seeded user credentials
  const testEmail = "support@gumroad.com";
  const testPassword = "password";

  // Sign in using Supabase API directly
  const supabaseUrl = "https://127.0.0.1:5544";
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    data: {
      email: testEmail,
      password: testPassword,
    },
    headers: {
      apikey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
      "Content-Type": "application/json",
    },
    ignoreHTTPSErrors: true,
  });

  const authData = await response.json();

  if (!authData.access_token) {
    throw new Error(`Authentication failed: ${JSON.stringify(authData)}`);
  }

  // Set the auth cookie
  await page.context().addCookies([
    {
      name: "sb-127-auth-token",
      value: `base64-${Buffer.from(JSON.stringify(authData)).toString("base64")}`,
      domain: "localhost",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 3600,
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Navigate to the app
  await page.goto("/mine");
  await page.waitForLoadState("networkidle");

  // Verify we're authenticated by checking for the search input (key dashboard element)
  const searchInput = page.locator('input[placeholder="Search conversations"]');
  await expect(searchInput).toBeVisible({ timeout: 15000 });

  // Take screenshot of authenticated state
  await takeDebugScreenshot(page, "authenticated-dashboard.png");

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
