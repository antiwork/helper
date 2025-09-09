import { expect, test } from "@playwright/test";
import { endOfDay, startOfDay } from "date-fns";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

const CONVERSATION_LINKS_SELECTOR = 'a[href*="/conversations?id="]';

test.describe("Working Conversation Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mine");
    await page.waitForLoadState("domcontentloaded");
  });

  async function searchConversations(page, value: string) {
    const searchBox = page.getByRole("textbox", { name: "Search conversations" });
    await expect(searchBox).toBeVisible();
    await searchBox.fill(value);
    await page.keyboard.press("Enter");
  }

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

    const searchInput = page.getByRole("textbox", { name: "Search conversations" });
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

        const checkedAfter = await checkboxes.locator('[data-state="checked"]').count();
        expect(checkedAfter).toBe(totalCheckboxes);
        expect(checkedAfter).toBeGreaterThan(checkedBefore);

        const selectNoneButton = page.locator('button:has-text("Select none")');
        await expect(selectNoneButton).toBeVisible();
      }

      const searchInput = page.getByRole("textbox", { name: "Search conversations" });
      await expect(searchInput).toBeVisible();
    } else {
      const selectAllButton = page.locator('button:has-text("Select all")');
      await expect(selectAllButton).not.toBeVisible();

      const searchInput = page.getByRole("textbox", { name: "Search conversations" });
      await expect(searchInput).toBeVisible();
    }
  });

  test("should support keyboard navigation and should focus search with Ctrl+K hotkey", async ({ page }) => {
    const searchInput = page.getByRole("textbox", { name: "Search conversations" });

    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    await page.keyboard.type("keyboard test");
    await expect(searchInput).toHaveValue("keyboard test");

    await page.keyboard.press("Escape");

    await page.keyboard.press("Tab");

    const activeElementAfterTab = await page.evaluate(() => document.activeElement?.tagName || "BODY");

    expect(["INPUT", "BUTTON", "A"].includes(activeElementAfterTab)).toBeTruthy();

    await searchInput.clear();

    await searchInput.blur();

    await page.keyboard.press("ControlOrMeta+k");

    await expect(searchInput).toBeFocused();
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
      }

      // Click the first checkbox normally
      await checkboxes.nth(0).click();

      // Verify first checkbox is selected
      const firstCheckbox = checkboxes.nth(0);
      await expect(firstCheckbox).toHaveAttribute("data-state", "checked");

      // Shift+click on the third checkbox to select range (0, 1, 2)
      await checkboxes.nth(2).click({ modifiers: ["Shift"] });

      // Verify that checkboxes in the range are selected (0, 1, 2)
      for (let i = 0; i <= 2; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Shift+click on the fifth checkbox to expand the selection to (0, 1, 2, 3, 4)
      await checkboxes.nth(4).click({ modifiers: ["Shift"] });

      // Verify that checkboxes in the range are selected (0, 1, 2, 3, 4)
      for (let i = 0; i <= 4; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Verify selection count is displayed
      const selectionText = page.locator("text=/5 selected|All conversations selected/");
      await expect(selectionText).toBeVisible();

      // Shift+click on the second checkbox to shrink the selection to (0, 1)
      await checkboxes.nth(1).click({ modifiers: ["Shift"] });

      // Verify that checkboxes in the range are selected (0, 1)
      for (let i = 0; i <= 1; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Shift+click on the fourth checkbox to expand the selection to (0, 1, 2, 3)
      await checkboxes.nth(3).click({ modifiers: ["Shift"] });

      // Verify that checkboxes in the range are selected (0, 1, 2, 3)
      for (let i = 0; i <= 3; i++) {
        await expect(checkboxes.nth(i)).toHaveAttribute("data-state", "checked");
      }

      // Select all conversations (only if button exists)
      const selectAllButton = page.locator('button:has-text("Select all")');
      if ((await selectAllButton.count()) > 0) {
        await selectAllButton.click();
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
    const filterToggleButton = page.getByRole("button", { name: "Filter Toggle" });
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();

    const dateFilterButton = page.getByRole("button", { name: "Date Filter" });
    await expect(dateFilterButton).toBeVisible();

    // Initially should show "Created" (All time)
    await expect(dateFilterButton).toHaveText(/Created/);

    // Click to open dropdown
    await dateFilterButton.click();

    // Test "Today" preset
    const todayOption = page.locator('[role="menuitemradio"], [role="option"]').filter({ hasText: "Today" });
    await expect(todayOption).toBeVisible();
    await todayOption.click();

    // Button label should change to "Today"
    await expect(dateFilterButton).toHaveText(/Today/);

    // Check the url params for "Today"
    const urlParams = new URL(page.url()).searchParams;
    expect(urlParams.get("createdAfter")).toBe(startOfDay(new Date()).toISOString());
    expect(urlParams.get("createdBefore")).toBe(endOfDay(new Date()).toISOString());
  });

  test("should handle custom date picker", async ({ page }) => {
    const filterToggleButton = page.getByRole("button", { name: "Filter Toggle" });
    await expect(filterToggleButton).toBeVisible();
    await filterToggleButton.click();

    const dateFilterButton = page.getByRole("button", { name: "Date Filter" });
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

    // Test "Back" button
    const backButton = page.locator("button").filter({ hasText: "Back" });
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Should be back to preset options
    const todayOption = page.locator('[role="menuitemradio"], [role="option"]').filter({ hasText: "Today" });
    await expect(todayOption).toBeVisible();
  });

  test("should preserve date filter after page refresh and should clear date filter with clear filters button", async ({
    page,
  }) => {
    const toggleFilters = async () => {
      const filterToggleButton = page.getByRole("button", { name: "Filter Toggle" });
      await expect(filterToggleButton).toBeVisible();
      await filterToggleButton.click();
    };

    await toggleFilters();

    const dateFilterButton = page.getByRole("button", { name: "Date Filter" });
    await expect(dateFilterButton).toBeVisible();

    await dateFilterButton.click();
    const last30DaysOption = page
      .locator('[role="menuitemradio"], [role="option"]')
      .filter({ hasText: "Last 30 days" });
    await last30DaysOption.click();
    await expect(dateFilterButton).toHaveText(/Last 30 days/);

    await page.reload();

    const dateFilterButtonAfterRefresh = page.getByRole("button", { name: "Date Filter" });
    await expect(dateFilterButton).toBeVisible();

    await expect(dateFilterButtonAfterRefresh).toHaveText(/Last 30 days/);
    const clearFiltersButton = page.getByRole("button", { name: "Clear Filters" });
    await expect(clearFiltersButton).toBeVisible();

    await clearFiltersButton.click();

    await expect(dateFilterButton).toHaveText(/Created/);
    await expect(clearFiltersButton).not.toBeVisible();
  });

  test("should show context snippets and highlight search terms for deep matches", async ({ page }) => {
    await searchConversations(page, "support");

    const messageTexts = page.locator("p.text-muted-foreground.max-w-4xl.text-xs");
    const highlights = page.locator("mark.bg-secondary-200");

    const messageCount = await messageTexts.count();
    const highlightCount = await highlights.count();

    // Test context snippets for deep matches
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

    // Test search term highlighting
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
});
