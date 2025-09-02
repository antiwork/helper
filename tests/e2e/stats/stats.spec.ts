import { expect, test } from "@playwright/test";
import { takeDebugScreenshot, waitForNetworkIdle } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Stats Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/stats");
    await waitForNetworkIdle(page);
  });

  test("should display stats dashboard without navigation", async ({ page }) => {
    const timeframeDisplay = page.getByTestId("timeframe-label");
    await expect(timeframeDisplay).toBeVisible();

    await expect(timeframeDisplay).toHaveText("This week");

    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).not.toBeVisible();

    const navElements = page.locator('nav, [role="navigation"]');
    await expect(navElements).toHaveCount(0);

    await takeDebugScreenshot(page, "stats-dashboard-layout.png");
  });

  test("should display metrics optimized for wall projection", async ({ page }) => {
    const allOpenCard = page.getByTestId("metric-card-all-open");
    const assignedCard = page.getByTestId("metric-card-assigned");
    const unassignedCard = page.getByTestId("metric-card-unassigned");
    const mineCard = page.getByTestId("metric-card-mine");

    await expect(allOpenCard).toBeVisible();
    await expect(assignedCard).toBeVisible();
    await expect(unassignedCard).toBeVisible();
    await expect(mineCard).toBeVisible();

    await expect(allOpenCard.getByText("All Open")).toBeVisible();
    await expect(assignedCard.getByText("Assigned")).toBeVisible();
    await expect(unassignedCard.getByText("Unassigned")).toBeVisible();
    await expect(mineCard.getByText("Mine")).toBeVisible();

    const largeNumbers = page.locator('[data-testid^="metric-value-"]');
    await expect(largeNumbers).toHaveCount(4);

    const allOpenValue = page.getByTestId("metric-value-all-open");
    const assignedValue = page.getByTestId("metric-value-assigned");
    const unassignedValue = page.getByTestId("metric-value-unassigned");
    const mineValue = page.getByTestId("metric-value-mine");

    await expect(allOpenValue).toBeVisible();
    await expect(assignedValue).toBeVisible();
    await expect(unassignedValue).toBeVisible();
    await expect(mineValue).toBeVisible();

    const allOpenText = await allOpenValue.textContent();
    expect(allOpenText).toMatch(/^\d+$/);

    const largeTimeframe = page.getByTestId("timeframe-label");
    await expect(largeTimeframe).toBeVisible();

    const leaderboardSection = page.getByTestId("leaderboard-section");
    await expect(leaderboardSection).toBeVisible();

    await takeDebugScreenshot(page, "stats-wall-projection.png");
  });

  test("should display team leaderboard", async ({ page }) => {
    const leaderboardEntries = page.locator('[data-testid="leaderboard-entry"]');

    const supportEmailEntry = leaderboardEntries.filter({ hasText: "support@gumroad.com" });
    await expect(supportEmailEntry).toBeVisible();

    await takeDebugScreenshot(page, "stats-leaderboard.png");
  });

  test("should have functional day filtering", async ({ page }) => {
    const timeframeDisplay = page.getByTestId("timeframe-label");

    await expect(timeframeDisplay).toHaveText("This week");

    await timeframeDisplay.hover();

    const todayOption = page.getByRole("button", { name: "Today" });
    const weekOption = page.getByRole("button", { name: "This week" });
    const monthOption = page.getByRole("button", { name: "This month" });
    const threeMonthsOption = page.getByRole("button", { name: "Three months" });

    await expect(todayOption).toBeVisible();
    await expect(weekOption).toBeVisible();
    await expect(monthOption).toBeVisible();
    await expect(threeMonthsOption).toBeVisible();

    await todayOption.click();
    await waitForNetworkIdle(page);
    await expect(timeframeDisplay).toHaveText("Today");

    await timeframeDisplay.hover();
    await monthOption.click();
    await waitForNetworkIdle(page);
    await expect(timeframeDisplay).toHaveText("This month");

    await takeDebugScreenshot(page, "stats-day-filtering.png");
  });
});
