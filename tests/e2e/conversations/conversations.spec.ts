import { expect, test } from "@playwright/test";
import { endOfDay, startOfDay } from "date-fns";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

const CONVERSATION_LINKS_SELECTOR = 'a[href*="/conversations?id="]';

test.describe("Working Conversation Management", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/mine", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mine", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should work with ConversationsPage object", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    await conversationsPage.expectConversationsVisible();
    await conversationsPage.expectAccountInfo();

    await conversationsPage.searchConversations("test search");
    await conversationsPage.expectSearchValue("test search");
    await conversationsPage.clearSearch();

    await conversationsPage.clickOpenFilter();

    await conversationsPage.setMobileViewport();
    await conversationsPage.expectConversationsVisible();
    await conversationsPage.setDesktopViewport();

    await conversationsPage.refreshAndWaitForAuth();

    await takeDebugScreenshot(page, "conversations-page-object-working.png");
  });

  test("should display dashboard with conversations", async ({ page }) => {
    await expect(page).toHaveTitle("Helper");

    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    const openFilter = page.locator('button:has-text("open")');
    await expect(openFilter).toBeVisible();

    await takeDebugScreenshot(page, "working-dashboard.png");
  });

  test("should have functional search", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill("test search");

    await expect(searchInput).toHaveValue("test search");

    await searchInput.clear();
    await expect(searchInput).toHaveValue("");
  });

  test("should show account information", async ({ page }) => {
    const gumroadButton = page.locator('button:has-text("Gumroad")').first();
    await expect(gumroadButton).toBeVisible();

    const emailButton = page.locator('button:has-text("@gumroad.com"), button:has-text("support@")').first();
    await expect(emailButton).toBeVisible();
  });

  test("should have conversation filters", async ({ page }) => {
    // Check for the status filter button (shows count of open conversations)
    const openFilter = page.locator('button:has-text("open")');
    await expect(openFilter).toBeVisible();

    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    const sortButton = page
      .locator('[role="combobox"], button:has-text("Sort"), button[aria-haspopup="listbox"]')
      .first();
    await expect(sortButton).toBeVisible();

    const conversationLinks = page.locator(CONVERSATION_LINKS_SELECTOR);
    const conversationCount = await conversationLinks.count();

    if (conversationCount > 0) {
      const selectAllButton = page.locator('button:has-text("Select all"), button:has-text("Select none")');
      await expect(selectAllButton).toBeVisible();
    } else {
      const selectAllButton = page.locator('button:has-text("Select all")');
      await expect(selectAllButton).not.toBeVisible();
    }
  });

  test("should handle clicking on filters", async ({ page }) => {
    const openFilter = page.locator('button:has-text("open")');
    await openFilter.click();

    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/.*mine.*/);
  });

  test("should handle select all functionality", async ({ page }) => {
    const conversationLinks = page.locator(CONVERSATION_LINKS_SELECTOR);
    const conversationCount = await conversationLinks.count();

    if (conversationCount > 0) {
      const selectAllButton = page.locator('button:has-text("Select all")');
      await expect(selectAllButton).toBeVisible();

      const checkboxes = page.locator('button[role="checkbox"]');
      const totalCheckboxes = await checkboxes.count();

      if (totalCheckboxes > 0) {
        const checkedBefore = await checkboxes.locator('[data-state="checked"]').count();

        await selectAllButton.click();

        await page.waitForTimeout(500);

        const checkedAfter = await checkboxes.locator('[data-state="checked"]').count();
        expect(checkedAfter).toBe(totalCheckboxes);
        expect(checkedAfter).toBeGreaterThan(checkedBefore);

        const selectNoneButton = page.locator('button:has-text("Select none")');
        await expect(selectNoneButton).toBeVisible();
      }

      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();
    } else {
      const selectAllButton = page.locator('button:has-text("Select all")');
      await expect(selectAllButton).not.toBeVisible();

      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    const selectAllButton = page.locator('button:has-text("Select all")');
    await expect(selectAllButton).not.toBeVisible();

    await takeDebugScreenshot(page, "dashboard-mobile.png");
  });

  test("should maintain authentication state", async ({ page }) => {
    await page.reload({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    await expect(page).toHaveURL(/.*mine.*/);

    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const openFilter = page.locator('button:has-text("open")');
    await expect(openFilter).toBeVisible();
  });

  test("should support keyboard navigation", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search conversations"]');

    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    await page.keyboard.type("keyboard test");
    await expect(searchInput).toHaveValue("keyboard test");

    await page.keyboard.press("Escape");

    await page.keyboard.press("Tab");

    const activeElementAfterTab = await page.evaluate(() => document.activeElement?.tagName || "BODY");

    expect(["INPUT", "BUTTON", "A"].includes(activeElementAfterTab)).toBeTruthy();

    await searchInput.clear();
  });

  test("should focus search input with Ctrl+K hotkey", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search conversations"]');

    await searchInput.blur();

    await page.keyboard.press("ControlOrMeta+k");

    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute("placeholder"));
    expect(focusedElement).toBe("Search conversations");
  });

  test("should support shift-click for range selection", async ({ page }) => {
    // Check if there are multiple conversation checkboxes to test with
    const checkboxes = page.locator('button[role="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount >= 5) {
      // Clear any existing selections first
      const selectNoneButton = page.locator('button:has-text("Select none")');
      if ((await selectNoneButton.count()) > 0) {
        await selectNoneButton.click();
        await page.waitForTimeout(300);
      }

      // Click the first checkbox normally
      await checkboxes.nth(0).click();
      await page.waitForTimeout(200);

      // Verify first checkbox is selected
      const firstCheckbox = checkboxes.nth(0);
      await expect(firstCheckbox).toHaveAttribute("data-state", "checked");

      // Shift+click on the third checkbox to select range (0, 1, 2)
      await checkboxes.nth(2).click({ modifiers: ["Shift"] });
      await page.waitForTimeout(300);

      // Verify that checkboxes in the range are selected (0, 1, 2)
      for (let i = 0; i <= 2; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Shift+click on the fifth checkbox to expand the selection to (0, 1, 2, 3, 4)
      await checkboxes.nth(4).click({ modifiers: ["Shift"] });
      await page.waitForTimeout(300);

      // Verify that checkboxes in the range are selected (0, 1, 2, 3, 4)
      for (let i = 0; i <= 4; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Verify selection count is displayed
      const selectionText = page.locator("text=/5 selected|All conversations selected/");
      await expect(selectionText).toBeVisible();

      // Shift+click on the second checkbox to shrink the selection to (0, 1)
      await checkboxes.nth(1).click({ modifiers: ["Shift"] });
      await page.waitForTimeout(300);

      // Verify that checkboxes in the range are selected (0, 1)
      for (let i = 0; i <= 1; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Shift+click on the fourth checkbox to expand the selection to (0, 1, 2, 3)
      await checkboxes.nth(3).click({ modifiers: ["Shift"] });
      await page.waitForTimeout(300);

      // Verify that checkboxes in the range are selected (0, 1, 2, 3)
      for (let i = 0; i <= 3; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Select all conversations (only if button exists)
      const selectAllButton = page.locator('button:has-text("Select all")');
      if ((await selectAllButton.count()) > 0) {
        await selectAllButton.click();
        await page.waitForTimeout(300);
      }

      // Verify that all checkboxes are selected
      for (let i = 0; i < checkboxCount; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }
    } else {
      // If not enough conversations, log a warning
      console.warn("Not enough conversations to test shift-click selection");
    }
  });

  test("should handle date filter presets", async ({ page }) => {
    const filterToggleButton = page.getByTestId("filter-toggle");
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();

    const dateFilterButton = page.getByTestId("date-filter-button");
    await expect(dateFilterButton).toBeVisible();

    // Initially should show "Created" (All time)
    await expect(dateFilterButton).toHaveText(/Created/);

    // Click to open dropdown
    await dateFilterButton.click();

    // Test "Today" preset
    const todayOption = page.locator('[role="menuitemradio"], [role="option"]').filter({ hasText: "Today" });
    await expect(todayOption).toBeVisible();
    await todayOption.click();

    // Sleep for half a second to ensure the filter is set
    await page.waitForTimeout(500);

    // Button label should change to "Today"
    await expect(dateFilterButton).toHaveText(/Today/);

    // Check the url params for "Today"
    const urlParams = new URL(page.url()).searchParams;
    expect(urlParams.get("createdAfter")).toBe(startOfDay(new Date()).toISOString());
    expect(urlParams.get("createdBefore")).toBe(endOfDay(new Date()).toISOString());
  });

  test("should handle custom date picker", async ({ page }) => {
    const filterToggleButton = page.getByTestId("filter-toggle");
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();

    const dateFilterButton = page.getByTestId("date-filter-button");
    await expect(dateFilterButton).toBeVisible();

    // Open date filter dropdown
    await dateFilterButton.click();

    // Click "Custom" option
    const customOption = page.locator('[role="menuitemradio"], [role="option"]').filter({ hasText: "Custom" });
    await customOption.click();

    // Calendar should be visible
    const calendar = page.locator('table[aria-multiselectable="true"]').first();
    await expect(calendar).toBeVisible();

    // Click on a date (try to click on day 15 of current month)
    const dayButton = page.locator('table[aria-multiselectable="true"] button[aria-label*="15"]').first();
    await dayButton.click();

    // Sleep for half a second to ensure the date is selected
    await page.waitForTimeout(500);

    // Button label should show the selected date
    await expect(dateFilterButton).toContainText("15");

    // Test "Back" button
    const backButton = page.locator("button").filter({ hasText: "Back" });
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should be back to preset options
    const todayOption = page.locator('[role="menuitemradio"], [role="option"]').filter({ hasText: "Today" });
    await expect(todayOption).toBeVisible();
  });

  test("should clear date filter with clear filters button", async ({ page }) => {
    const filterToggleButton = page.getByTestId("filter-toggle");
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();

    const dateFilterButton = page.getByTestId("date-filter-button");
    await expect(dateFilterButton).toBeVisible();

    await dateFilterButton.click();
    const yesterdayOption = page.locator('[role="menuitemradio"], [role="option"]').filter({ hasText: "Yesterday" });
    await yesterdayOption.click();
    await expect(dateFilterButton).toHaveText(/Yesterday/);

    await page.waitForTimeout(500);

    const clearFiltersButton = page.getByTestId("clear-filters-button");
    await expect(clearFiltersButton).toBeVisible();

    await clearFiltersButton.click();

    await page.waitForTimeout(500);

    await expect(dateFilterButton).toHaveText(/Created/);
    await expect(clearFiltersButton).not.toBeVisible();
  });

  test("should preserve date filter after page refresh", async ({ page }) => {
    const toggleFilters = async () => {
      const filterToggleButton = page.getByTestId("filter-toggle");
      await expect(filterToggleButton).toBeVisible();
      await filterToggleButton.click();
    };

    await toggleFilters();

    const dateFilterButton = page.getByTestId("date-filter-button");
    await expect(dateFilterButton).toBeVisible();

    await dateFilterButton.click();
    const last30DaysOption = page
      .locator('[role="menuitemradio"], [role="option"]')
      .filter({ hasText: "Last 30 days" });
    await last30DaysOption.click();
    await expect(dateFilterButton).toHaveText(/Last 30 days/);

    await page.waitForTimeout(1000);

    await page.reload({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    await toggleFilters();

    const dateFilterButtonAfterRefresh = page.getByTestId("date-filter-button");
    await expect(dateFilterButtonAfterRefresh).toHaveText(/Last 30 days/);
    const clearFiltersButton = page.locator("button").filter({ hasText: "Clear filters" });
    await expect(clearFiltersButton).toBeVisible();
  });

  test("should show truncated text for non-search results", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    await conversationsPage.clearSearch();
    await page.waitForLoadState("networkidle");

    const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
    const messageCount = await messageTexts.count();

    if (messageCount > 0) {
      const firstMessage = messageTexts.first();
      await expect(firstMessage).toBeVisible();

      const classList = await firstMessage.getAttribute("class");
      expect(classList).toContain("truncate");

      await takeDebugScreenshot(page, "search-snippet-no-search.png");
    }
  });

  test("should always use truncate class with search snippets", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    await conversationsPage.searchConversations("support");
    await page.waitForLoadState("networkidle");

    const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
    const messageCount = await messageTexts.count();

    if (messageCount > 0) {
      for (let i = 0; i < Math.min(messageCount, 3); i++) {
        const message = messageTexts.nth(i);
        const classList = await message.getAttribute("class");
        expect(classList).toContain("truncate");
      }

      await takeDebugScreenshot(page, "search-snippet-with-truncate.png");
    }
  });

  test("should show context snippets for deep matches", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    await conversationsPage.searchConversations("support");
    await page.waitForLoadState("networkidle");

    const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
    const highlightedMessages = page.locator("mark.bg-secondary-200");

    const messageCount = await messageTexts.count();
    const highlightCount = await highlightedMessages.count();

    if (messageCount > 0 && highlightCount > 0) {
      for (let i = 0; i < Math.min(messageCount, 3); i++) {
        const message = messageTexts.nth(i);
        const messageText = await message.textContent();

        if (messageText?.startsWith("...")) {
          const messageContent = await message.innerHTML();
          expect(messageContent).toContain("bg-secondary-200");

          const classList = await message.getAttribute("class");
          expect(classList).toContain("truncate");

          await takeDebugScreenshot(page, "search-snippet-deep-match.png");
          break;
        }
      }
    }
  });

  test("should highlight search terms in snippets", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    await conversationsPage.searchConversations("support");
    await page.waitForLoadState("networkidle");

    const highlights = page.locator("mark.bg-secondary-200");
    const highlightCount = await highlights.count();

    if (highlightCount > 0) {
      const firstHighlight = highlights.first();
      await expect(firstHighlight).toBeVisible();

      const highlightText = await firstHighlight.textContent();
      expect(highlightText?.toLowerCase()).toContain("support");

      const bgColor = await firstHighlight.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
      expect(bgColor).not.toBe("transparent");

      await takeDebugScreenshot(page, "search-snippet-highlights.png");
    }
  });

  test("should handle search with no results gracefully", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    await conversationsPage.searchConversations("xyzunlikelyterm123");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue("xyzunlikelyterm123");

    const highlights = page.locator("mark.bg-secondary-200");
    const highlightCount = await highlights.count();
    expect(highlightCount).toBe(0);

    await takeDebugScreenshot(page, "search-snippet-no-results.png");
  });
});
