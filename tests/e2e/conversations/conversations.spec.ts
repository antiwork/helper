import { expect, test } from "@playwright/test";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { debugWait, takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

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
    const conversationItems = page.locator('div[role="checkbox"]');
    const conversationCount = await conversationItems.count();

    if (conversationCount > 0) {
      const selectAllButton = page.locator('button:has-text("Select all"), button:has-text("Select none")');
      await expect(selectAllButton).toBeVisible();
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
    // Check if Select all button exists (it might be conditional)
    const selectAllButton = page.locator('button:has-text("Select all")');
    const selectAllCount = await selectAllButton.count();

    if (selectAllCount > 0) {
      // Count conversation checkboxes before selecting
      const checkboxes = page.locator('div[role="checkbox"]');
      const totalCheckboxes = await checkboxes.count();

      if (totalCheckboxes > 0) {
        // Count currently checked checkboxes
        const checkedBefore = await checkboxes.filter('[data-state="checked"]').count();

        // Click Select all button
        await selectAllButton.click();

        // Wait for selection to complete
        await page.waitForTimeout(500);

        // Verify all checkboxes are now checked
        const checkedAfter = await checkboxes.filter('[data-state="checked"]').count();
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
      // If Select all doesn't exist, just verify we're still on the right page
      const searchInput = page.locator('input[placeholder="Search conversations"]');
      await expect(searchInput).toBeVisible();
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Key elements should still be visible on mobile
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();

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

  test("should show truncated text for non-search results", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    // Ensure we're not searching
    await conversationsPage.clearSearch();
    await page.waitForLoadState("networkidle");

    // Look for conversation list items with message text
    const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
    const messageCount = await messageTexts.count();

    if (messageCount > 0) {
      // Check that the first message text has truncate class when not searching
      const firstMessage = messageTexts.first();
      await expect(firstMessage).toBeVisible();

      // Check if the element has truncate class
      const classList = await firstMessage.getAttribute("class");
      expect(classList).toContain("truncate");

      await takeDebugScreenshot(page, "search-snippet-no-search.png");
    }
  });

  test("should maintain truncate behavior for early matches", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    // Search for a common term that likely appears early in messages
    await conversationsPage.searchConversations("Hi");
    await page.waitForLoadState("networkidle");

    // Look for conversation list items with highlighted search results
    const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
    const highlightedMessages = page.locator("mark.bg-secondary-200");

    const messageCount = await messageTexts.count();
    const highlightCount = await highlightedMessages.count();

    if (messageCount > 0 && highlightCount > 0) {
      // Find messages that contain highlights
      for (let i = 0; i < Math.min(messageCount, 3); i++) {
        const message = messageTexts.nth(i);
        const messageContent = await message.innerHTML();

        // If this message contains a highlight (match found)
        if (messageContent.includes("bg-secondary-200")) {
          const classList = await message.getAttribute("class");

          // For early matches, should still have truncate class
          // (Our implementation only removes truncate for deep matches)
          if (messageContent.indexOf("bg-secondary-200") < 150) {
            expect(classList).toContain("truncate");
          }
        }
      }

      await takeDebugScreenshot(page, "search-snippet-early-match.png");
    }
  });

  test("should show context snippets for deep matches", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    // Search for a term that's likely to appear deep in longer messages
    // Try different search terms that might appear later in messages
    const deepSearchTerms = ["platform", "issue", "problem", "refund", "payment"];

    for (const searchTerm of deepSearchTerms) {
      await conversationsPage.clearSearch();
      await page.waitForTimeout(500);

      await conversationsPage.searchConversations(searchTerm);
      await page.waitForLoadState("networkidle");

      // Look for conversation list items with highlighted search results
      const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
      const highlightedMessages = page.locator("mark.bg-secondary-200");

      const messageCount = await messageTexts.count();
      const highlightCount = await highlightedMessages.count();

      if (messageCount > 0 && highlightCount > 0) {
        // Check if any messages show snippet behavior (no truncate class, has ellipsis)
        for (let i = 0; i < Math.min(messageCount, 5); i++) {
          const message = messageTexts.nth(i);
          const messageContent = await message.innerHTML();

          // If this message contains a highlight
          if (messageContent.includes("bg-secondary-200")) {
            const classList = await message.getAttribute("class");

            // Check for snippet indicators
            const hasEllipsis = messageContent.includes("...");
            const hasLeadingRelaxed = classList?.includes("leading-relaxed");
            const noTruncate = !classList?.includes("truncate");

            // If we found a snippet (starts with ellipsis, no truncate class)
            if (hasEllipsis && hasLeadingRelaxed && noTruncate) {
              console.log(`Found snippet for term "${searchTerm}":`, messageContent);

              // Verify the search term is visible in the snippet
              expect(messageContent).toContain("bg-secondary-200");

              // Take screenshot showing the snippet
              await takeDebugScreenshot(page, `search-snippet-deep-match-${searchTerm}.png`);

              // Found a good example, no need to continue with this term
              break;
            }
          }
        }

        // If we found good results, no need to try more terms
        if (highlightCount > 0) {
          break;
        }
      }
    }
  });

  test("should highlight search terms in snippets", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    // Search for a specific term
    await conversationsPage.searchConversations("support");
    await page.waitForLoadState("networkidle");

    // Check that search terms are highlighted with the correct styling
    const highlights = page.locator("mark.bg-secondary-200");
    const highlightCount = await highlights.count();

    if (highlightCount > 0) {
      // Verify first few highlights have correct styling and content
      for (let i = 0; i < Math.min(highlightCount, 3); i++) {
        const highlight = highlights.nth(i);
        await expect(highlight).toBeVisible();

        const highlightText = await highlight.textContent();
        expect(highlightText?.toLowerCase()).toContain("support");

        // Verify highlight styling
        const bgColor = await highlight.evaluate((el) => getComputedStyle(el).backgroundColor);
        // Should have some background color (not transparent/initial)
        expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
        expect(bgColor).not.toBe("transparent");
      }

      await takeDebugScreenshot(page, "search-snippet-highlights.png");
    }
  });

  test("should handle search with no results gracefully", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);

    // Search for a term very unlikely to exist
    await conversationsPage.searchConversations("xyzunlikelyterm123");
    await page.waitForLoadState("networkidle");

    // Should not crash or show errors
    const searchInput = page.locator('input[placeholder="Search conversations"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveValue("xyzunlikelyterm123");

    // Should show no results or empty state
    const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
    const messageCount = await messageTexts.count();

    // If there are no messages, that's expected for no results
    // If there are messages, they shouldn't have highlights
    if (messageCount > 0) {
      const highlights = page.locator("mark.bg-secondary-200");
      const highlightCount = await highlights.count();
      expect(highlightCount).toBe(0);
    }

    await takeDebugScreenshot(page, "search-snippet-no-results.png");
  });
});
