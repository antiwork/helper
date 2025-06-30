import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Lowest Value Filter", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/mailboxes/gumroad/mine", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mailboxes/gumroad/mine", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should have lowest value option in sort dropdown", async ({ page }) => {
    // Use the existing sort button selector pattern from conversations.spec.ts
    const sortButton = page
      .locator('[role="combobox"], button:has-text("Sort"), button[aria-haspopup="listbox"]')
      .first();
    await expect(sortButton).toBeVisible();
    await sortButton.click();

    // Check that "Lowest Value" option exists
    const lowestValueOption = page.locator('[role="option"]').filter({ hasText: "Lowest Value" });
    await expect(lowestValueOption).toBeVisible();
  });

  test("should be able to select lowest value filter", async ({ page }) => {
    // Find and click the sort dropdown
    const sortButton = page
      .locator('[role="combobox"], button:has-text("Sort"), button[aria-haspopup="listbox"]')
      .first();
    await sortButton.click();

    // Click on "Lowest Value" option
    const lowestValueOption = page.locator('[role="option"]').filter({ hasText: "Lowest Value" });
    await lowestValueOption.click();

    // Wait for page to update
    await page.waitForLoadState("networkidle");

    // Verify the URL contains the lowest_value parameter
    expect(page.url()).toContain("sort=lowest_value");

    // Verify the dropdown shows "Lowest Value" as selected
    await expect(sortButton).toContainText("Lowest Value");
  });

  test("should maintain lowest value selection after page refresh", async ({ page }) => {
    // Set lowest value filter
    const sortButton = page
      .locator('[role="combobox"], button:has-text("Sort"), button[aria-haspopup="listbox"]')
      .first();
    await sortButton.click();

    const lowestValueOption = page.locator('[role="option"]').filter({ hasText: "Lowest Value" });
    await lowestValueOption.click();

    await page.waitForLoadState("networkidle");

    // Refresh the page
    await page.reload({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Verify filter is still active
    expect(page.url()).toContain("sort=lowest_value");
    await expect(sortButton).toContainText("Lowest Value");
  });
});
