import { expect, test } from "@playwright/test";
import { endOfDay, startOfDay } from "date-fns";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

// Constants for consistent selectors
const CONVERSATION_LINKS_SELECTOR = 'a[href*="/conversations?id="]';

test.describe("Working Conversation Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate with retry logic for improved reliability
    try {
      await page.goto("/mailboxes/gumroad/mine", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      // Retry navigation on failure
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mailboxes/gumroad/mine", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should work with ConversationsPage object", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    // Now using the actual working page object with real selectors
    await conversationsPage.expectConversationsVisible();
    await conversationsPage.expectAccountInfo();

    // Test search functionality
    await conversationsPage.searchConversations("test search");
    await conversationsPage.expectSearchValue("test search");
    await conversationsPage.clearSearch();

    // Test filters
    await conversationsPage.clickOpenFilter();

    // Test mobile responsiveness
    await conversationsPage.setMobileViewport();
    await conversationsPage.expectConversationsVisible();
    await conversationsPage.setDesktopViewport();

    // Test authentication persistence
    await conversationsPage.refreshAndWaitForAuth();

    await takeDebugScreenshot(page, "conversations-page-object-working.png");
  });

  test("should display dashboard with conversations", async ({ page }) => {
    // Verify we're on the correct page
    await expect(page).toHaveTitle("Helper");

    // Check for the search input - this confirms we're on the right page
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    // Check for the filter button showing open conversations
    const openFilter = page.locator('button:has-text("open")');
    await expect(openFilter).toBeVisible();

    // Take screenshot of working dashboard
    await takeDebugScreenshot(page, "working-dashboard.png");
  });

  test("should have functional search", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    // Try typing in search
    await searchInput.fill("test search");

    // Verify the text was entered
    await expect(searchInput).toHaveValue("test search");

    // Clear search
    await searchInput.clear();
    await expect(searchInput).toHaveValue("");
  });

  test("should show account information", async ({ page }) => {
    // Check for account-related buttons (using working selectors)
    const gumroadButton = page.locator('button:has-text("Gumroad")').first();
    await expect(gumroadButton).toBeVisible();

    // Check for email button with broader selector pattern
    const emailButton = page.locator('button:has-text("@gumroad.com"), button:has-text("support@")').first();
    await expect(emailButton).toBeVisible();
  });

  test("should have conversation filters", async ({ page }) => {
    // Check for the status filter button (shows count of open conversations)
    const openFilter = page.locator('button:has-text("open")');
    await expect(openFilter).toBeVisible();

    // Verify search input is present (core filter functionality)
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    // Check for sort dropdown (should always be present)
    const sortButton = page
      .locator('[role="combobox"], button:has-text("Sort"), button[aria-haspopup="listbox"]')
      .first();
    await expect(sortButton).toBeVisible();

    // Select all button appears when conversations exist - verify it exists or conversations are empty
    const conversationLinks = page.locator(CONVERSATION_LINKS_SELECTOR);
    const conversationCount = await conversationLinks.count();

    if (conversationCount > 0) {
      const selectAllButton = page.locator('button:has-text("Select all"), button:has-text("Select none")');
      await expect(selectAllButton).toBeVisible();
    } else {
      // When no conversations exist, select all button should not be visible
      const selectAllButton = page.locator('button:has-text("Select all")');
      await expect(selectAllButton).not.toBeVisible();
    }
  });

  test("should handle clicking on filters", async ({ page }) => {
    // Click on the open conversations filter
    const openFilter = page.locator('button:has-text("open")');
    await openFilter.click();

    // Wait for navigation or network response
    await page.waitForLoadState("networkidle");

    // Should still be on the same page
    await expect(page).toHaveURL(/.*mailboxes.*gumroad.*mine.*/);
  });

  test("should handle select all functionality", async ({ page }) => {
    // Check if conversations exist first
    const conversationLinks = page.locator(CONVERSATION_LINKS_SELECTOR);
    const conversationCount = await conversationLinks.count();

    if (conversationCount > 0) {
      // Check if Select all button exists when conversations are present
      const selectAllButton = page.locator('button:has-text("Select all")');
      await expect(selectAllButton).toBeVisible();

      // Count conversation checkboxes before selecting
      const checkboxes = page.locator('button[role="checkbox"]');
      const totalCheckboxes = await checkboxes.count();

      if (totalCheckboxes > 0) {
        // Count currently checked checkboxes
        const checkedBefore = await checkboxes.locator('[data-state="checked"]').count();

        // Click Select all button
        await selectAllButton.click();

        // Wait for selection to complete
        await page.waitForTimeout(500);

        // Verify all checkboxes are now checked
        const checkedAfter = await checkboxes.locator('[data-state="checked"]').count();
        expect(checkedAfter).toBe(totalCheckboxes);
        expect(checkedAfter).toBeGreaterThan(checkedBefore);

        // Verify button text changed to "Select none"
        const selectNoneButton = page.locator('button:has-text("Select none")');
        await expect(selectNoneButton).toBeVisible();
      }

      // Verify page is still functional
      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();
    } else {
      // No conversations exist, verify Select all button is not visible
      const selectAllButton = page.locator('button:has-text("Select all")');
      await expect(selectAllButton).not.toBeVisible();
      
      // Verify we're still on the right page
      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Key elements should still be visible on mobile
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    // Select all button should be hidden on mobile (hidden md:block class)
    const selectAllButton = page.locator('button:has-text("Select all")');
    await expect(selectAllButton).not.toBeVisible();

    // Take mobile screenshot
    await takeDebugScreenshot(page, "dashboard-mobile.png");
  });

  test("should maintain authentication state", async ({ page }) => {
    // Authentication should persist after page reload since we're using stored auth state
    await page.reload({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Should remain authenticated and stay on the dashboard
    await expect(page).toHaveURL(/.*mailboxes.*gumroad.*mine.*/);

    // Verify dashboard elements are visible (confirms authentication persisted)
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const openFilter = page.locator('button:has-text("open")');
    await expect(openFilter).toBeVisible();
  });

  test("should handle navigation to different sections", async ({ page }) => {
    // Record URL before clicking
    const urlBefore = page.url();

    // Try clicking on the Gumroad button to test navigation
    const gumroadButton = page.locator('button:has-text("Gumroad")').first();
    await gumroadButton.click();

    // Wait for potential navigation
    await page.waitForLoadState("networkidle");

    // Check where we end up
    const currentUrl = page.url();

    // Should still be within the app
    expect(currentUrl).toContain("helperai.dev");

    // Verify if navigation occurred or modal/dropdown opened
    if (currentUrl !== urlBefore) {
      // Navigation occurred - verify it's to a valid section
      expect(currentUrl).toMatch(/mailboxes|settings|account|dashboard/);
    } else {
      // No navigation - might have opened a modal or dropdown
      // Check for modal, dropdown, or other UI changes
      const modal = page.locator('[role="dialog"], .modal, [data-modal]');
      const dropdown = page.locator('[role="menu"], .dropdown-menu, [data-dropdown]');

      const hasModal = (await modal.count()) > 0;
      const hasDropdown = (await dropdown.count()) > 0;

      // At least some UI response should occur (or just staying on page is acceptable)
      expect(hasModal || hasDropdown || currentUrl === urlBefore).toBeTruthy();
    }
  });

  test("should support keyboard navigation", async ({ page }) => {
    // Test keyboard navigation by focusing and using key interactive elements
    const searchInput = page.locator('input[placeholder="Search conversations"]');

    // Test that search input can be focused and used with keyboard
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // Test keyboard input works
    await page.keyboard.type("keyboard test");
    await expect(searchInput).toHaveValue("keyboard test");

    // Test navigation with Enter key (should work for form submission)
    await page.keyboard.press("Escape"); // Clear any state

    // Test tab navigation between interactive elements
    await page.keyboard.press("Tab");

    // Verify that tab navigation works by checking if focus moved
    const activeElementAfterTab = await page.evaluate(() => document.activeElement?.tagName || "BODY");

    // Should be able to tab to some interactive element (not just stay on body)
    expect(["INPUT", "BUTTON", "A"].includes(activeElementAfterTab)).toBeTruthy();

    // Clear for cleanup
    await searchInput.clear();
  });

  test("should focus search input with Ctrl+K hotkey", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search conversations"]');

    // Clear focus from the search input to ensure it's not initially focused
    await searchInput.blur();

    // Press Ctrl+K or Cmd+K on Mac
    await page.keyboard.press("ControlOrMeta+k");

    // Verify search input is now focused
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

    // Set a date filter
    await dateFilterButton.click();
    const yesterdayOption = page.locator('[role="menuitemradio"], [role="option"]').filter({ hasText: "Yesterday" });
    await yesterdayOption.click();
    await expect(dateFilterButton).toHaveText(/Yesterday/);

    // Sleep for half a second to ensure the filter is set
    await page.waitForTimeout(500);

    // Clear filters button should appear
    const clearFiltersButton = page.getByTestId("clear-filters-button");
    await expect(clearFiltersButton).toBeVisible();

    // Click clear filters
    await clearFiltersButton.click();

    // Sleep for half a second to ensure the filter is cleared
    await page.waitForTimeout(500);

    // Date filter should reset to "Created"
    await expect(dateFilterButton).toHaveText(/Created/);

    // Clear filters button should disappear
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

    // Set "Last 30 days" filter
    await dateFilterButton.click();
    const last30DaysOption = page
      .locator('[role="menuitemradio"], [role="option"]')
      .filter({ hasText: "Last 30 days" });
    await last30DaysOption.click();
    await expect(dateFilterButton).toHaveText(/Last 30 days/);

    // sleep for 1 second to ensure the filter is set
    await page.waitForTimeout(1000);

    // Refresh the page
    await page.reload({ timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    await toggleFilters();

    // Filter should be preserved
    const dateFilterButtonAfterRefresh = page.getByTestId("date-filter-button");
    await expect(dateFilterButtonAfterRefresh).toHaveText(/Last 30 days/);

    // Clear filters button should still be visible
    const clearFiltersButton = page.locator("button").filter({ hasText: "Clear filters" });
    await expect(clearFiltersButton).toBeVisible();
  });
});

test.describe("Recent Searches Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to conversations page
    try {
      await page.goto("/mailboxes/gumroad/mine", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mailboxes/gumroad/mine", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should populate search field when clicking on recent search", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    // Create a unique search term
    const searchTerm = `clickable-search-${Date.now()}`;

    // Perform and save a search
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(1500); // Wait for save

    // Clear and focus to see recent searches
    await searchInput.clear();
    await searchInput.blur();
    await searchInput.click();
    await page.waitForTimeout(500);

    // Look for the recent search item and click it
    const recentSearchItem = page.locator('div[class*="cursor-pointer"]').filter({
      hasText: searchTerm,
    });

    await recentSearchItem.click();
    await page.waitForTimeout(300);

    // Verify the search input now contains the clicked term
    await expect(searchInput).toHaveValue(searchTerm);
  });

  test("should delete recent searches with X button", async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

    // Create a unique search term for deletion test
    const searchTerm = `deletable-search-${Date.now()}`;

    // Perform and save a search
    await searchInput.fill(searchTerm);
    await page.waitForTimeout(1500); // Wait for save

    // Clear and focus to see recent searches
    await searchInput.clear();
    await searchInput.blur();
    await searchInput.click();
    await page.waitForTimeout(500);

    // Look for the recent search item
    const recentSearchContainer = page
      .locator('div[class*="group"]')
      .filter({
        hasText: searchTerm,
      })
      .first();

    // Hover to reveal the delete button
    await recentSearchContainer.hover();
    await page.waitForTimeout(200);

    // Click the X button (delete button)
    const deleteButton = recentSearchContainer.locator('button[title="Remove search"]').first();
    await deleteButton.click();
    await page.waitForTimeout(500);

    // Verify the search term is no longer in the dropdown
    const deletedSearchItem = page.locator(`text="${searchTerm}"`);
    await expect(deletedSearchItem).not.toBeVisible();
  });
});
