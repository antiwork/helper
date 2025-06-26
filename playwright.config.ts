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
  retries: process.env.CI ? 2 : 1,
  /* Use multiple workers for faster test execution */
  workers: 3,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://helperai.dev",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "retain-on-failure",

    /* Ignore HTTPS errors for development environments */
    ignoreHTTPSErrors: true,

    /* Standard timeouts */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* Standard timeout */
  timeout: 30000,

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
      timeout: 45000,
    },
  ],

  /* Run your local dev server before starting the tests */
  /* Note: Tests clean saved replies for consistent state on each run */
  webServer: {
    command: "pnpm dev:test",
    url: "http://localhost:3010",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
