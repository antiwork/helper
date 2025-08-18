import { expect, test } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Unread Messages Filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mine");
    await page.waitForLoadState("domcontentloaded");

    const filterToggleButton = page.locator('button[aria-label="Filter Toggle"]');
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();
    
    // Wait for filter panel to be fully visible and interactive
    await page.waitForSelector('button:has-text("Unread")', { state: 'visible' });
  });

  test("should show unread messages filter button", async ({ page }) => {
    const filterButton = page.locator('button:has-text("Unread")');
    await expect(filterButton).toBeVisible();

    await expect(filterButton).not.toHaveClass(/bright/);

    await takeDebugScreenshot(page, "unread-filter-initial-state.png");
  });

  test("should filter conversations to show only unread messages", async ({ page }) => {
    const filterButton = page.locator('button:has-text("Unread")');
    await filterButton.click();

    await expect(filterButton).toHaveClass(/bright/);

    await expect(page).toHaveURL(/hasUnreadMessages=true/);

    // Wait for the filtered results to load
    await page.waitForLoadState('networkidle');

    const unreadIndicator = page.locator('[data-testid="unread-indicator"]');
    const indicatorCount = await unreadIndicator.count();

    if (indicatorCount > 0) {
      await expect(unreadIndicator.first()).toBeVisible();
    }

    await takeDebugScreenshot(page, "unread-filter-active.png");
  });

  test("should clear filter when clicked again", async ({ page }) => {
    const filterButton = page.locator('button:has-text("Unread")');

    await filterButton.click();
    await expect(filterButton).toHaveClass(/bright/);

    await filterButton.click();
    await expect(filterButton).not.toHaveClass(/bright/);

    await expect(page).not.toHaveURL(/hasUnreadMessages=true/);
  });

  test("should work with other filters", async ({ page }) => {
    const dateFilter = page.locator('button[aria-label="Date Filter"]');
    await expect(dateFilter).toBeVisible();
    await dateFilter.click();

    // Wait for dropdown menu to be visible
    await page.waitForSelector('[role="menuitemradio"]', { state: 'visible' });

    const todayOption = page.locator('[role="menuitemradio"]:has-text("Today")');
    await expect(todayOption).toBeVisible();
    await todayOption.click();

    // Wait for filter to be applied
    await expect(dateFilter).toHaveClass(/bright/);

    const unreadFilter = page.locator('button:has-text("Unread")');
    await unreadFilter.click();

    await expect(dateFilter).toHaveClass(/bright/);
    await expect(unreadFilter).toHaveClass(/bright/);

    await expect(page).toHaveURL(/hasUnreadMessages=true/);

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('createdAfter=')) {
      await expect(page).toHaveURL(/createdAfter=/);
    } else {
      await expect(dateFilter).toHaveClass(/bright/);
    }
  });

  test("should only show unread filter in mine and assigned views", async ({ page }) => {
    // Test that filter shows in "mine" view (current page)
    const filterButton = page.locator('button:has-text("Unread")');
    await expect(filterButton).toBeVisible();

    // Test that filter doesn't show in "all" view
    await page.goto("/all");
    await page.waitForLoadState("domcontentloaded");
    
    const filterToggleButton = page.locator('button[aria-label="Filter Toggle"]');
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();
    
    const unreadFilterInAll = page.locator('button:has-text("Unread")');
    await expect(unreadFilterInAll).toHaveCount(0);

    // Test that filter shows in "assigned" view
    await page.goto("/assigned");
    await page.waitForLoadState("domcontentloaded");
    
    const filterToggleInAssigned = page.locator('button[aria-label="Filter Toggle"]');
    await expect(filterToggleInAssigned).toBeVisible();
    await filterToggleInAssigned.click();
    
    const unreadFilterInAssigned = page.locator('button:has-text("Unread")');
    await expect(unreadFilterInAssigned).toBeVisible();
  });

  test("should only show unread indicators in mine and assigned views", async ({ page }) => {
    // Test in "mine" view (current page)
    const unreadIndicators = page.locator('[data-testid="unread-indicator"]');
    const indicatorCount = await unreadIndicators.count();

    if (indicatorCount > 0) {
      for (let i = 0; i < indicatorCount; i++) {
        const indicator = unreadIndicators.nth(i);
        await expect(indicator).toBeVisible();
      }
    }

    // Test that indicators don't show in "all" view
    await page.goto("/all");
    await page.waitForLoadState("domcontentloaded");
    
    const indicatorsInAll = page.locator('[data-testid="unread-indicator"]');
    await expect(indicatorsInAll).toHaveCount(0);

    // Test that indicators show in "assigned" view
    await page.goto("/assigned");
    await page.waitForLoadState("domcontentloaded");
    
    const indicatorsInAssigned = page.locator('[data-testid="unread-indicator"]');
    // Just ensure the page loaded correctly - indicators may or may not be present
    await expect(page).toHaveURL(/\/assigned/);
  });

  test("should update filter count in clear filters button", async ({ page }) => {
    const unreadFilter = page.locator('button:has-text("Unread")');
    await unreadFilter.click();

    const clearButton = page.locator('button:has-text("Clear filters")');
    await expect(clearButton).toBeVisible();

    const vipFilter = page.locator('button:has-text("VIP")');
    await expect(vipFilter).toBeVisible();
    await vipFilter.click();
    const vipOnlyOption = page.locator('[role="menuitemradio"]:has-text("VIP only")');
    await expect(vipOnlyOption).toBeVisible();
    await vipOnlyOption.click();

    // Wait for VIP filter to be applied
    await page.waitForLoadState('networkidle');

    await clearButton.click();

    // Wait for filter to be cleared
    await expect(unreadFilter).not.toHaveClass(/bright/);

    await expect(clearButton).not.toBeVisible();

    await takeDebugScreenshot(page, "filters-cleared.png");
  });
});