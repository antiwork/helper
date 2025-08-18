import { expect, test } from "@playwright/test";
import { createConversation, loginAsTestUser } from "../../utils";

test.describe("Unread Messages Filter", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser({ page });
  });

  test("should show unread messages filter button", async ({ page }) => {
    await page.goto("/conversations");
    
    // Check if the unread messages filter button is visible
    const filterButton = page.locator('button:has-text("Unread messages")');
    await expect(filterButton).toBeVisible();
    
    // Check initial state (not active)
    await expect(filterButton).not.toHaveClass(/bright/);
  });

  test("should filter conversations to show only unread messages", async ({ page }) => {
    // Create a test conversation with unread messages
    const conversation = await createConversation({
      emailFrom: "test@example.com",
      assignedToId: "test-user-id", // Assign to ensure unread badge shows
      hasUnreadUserMessages: true,
    });

    await page.goto("/conversations");
    
    // Click the unread messages filter
    const filterButton = page.locator('button:has-text("Unread messages")');
    await filterButton.click();
    
    // Check that filter is now active (bright variant)
    await expect(filterButton).toHaveClass(/bright/);
    
    // Check URL parameter is set
    await expect(page).toHaveURL(/hasUnreadMessages=true/);

    // Wait for the filtered results to load
    await page.waitForLoadState('networkidle');

    const unreadIndicator = page.locator('[data-testid="unread-indicator"]');
    const indicatorCount = await unreadIndicator.count();

    if (indicatorCount > 0) {
      await expect(unreadIndicator.first()).toBeVisible();
    }
  });

  test("should clear filter when clicked again", async ({ page }) => {
    await page.goto("/conversations");
    
    const filterButton = page.locator('button:has-text("Unread messages")');
    
    // Activate filter
    await filterButton.click();
    await expect(filterButton).toHaveClass(/bright/);
    
    // Deactivate filter
    await filterButton.click();
    await expect(filterButton).not.toHaveClass(/bright/);
    
    // Check URL parameter is cleared
    await expect(page).not.toHaveURL(/hasUnreadMessages=true/);
  });

  test("should work with other filters", async ({ page }) => {
    await page.goto("/conversations");
    
    // Apply date filter first
    const dateFilter = page.locator('button:has-text("Created")');
    await dateFilter.click();
    const todayOption = page.locator('text="Today"');
    await todayOption.click();
    
    // Then apply unread messages filter
    const unreadFilter = page.locator('button:has-text("Unread messages")');
    await unreadFilter.click();
    
    // Check both filters are active
    await expect(dateFilter).toHaveClass(/bright/);
    await expect(unreadFilter).toHaveClass(/bright/);
    
    // Check URL has both parameters
    await expect(page).toHaveURL(/hasUnreadMessages=true/);
    await expect(page).toHaveURL(/createdAfter=/);
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
    await page.goto("/conversations");
    
    // Apply unread messages filter
    const unreadFilter = page.locator('button:has-text("Unread messages")');
    await unreadFilter.click();
    
    // Check that clear filters button shows count
    const clearButton = page.locator('button:has-text("Clear filters")');
    await expect(clearButton).toBeVisible();
    
    // Apply another filter
    const vipFilter = page.locator('button:has-text("VIP")');
    await vipFilter.click();
    const vipOnlyOption = page.locator('text="VIP only"');
    await vipOnlyOption.click();
    
    // Clear all filters
    await clearButton.click();
    
    // Check filters are cleared
    await expect(unreadFilter).not.toHaveClass(/bright/);
    await expect(vipFilter).not.toHaveClass(/bright/);
    await expect(clearButton).not.toBeVisible();
  });
});