import { defineConfig, devices } from "@playwright/test";

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? "100%" : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [["list"], ["html"], ["github"]] : "list",

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://helperai.dev",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "retain-on-failure",

    /* Ignore HTTPS errors for local development */
    ignoreHTTPSErrors: true,

    /* Extended timeouts for local SSL setup */
    actionTimeout: 15000,
    navigationTimeout: process.env.CI ? 15000 : 45000,
  },
  timeout: process.env.CI ? 30000 : 60000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      timeout: 60000,
    },

    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      timeout: 60000,
    },
  ],

  /* Run your local server before starting the tests */
  // Make sure your port matches the one in your `.env.test.local` file
  webServer: {
    command: "scripts/e2e-test-server.sh",
    url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3020",
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 120 * 1000, // 2 minutes for server startup
  },
});
