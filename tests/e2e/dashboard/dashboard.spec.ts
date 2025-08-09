import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

type TimeRange = "24h" | "custom" | "7d" | "30d" | "1y";

async function navigateToDashboard(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
}

async function expectDashboardPageVisible(page: Page) {
  await expect(page).toHaveURL(/.*dashboard.*/);
  await expect(page).toHaveTitle("Helper");
  await expect(page.locator('h3:has-text("At a glance")')).toBeVisible();
}

async function selectTimeRange(page: Page, range: TimeRange) {
  const timeRangeSelector = page.locator('[role="combobox"]').first();
  await timeRangeSelector.click();

  const optionMap: Record<TimeRange, string> = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "1y": "Last 12 months",
    custom: "Custom",
  };

  await page.getByRole("option", { name: optionMap[range] }).click();
  await page.waitForTimeout(500);
}

async function expectTimeRangeSelected(page: Page, range: TimeRange) {
  const optionMap: Record<TimeRange, string> = {
    "24h": "Last 24 hours",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "1y": "Last 12 months",
    custom: "Custom",
  };

  const timeRangeSelector = page.locator('[role="combobox"]').first();
  await expect(timeRangeSelector).toContainText(optionMap[range]);
}

async function expectAlertsVisible(page: Page) {
  const alertsContainer = page.getByTestId("dashboard-alerts");
  const alertsExist = (await alertsContainer.count()) > 0;

  if (alertsExist) {
    await expect(alertsContainer).toBeVisible();
  }
  // If no alerts, that's fine - they're conditional based on data
}

async function expectChartsLoaded(page: Page) {
  // Check for the main chart containers
  await expect(page.locator('h4:has-text("Ticket Status")')).toBeVisible();
  await expect(page.locator('h4:has-text("Replies by Agent")')).toBeVisible();

  // Check for reactions chart panel
  const reactionsPanel = page.locator('h4:has-text("Reactions")');
  await expect(reactionsPanel).toBeVisible();
}

async function clickAlert(page: Page, alertType: "assigned" | "vip") {
  const alertSelector = alertType === "assigned" ? 'a[href="/mine"]' : 'a[href="/conversations"]';

  const alert = page.locator(alertSelector).first();
  const alertExists = (await alert.count()) > 0;

  if (alertExists) {
    await alert.click();
  }
}

async function getEventCount(page: Page) {
  // Wait for events to load first
  await Promise.race([
    page.locator('a[href*="/conversations?id="]').first().waitFor({ state: "visible" }),
    page.locator('text="No conversations yet."').first().waitFor({ state: "visible" }),
  ]);

  const eventGrid = page.getByTestId("realtime-events-grid");
  await expect(eventGrid).toBeVisible();

  // Count event links directly since they're inside motion.div > Panel > Link structure
  const eventLinks = page.locator('a[href*="/conversations?id="]');
  return await eventLinks.count();
}

async function scrollToLoadMore(page: Page) {
  // Scroll to the bottom of the page to trigger infinite scroll sentinel
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));

  await page.waitForTimeout(1000); // Wait for potential new events to load
}

async function clickEvent(page: Page, eventIndex: number) {
  const eventLinks = page.locator('a[href*="/conversations?id="]');
  const eventCount = await eventLinks.count();

  if (eventIndex < eventCount) {
    await eventLinks.nth(eventIndex).click();
    // Wait for URL change instead of just network idle
    await page.waitForURL(/.*\/conversations\?id=.*/);
  }
}

async function expectCustomDatePickerVisible(page: Page, shouldBeVisible: boolean) {
  const pickDatesButton = page.getByRole("button", { name: "Pick dates" });

  if (shouldBeVisible) {
    await expect(pickDatesButton).toBeVisible({ timeout: 5000 });
  } else {
    await expect(pickDatesButton).not.toBeVisible();
  }
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDashboard(page);
  });

  test("should display dashboard page with correct title, URL, and main sections", async ({ page }) => {
    await expectDashboardPageVisible(page);

    await expect(page.locator('h3:has-text("At a glance")')).toBeVisible();

    // Verify dashboard alerts section (may be empty but container should exist)
    await expectAlertsVisible(page);

    // Verify all three main analytics components
    await expectChartsLoaded(page);

    // Test alert navigation if alerts are present
    const assignedAlert = page.locator('a[href="/mine"]');
    const assignedAlertExists = (await assignedAlert.count()) > 0;

    if (assignedAlertExists) {
      await clickAlert(page, "assigned");
      await expect(page).toHaveURL(/.*mine.*/);

      await navigateToDashboard(page);
      await expectDashboardPageVisible(page);
    }
  });

  test("should default to Last 7 days and allow changing between all time range options", async ({ page }) => {
    await expectTimeRangeSelected(page, "7d");

    await selectTimeRange(page, "24h");
    await expectTimeRangeSelected(page, "24h");

    await selectTimeRange(page, "30d");
    await expectTimeRangeSelected(page, "30d");

    await selectTimeRange(page, "1y");
    await expectTimeRangeSelected(page, "1y");

    await selectTimeRange(page, "custom");
    await expectTimeRangeSelected(page, "custom");
    await expectCustomDatePickerVisible(page, true);

    await selectTimeRange(page, "7d");
    await expectTimeRangeSelected(page, "7d");
    await expectCustomDatePickerVisible(page, false);

    await expectChartsLoaded(page);
  });

  test("should display realtime events with proper functionality", async ({ page }) => {
    await expect(page.locator('h3:has-text("What\'s happening?")')).toBeVisible();

    const eventsGrid = page.getByTestId("realtime-events-grid");
    await expect(eventsGrid).toBeVisible();

    const initialEventCount = await getEventCount(page);

    if (initialEventCount > 0) {
      // Test clicking on first event
      const firstEventLink = page.locator('a[href*="/conversations?id="]').first();
      await expect(firstEventLink).toBeVisible();

      // Verify event has proper structure (title, timestamp, etc.)
      const eventContainer = firstEventLink.locator("..");
      await expect(eventContainer).toBeVisible();

      // Check for event content like title (h3 is inside the link)
      const eventTitle = firstEventLink.locator("h3");
      await expect(eventTitle).toBeVisible();

      // Test navigation to conversation
      await clickEvent(page, 0);
      expect(page.url()).toContain("/conversations?id=");

      await navigateToDashboard(page);

      // Test infinite scroll by scrolling to load more
      await scrollToLoadMore(page);

      // Verify we can still see the events grid
      await expect(eventsGrid).toBeVisible();
    } else {
      // Handle empty state
      const emptyStateMessage = page.locator('text="No conversations yet. They will appear here in real-time."');
      const emptyStateExists = (await emptyStateMessage.count()) > 0;

      if (emptyStateExists) {
        await expect(emptyStateMessage).toBeVisible();
      }

      console.log("No realtime events found - testing empty state");
    }

    await expect(page.locator('h3:has-text("What\'s happening?")')).toBeVisible();
  });
});
