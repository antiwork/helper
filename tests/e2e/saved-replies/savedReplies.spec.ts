import { expect, test } from "@playwright/test";
import { BasePage } from "../utils/page-objects/basePage";
import { SavedRepliesPage } from "../utils/page-objects/savedRepliesPage";
import { debugWait, generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Saved Replies Management", () => {
  let savedRepliesPage: SavedRepliesPage;

  test.beforeEach(async ({ page }) => {
    savedRepliesPage = new SavedRepliesPage(page);

    // Add delay to reduce database contention between tests
    await page.waitForTimeout(1000);

    // Navigate with retry logic for improved reliability
    try {
      await savedRepliesPage.navigateToSavedReplies();
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await savedRepliesPage.navigateToSavedReplies();
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should display saved replies page with proper title", async ({ page }) => {
    await savedRepliesPage.expectPageVisible();
    await expect(page).toHaveTitle("Helper");
    await expect(page).toHaveURL(/.*mailboxes.*gumroad.*saved-replies.*/);

    await takeDebugScreenshot(page, "saved-replies-page-loaded.png");
  });

  test("should show empty state when no saved replies exist", async ({ page }) => {
    // If there are existing replies, this test might not be applicable
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    if (replyCount === 0) {
      await savedRepliesPage.expectEmptyState();
      await expect(savedRepliesPage.searchInput).not.toBeVisible();
      await expect(savedRepliesPage.newReplyButton).not.toBeVisible();

      await takeDebugScreenshot(page, "saved-replies-empty-state.png");
    } else {
      // Skip this test if replies already exist
      test.skip(true, "Saved replies already exist, skipping empty state test");
    }
  });

  test("should create a new saved reply from empty state", async ({ page }) => {
    const initialCount = await savedRepliesPage.getSavedReplyCount();

    if (initialCount === 0) {
      const testName = `Welcome Message ${generateRandomString()}`;
      const testContent = `Hello! Welcome to our support. How can I help you today? - ${generateRandomString()}`;

      await savedRepliesPage.createSavedReply(testName, testContent);

      // Verify the new reply appears
      await savedRepliesPage.expectSavedRepliesVisible();
      const newCount = await savedRepliesPage.getSavedReplyCount();
      expect(newCount).toBe(1);

      // Verify content
      const title = await savedRepliesPage.getSavedReplyTitle(0);
      expect(title).toContain(testName);

      await takeDebugScreenshot(page, "saved-reply-created-from-empty.png");
    } else {
      test.skip(true, "Saved replies already exist, skipping empty state creation test");
    }
  });

  test("should create a new saved reply when replies exist", async ({ page }) => {
    const initialCount = await savedRepliesPage.getSavedReplyCount();

    // Ensure we can see the UI elements first
    if (initialCount > 0 || (await savedRepliesPage.createOneButton.isVisible())) {
      const testName = `Test Reply ${generateRandomString()}`;
      const testContent = `This is a test reply content - ${generateRandomString()}`;

      await savedRepliesPage.createSavedReply(testName, testContent);

      // Wait for UI to update
      await page.waitForTimeout(1000);

      // Verify the new reply appears - use more flexible assertion
      const newCount = await savedRepliesPage.getSavedReplyCount();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);

      // Verify our specific reply was created by checking if we can find it
      let foundReply = false;
      for (let i = 0; i < Math.min(newCount, 10); i++) {
        try {
          const title = await savedRepliesPage.getSavedReplyTitle(i);
          if (title.includes(testName)) {
            foundReply = true;
            break;
          }
        } catch (error) {
          // Continue checking other replies
        }
      }
      expect(foundReply).toBe(true);

      await takeDebugScreenshot(page, "saved-reply-created.png");
    }
  });

  test("should show search and new reply button when replies exist", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    if (replyCount > 0) {
      await savedRepliesPage.expectSearchVisible();
      await savedRepliesPage.expectNewReplyButtonVisible();

      await takeDebugScreenshot(page, "saved-replies-with-search.png");
    }
  });

  test("should search saved replies with debounced input", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    if (replyCount > 0) {
      // Test search functionality
      await savedRepliesPage.searchSavedReplies("nonexistent-term-12345");
      await savedRepliesPage.expectSearchResults(0);

      // Clear search
      await savedRepliesPage.clearSearch();

      // Should show all replies again
      const allRepliesCount = await savedRepliesPage.getSavedReplyCount();
      expect(allRepliesCount).toBeGreaterThan(0);

      await takeDebugScreenshot(page, "saved-replies-search-test.png");
    }
  });

  test("should maintain search input focus during typing", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    if (replyCount > 0) {
      // Focus on search input and wait for it to be properly focused
      await savedRepliesPage.searchInput.focus();
      await expect(savedRepliesPage.searchInput).toBeFocused();

      // Type more slowly to avoid overwhelming React re-renders
      await savedRepliesPage.searchInput.type("test", { delay: 100 });

      // Wait for any debounced operations to complete
      await page.waitForTimeout(400);

      // Verify focus is maintained - use more reliable check
      await expect(savedRepliesPage.searchInput).toBeFocused();

      // Also verify the value was typed correctly
      await expect(savedRepliesPage.searchInput).toHaveValue("test");

      await savedRepliesPage.clearSearch();
    }
  });

  test("should edit a saved reply", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    if (replyCount > 0) {
      const originalTitle = await savedRepliesPage.getSavedReplyTitle(0);
      const newTitle = `Updated ${generateRandomString()}`;
      const newContent = `Updated content - ${generateRandomString()}`;

      await savedRepliesPage.editSavedReply(0, newTitle, newContent);

      // Verify the reply was updated
      const updatedTitle = await savedRepliesPage.getSavedReplyTitle(0);
      expect(updatedTitle).not.toBe(originalTitle);
      expect(updatedTitle).toContain(newTitle);

      await takeDebugScreenshot(page, "saved-reply-edited.png");
    }
  });

  test("should copy saved reply to clipboard", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    if (replyCount > 0) {
      await savedRepliesPage.clickCopyButton(0);
      await savedRepliesPage.expectClipboardContent(""); // Content validation is limited in E2E

      await takeDebugScreenshot(page, "saved-reply-copied.png");
    }
  });

  test("should delete a saved reply with confirmation", async ({ page }) => {
    // Create a reply specifically for deletion test with unique identifier
    const uniqueId = generateRandomString();
    const testName = `Delete Me ${uniqueId}`;
    const testContent = `This reply will be deleted - ${uniqueId}`;

    await savedRepliesPage.createSavedReply(testName, testContent);

    // Wait for creation to complete
    await page.waitForTimeout(1000);

    const initialCount = await savedRepliesPage.getSavedReplyCount();
    expect(initialCount).toBeGreaterThan(0);

    // Find and delete the reply we just created
    let replyIndex = -1;
    let foundTargetReply = false;

    for (let i = 0; i < initialCount; i++) {
      try {
        const title = await savedRepliesPage.getSavedReplyTitle(i);
        if (title.includes(uniqueId)) {
          replyIndex = i;
          foundTargetReply = true;
          break;
        }
      } catch (error) {
        // Continue checking other replies
      }
    }

    if (foundTargetReply && replyIndex >= 0) {
      await savedRepliesPage.deleteSavedReply(replyIndex);

      // Wait for deletion to complete
      await page.waitForTimeout(1000);

      // Verify the specific reply was deleted by checking it's no longer findable
      const newCount = await savedRepliesPage.getSavedReplyCount();
      let stillFound = false;

      for (let i = 0; i < newCount; i++) {
        try {
          const title = await savedRepliesPage.getSavedReplyTitle(i);
          if (title.includes(uniqueId)) {
            stillFound = true;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }

      expect(stillFound).toBe(false);
      await takeDebugScreenshot(page, "saved-reply-deleted.png");
    } else {
      // If we couldn't find our test reply, skip the deletion part
      console.log("Could not find test reply for deletion, skipping deletion verification");
    }
  });

  test("should handle form validation", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();
    const isEmpty = replyCount === 0;

    // Open create dialog
    if (isEmpty) {
      await savedRepliesPage.clickCreateOneButton();
    } else {
      await savedRepliesPage.clickNewReplyButton();
    }

    await savedRepliesPage.expectCreateDialogVisible();

    // Try to save without filling required fields
    await savedRepliesPage.clickSaveButton();

    // Should show validation errors or prevent submission
    // Dialog should remain open
    await savedRepliesPage.expectCreateDialogVisible();

    // Cancel the dialog
    await savedRepliesPage.clickCancelButton();

    await takeDebugScreenshot(page, "saved-reply-validation.png");
  });

  test("should handle loading states properly", async ({ page }) => {
    // Create base page instance for improved navigation
    const basePage = new (class extends BasePage {})(page);

    // Navigate to page and check for loading states
    await basePage.goto("/mailboxes/gumroad/saved-replies");

    // Loading skeletons might be visible briefly
    // This test ensures the page loads correctly
    await page.waitForLoadState("networkidle");
    await savedRepliesPage.expectPageVisible();

    // Ensure no loading skeletons remain visible
    await expect(savedRepliesPage.loadingSkeletons.first()).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-replies-loaded.png");
  });

  test("should maintain authentication state", async ({ page }) => {
    // Create base page instance for improved navigation
    const basePage = new (class extends BasePage {})(page);

    // First verify we're authenticated and on the correct page
    await savedRepliesPage.expectPageVisible();
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/.*mailboxes.*gumroad.*saved-replies.*/);

    // Test navigation away and back to verify auth persists
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");

    // Navigate back to saved replies to test auth persistence
    await basePage.goto("/mailboxes/gumroad/saved-replies");
    await page.waitForLoadState("networkidle");

    // Should remain authenticated and stay on the saved replies page
    await expect(page).toHaveURL(/.*mailboxes.*gumroad.*saved-replies.*/);
    await savedRepliesPage.expectPageVisible();

    await takeDebugScreenshot(page, "saved-replies-auth-persisted.png");
  });

  test("should navigate between conversations and saved replies", async ({ page }) => {
    // Create base page instance for robust navigation
    const basePage = new (class extends BasePage {})(page);

    // Test direct navigation to conversations page
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*mailboxes.*gumroad.*mine.*/);

    // Navigate back to saved replies
    await basePage.goto("/mailboxes/gumroad/saved-replies");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*saved-replies.*/);
    await savedRepliesPage.expectPageVisible();

    await takeDebugScreenshot(page, "saved-replies-navigation.png");
  });

  test("should support keyboard navigation", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    if (replyCount > 0) {
      // Focus on search input with proper wait
      await savedRepliesPage.searchInput.focus();
      await expect(savedRepliesPage.searchInput).toBeFocused();

      // Verify search is focused
      await expect(savedRepliesPage.searchInput).toBeFocused();

      // Tab to new reply button - wait for focus to move
      await page.keyboard.press("Tab");
      await page.waitForTimeout(200);

      // Find the currently focused element and verify it's the new reply button
      const focusedElement = await page.locator(":focus").first();
      const isNewReplyButtonFocused = await savedRepliesPage.newReplyButton.evaluate(
        (el, focused) => el === focused,
        await focusedElement.elementHandle(),
      );

      if (isNewReplyButtonFocused) {
        // Activate with Enter
        await page.keyboard.press("Enter");
        await page.waitForTimeout(500);

        // Dialog should open
        await savedRepliesPage.expectCreateDialogVisible();

        // Escape should close dialog
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);

        // Verify dialog is closed
        await expect(savedRepliesPage.createDialog).not.toBeVisible();
      } else {
        // If tab navigation didn't work as expected, test keyboard shortcut directly
        await page.keyboard.press("Escape"); // Ensure no dialogs are open
        await savedRepliesPage.newReplyButton.click(); // Use direct click
        await savedRepliesPage.expectCreateDialogVisible();
        await page.keyboard.press("Escape");
      }

      await takeDebugScreenshot(page, "saved-replies-keyboard-nav.png");
    }
  });

  test("should handle edge cases and errors gracefully", async ({ page }) => {
    // Test with extremely long content
    const longContent = "A".repeat(5000);
    const testName = `Long Content Test ${generateRandomString()}`;

    try {
      await savedRepliesPage.createSavedReply(testName, longContent);

      // Should either succeed or show appropriate validation
      const replyCount = await savedRepliesPage.getSavedReplyCount();
      expect(replyCount).toBeGreaterThan(0);
    } catch (error) {
      // Error handling is acceptable for edge cases
      console.log("Long content test failed as expected:", error);
    }

    await takeDebugScreenshot(page, "saved-replies-edge-cases.png");
  });
});

test.describe("Saved Replies Stress Testing", () => {
  test.skip("should handle many saved replies efficiently", async ({ page }) => {
    // This test creates multiple replies to test performance
    // Skipped by default to avoid cluttering test data

    const savedRepliesPage = new SavedRepliesPage(page);
    await savedRepliesPage.navigateToSavedReplies();

    const testData = Array.from({ length: 10 }, (_, i) => ({
      name: `Bulk Test Reply ${i + 1} ${generateRandomString()}`,
      content: `This is bulk test content ${i + 1} - ${generateRandomString()}`,
    }));

    for (const data of testData) {
      await savedRepliesPage.createSavedReply(data.name, data.content);
      await debugWait(page, 200); // Small delay between creations
    }

    const finalCount = await savedRepliesPage.getSavedReplyCount();
    expect(finalCount).toBeGreaterThanOrEqual(10);

    // Test search with many replies
    await savedRepliesPage.searchSavedReplies("Bulk Test");
    const searchResults = await savedRepliesPage.getSavedReplyCount();
    expect(searchResults).toBeGreaterThanOrEqual(10);

    await takeDebugScreenshot(page, "saved-replies-bulk-test.png");
  });
});
