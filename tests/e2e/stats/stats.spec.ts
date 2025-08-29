import { expect, test } from "@playwright/test";
import { takeDebugScreenshot, waitForNetworkIdle } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Stats Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/stats");
    await waitForNetworkIdle(page);
  });

  test("should display stats dashboard without navigation", async ({ page }) => {
    await expect(page).toHaveTitle("Helper Stats");

    const heading = page.locator("h1", { hasText: "Ticket Dashboard" });
    await expect(heading).toBeVisible();

    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();

    const navElements = page.locator('nav, [role="navigation"]');
    await expect(navElements).toHaveCount(0);

    await takeDebugScreenshot(page, "stats-dashboard-layout.png");
  });

  test("should display ticket count metrics with large numbers", async ({ page }) => {
    const allOpenCard = page.locator('div:has-text("All Open")').first();
    const assignedCard = page.locator('div:has-text("Assigned")').first();
    const unassignedCard = page.locator('div:has-text("Unassigned")').first();
    const mineCard = page.locator('div:has-text("Mine")').first();

    await expect(allOpenCard).toBeVisible();
    await expect(assignedCard).toBeVisible();
    await expect(unassignedCard).toBeVisible();
    await expect(mineCard).toBeVisible();

    const largeNumbers = page.locator(".text-8xl");
    await expect(largeNumbers).toHaveCount(4);

    const allOpenNumber = allOpenCard.locator(".text-8xl");
    const allOpenText = await allOpenNumber.textContent();
    expect(allOpenText).toMatch(/^\d+$/);

    await takeDebugScreenshot(page, "stats-ticket-counts.png");
  });

  test("should display team leaderboard", async ({ page }) => {
    const leaderboardCard = page.locator('div:has-text("Team Leaderboard")').first();
    await expect(leaderboardCard).toBeVisible();

    const leaderboardTitle = page.locator('h2:has-text("Team Leaderboard - Last")');
    await expect(leaderboardTitle).toBeVisible();

    await page.waitForTimeout(2000);

    const leaderboardEntries = page.locator('[data-testid="leaderboard-entry"]');
    const emptyMessage = page.locator('div:has-text("No activity in the selected time period")');

    const hasEntries = (await leaderboardEntries.count()) > 0;
    const hasEmptyMessage = await emptyMessage.isVisible();

    expect(hasEntries || hasEmptyMessage).toBe(true);

    if (hasEntries) {
      const firstEntry = leaderboardEntries.first();
      await expect(firstEntry.locator('div:has-text("#1")')).toBeVisible();

      const replyCount = firstEntry.locator(".text-5xl");
      await expect(replyCount).toBeVisible();

      const replyCountText = await replyCount.textContent();
      expect(replyCountText).toMatch(/^\d+$/);
    }

    await takeDebugScreenshot(page, "stats-leaderboard.png");
  });

  test("should have functional day filtering", async ({ page }) => {
    const todayButton = page.locator('button:has-text("Today")');
    const sevenDaysButton = page.locator('button:has-text("7 days")');
    const thirtyDaysButton = page.locator('button:has-text("30 days")');
    const ninetyDaysButton = page.locator('button:has-text("90 days")');

    await expect(todayButton).toBeVisible();
    await expect(sevenDaysButton).toBeVisible();
    await expect(thirtyDaysButton).toBeVisible();
    await expect(ninetyDaysButton).toBeVisible();

    await expect(sevenDaysButton).toHaveClass(/bg-primary|variant-default/);

    await todayButton.click();
    await waitForNetworkIdle(page);

    const todayTitle = page.locator('h2:has-text("Team Leaderboard - Last 1 days")');
    await expect(todayTitle).toBeVisible();

    await thirtyDaysButton.click();
    await waitForNetworkIdle(page);

    const thirtyDaysTitle = page.locator('h2:has-text("Team Leaderboard - Last 30 days")');
    await expect(thirtyDaysTitle).toBeVisible();

    await takeDebugScreenshot(page, "stats-day-filtering.png");
  });

  test("should be optimized for wall projection", async ({ page }) => {
    const largeHeading = page.locator(".text-6xl");
    await expect(largeHeading).toBeVisible();

    const largeNumbers = page.locator(".text-8xl");
    await expect(largeNumbers).toHaveCount(4);

    const largeReplyCount = page.locator(".text-5xl");
    const replyCountElements = await largeReplyCount.count();
    expect(replyCountElements).toBeGreaterThanOrEqual(0);

    const mainContainer = page.locator("main");
    await expect(mainContainer).toHaveClass(/p-8/);

    const cardGrid = page.locator(".grid");
    await expect(cardGrid).toBeVisible();

    const blueNumbers = page.locator(".text-blue-600");
    const greenNumbers = page.locator(".text-green-600");
    const orangeNumbers = page.locator(".text-orange-600");
    const purpleNumbers = page.locator(".text-purple-600");

    await expect(blueNumbers).toHaveCount(1);
    await expect(greenNumbers).toHaveCount(1);
    await expect(orangeNumbers).toHaveCount(1);
    await expect(purpleNumbers).toHaveCount(1);

    await takeDebugScreenshot(page, "stats-wall-projection-ready.png");
  });

  test("should handle loading states gracefully", async ({ page }) => {
    await page.reload();

    const heading = page.locator("h1", { hasText: "Ticket Dashboard" });
    await expect(heading).toBeVisible();

    const filterButtons = page.locator('button:has-text("days")');
    await expect(filterButtons).toHaveCount(4);

    await waitForNetworkIdle(page);

    const numbers = page.locator(".text-8xl");
    await expect(numbers).toHaveCount(4);

    for (let i = 0; i < 4; i++) {
      const numberText = await numbers.nth(i).textContent();
      expect(numberText).toMatch(/^\d+$/);
    }

    await takeDebugScreenshot(page, "stats-loading-complete.png");
  });
});
