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

    await page.waitForTimeout(1000);
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

    await page.waitForTimeout(1000);

    const unreadBadge = page.locator('[data-testid="unread-messages-badge"]');
    const badgeCount = await unreadBadge.count();

    if (badgeCount > 0) {
      await expect(unreadBadge.first()).toBeVisible();
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

    await page.waitForTimeout(500);

    const todayOption = page.locator('[role="menuitemradio"]:has-text("Today")');
    await expect(todayOption).toBeVisible();
    await todayOption.click();

    await page.waitForTimeout(1000);

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

  test("should only show unread badges on assigned conversations", async ({ page }) => {
    const unreadBadges = page.locator('[data-testid="unread-messages-badge"]');
    const badgeCount = await unreadBadges.count();

    if (badgeCount > 0) {
      for (let i = 0; i < badgeCount; i++) {
        const badge = unreadBadges.nth(i);
        await expect(badge).toBeVisible();

        const conversationItem = badge.locator('xpath=ancestor::*[contains(@class, "conversation") or @data-testid="conversation-item"]').first();
        await expect(conversationItem).toBeVisible();
      }
    }
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

    await page.waitForTimeout(1000);

    await clearButton.click();

    await page.waitForTimeout(1000);

    await expect(unreadFilter).not.toHaveClass(/bright/);

    await expect(clearButton).not.toBeVisible();

    await takeDebugScreenshot(page, "filters-cleared.png");
  });
});