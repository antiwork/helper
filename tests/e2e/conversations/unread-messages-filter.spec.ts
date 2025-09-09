import { expect, test } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Unread Messages Filter", () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/trpc/lambda/mailbox.conversations.list") && response.status() === 200,
      ),
      page.goto("/mine"),
    ]);

    await page.getByRole("button", { name: "Filter Toggle" }).click();

    // Wait for filter panel to be fully visible and interactive
    await expect(page.getByRole("button", { name: "Unread" })).toBeVisible();
  });

  test("should toggle unread filter on and off", async ({ page }) => {
    const filterButton = page.locator('button:has-text("Unread")');

    await filterButton.click();
    await expect(filterButton).toHaveClass(/bright/);
    await expect(page).toHaveURL(/hasUnreadMessages=true/);

    await page.waitForLoadState("networkidle");

    const unreadBadge = page.locator('[data-testid="unread-messages-badge"]');
    const badgeCount = await unreadBadge.count();

    if (badgeCount > 0) {
      await expect(unreadBadge.first()).toBeVisible();
    }

    await takeDebugScreenshot(page, "unread-filter-active.png");

    await filterButton.click();
    await expect(filterButton).not.toHaveClass(/bright/);
    await expect(page).not.toHaveURL(/hasUnreadMessages=true/);
  });

  test("should work with other filters", async ({ page }) => {
    const dateFilter = page.locator('button[aria-label="Date Filter"]');
    await expect(dateFilter).toBeVisible();
    await dateFilter.click();

    await page.waitForSelector('[role="menuitemradio"]', { state: "visible" });

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
    console.log("Current URL:", currentUrl);

    if (currentUrl.includes("createdAfter=")) {
      await expect(page).toHaveURL(/createdAfter=/);
    } else {
      await expect(dateFilter).toHaveClass(/bright/);
    }
  });

  test("should only show unread elements in mine and assigned views", async ({ page }) => {
    const unreadIndicators = page.locator('[data-testid="unread-indicator"]');
    const indicatorCount = await unreadIndicators.count();

    if (indicatorCount > 0) {
      for (let i = 0; i < indicatorCount; i++) {
        const indicator = unreadIndicators.nth(i);
        await expect(indicator).toBeVisible();
      }
    }

    await page.goto("/all");
    await page.waitForLoadState("domcontentloaded");

    const filterToggleButton = page.locator('button[aria-label="Filter Toggle"]');
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();

    const unreadFilterInAll = page.locator('button:has-text("Unread")');
    await expect(unreadFilterInAll).toHaveCount(0);

    const indicatorsInAll = page.locator('[data-testid="unread-indicator"]');
    await expect(indicatorsInAll).toHaveCount(0);

    await page.goto("/assigned");
    await page.waitForLoadState("domcontentloaded");

    const filterToggleInAssigned = page.locator('button[aria-label="Filter Toggle"]');
    await expect(filterToggleInAssigned).toBeVisible();
    await filterToggleInAssigned.click();

    const unreadFilterInAssigned = page.locator('button:has-text("Unread")');
    await expect(unreadFilterInAssigned).toBeVisible();

    await expect(page).toHaveURL(/\/assigned/);
  });

  test("should update filter count in clear filters button", async ({ page }) => {
    const unreadFilter = page.getByRole("button", { name: "Unread" });
    await unreadFilter.click();

    const filterButton = page.getByRole("button", { name: "Filter Toggle" });
    await expect(filterButton).toHaveText("(1)");

    await page.getByRole("button", { name: "VIP" }).click();
    await expect(page.getByRole("menuitemradio", { name: "All conversations" })).toBeVisible();
    await page.getByRole("menuitemradio", { name: "VIP only" }).click();
    await expect(filterButton).toHaveText("(2)");

    const clearButton = page.getByRole("button", { name: "Clear filters" });
    await clearButton.click();

    await expect(unreadFilter).not.toHaveClass(/bright/);
    await expect(clearButton).not.toBeVisible();

    await takeDebugScreenshot(page, "filters-cleared.png");
  });
});
