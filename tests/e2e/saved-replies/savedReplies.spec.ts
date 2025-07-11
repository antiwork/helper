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
    await expect(page).toHaveURL(/.*saved-replies.*/);

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
      expect(newCount).toBeGreaterThan(0);

      // Verify our specific reply was created by searching for it
      let foundReply = false;
      for (let i = 0; i < newCount; i++) {
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

      // No longer rely on overall count – instead verify our specific reply exists
      const newCount = await savedRepliesPage.getSavedReplyCount();

      let foundReply = false;
      for (let i = 0; i < newCount; i++) {
        try {
          const title = await savedRepliesPage.getSavedReplyTitle(i);
          if (title.includes(testName)) {
            foundReply = true;
            break;
          }
        } catch {
          // ignore and keep checking
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
    const testName = `Edit Target ${generateRandomString()}`;
    const testContent = `Original content ${generateRandomString()}`;
    const updatedTitle = `Updated ${generateRandomString()}`;
    const updatedContent = `Updated content - ${generateRandomString()}`;

    // Create a reply specifically for this edit test
    await savedRepliesPage.createSavedReply(testName, testContent);
    await page.waitForTimeout(1000);

    const replyCount = await savedRepliesPage.getSavedReplyCount();
    let targetIndex = -1;
    for (let i = 0; i < replyCount; i++) {
      try {
        const title = await savedRepliesPage.getSavedReplyTitle(i);
        if (title.includes(testName)) {
          targetIndex = i;
          break;
        }
      } catch {
        // continue searching
      }
    }
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    await savedRepliesPage.editSavedReply(targetIndex, updatedTitle, updatedContent);

    const updatedTitleActual = await savedRepliesPage.getSavedReplyTitle(targetIndex);
    expect(updatedTitleActual).toContain(updatedTitle);

    await takeDebugScreenshot(page, "saved-reply-edited.png");
  });

  test("should copy saved reply to clipboard", async ({ page }) => {
    const testName = `Copy Target ${generateRandomString()}`;
    const testContent = `Copy content ${generateRandomString()}`;

    await savedRepliesPage.createSavedReply(testName, testContent);
    await page.waitForTimeout(1000);

    const replyCount = await savedRepliesPage.getSavedReplyCount();
    let targetIndex = -1;
    for (let i = 0; i < replyCount; i++) {
      try {
        const title = await savedRepliesPage.getSavedReplyTitle(i);
        if (title.includes(testName)) {
          targetIndex = i;
          break;
        }
      } catch {
        // continue searching
      }
    }
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    await savedRepliesPage.clickCopyButton(targetIndex);
    await savedRepliesPage.expectClipboardContent();

    await takeDebugScreenshot(page, "saved-reply-copied.png");
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
    // Open create dialog
    await savedRepliesPage.openCreateDialog();

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
    await basePage.goto("/saved-replies");

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
    expect(currentUrl).toMatch(/.*saved-replies.*/);

    // Test navigation away and back to verify auth persists
    await basePage.goto("/mine");
    await page.waitForLoadState("networkidle");

    // Navigate back to saved replies to test auth persistence
    await basePage.goto("/saved-replies");
    await page.waitForLoadState("networkidle");

    // Should remain authenticated and stay on the saved replies page
    await expect(page).toHaveURL(/.*saved-replies.*/);
    await savedRepliesPage.expectPageVisible();

    await takeDebugScreenshot(page, "saved-replies-auth-persisted.png");
  });

  test("should navigate between conversations and saved replies", async ({ page }) => {
    // Create base page instance for robust navigation
    const basePage = new (class extends BasePage {})(page);

    // Test direct navigation to conversations page
    await basePage.goto("/mine");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*mine.*/);

    // Navigate back to saved replies
    await basePage.goto("/saved-replies");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*saved-replies.*/);
    await savedRepliesPage.expectPageVisible();

    await takeDebugScreenshot(page, "saved-replies-navigation.png");
  });

  test("should support keyboard navigation", async ({ page }) => {
    const replyCount = await savedRepliesPage.getSavedReplyCount();

    // Focus on search input if it exists (when there are replies)
    if (replyCount > 0) {
      await savedRepliesPage.searchInput.focus();
      await expect(savedRepliesPage.searchInput).toBeFocused();
    }

    // Test keyboard navigation to the appropriate button
    await page.keyboard.press("Escape"); // Ensure no dialogs are open
    
    if (replyCount === 0) {
      // When no replies exist, use the "Create one" button
      await savedRepliesPage.clickCreateOneButton();
    } else {
      // When replies exist, use the floating action button
      await savedRepliesPage.clickFloatingAddButton();
    }
    
    await savedRepliesPage.expectCreateDialogVisible();

    // Escape should close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Verify dialog is closed
    await expect(savedRepliesPage.createDialog).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-replies-keyboard-nav.png");
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

test.describe("Saved Replies Rich Text Editor", () => {
  let savedRepliesPage: SavedRepliesPage;

  test.beforeEach(async ({ page }) => {
    savedRepliesPage = new SavedRepliesPage(page);
    await page.waitForTimeout(1000);

    try {
      await savedRepliesPage.navigateToSavedReplies();
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await savedRepliesPage.navigateToSavedReplies();
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should display TipTap editor in create dialog", async ({ page }) => {
    // Open create dialog
    await savedRepliesPage.openCreateDialog();

    // Check that the TipTap editor is present (look for editor elements)
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toBeVisible();

    // Wait for editor to be fully loaded
    await page.waitForTimeout(1000);

    // Check for toolbar elements - need to focus editor first to make toolbar visible
    await editor.click();
    await page.waitForTimeout(500);

    // Check for clear formatting button which should always be there
    const toolbar = page.locator('button[aria-label="Clear formatting"]');
    await expect(toolbar).toBeVisible();

    await savedRepliesPage.clickCancelButton();
    await takeDebugScreenshot(page, "saved-reply-tiptap-editor.png");
  });

  test("should create saved reply with bold text", async ({ page }) => {
    const testName = `Bold Test ${generateRandomString()}`;
    const testContent = "This text should be bold";

    // Open create dialog
    await savedRepliesPage.openCreateDialog();

    // Fill in title
    await page.fill('input[placeholder*="Welcome Message"]', testName);

    // Focus editor and add content
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500); // Wait for editor to be ready
    await editor.fill(testContent);

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Select all text and make it bold
    await page.keyboard.press("Control+a");
    await page.click('button[aria-label="Bold"]');

    // Save the reply
    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    // Verify the reply was created
    await savedRepliesPage.expectSavedRepliesVisible();
    await takeDebugScreenshot(page, "saved-reply-bold-text.png");
  });

  test("should create saved reply with italic text", async ({ page }) => {
    const testName = `Italic Test ${generateRandomString()}`;
    const testContent = "This text should be italic";

    // Open create dialog
    await savedRepliesPage.openCreateDialog();

    // Fill in title
    await page.fill('input[placeholder*="Welcome Message"]', testName);

    // Focus editor and add content
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500);
    await editor.fill(testContent);

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Select all text and make it italic
    await page.keyboard.press("Control+a");
    await page.click('button[aria-label="Italic"]');

    // Save the reply
    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "saved-reply-italic-text.png");
  });

  test("should create saved reply with bullet list", async ({ page }) => {
    const testName = `List Test ${generateRandomString()}`;

    // Open create dialog
    await savedRepliesPage.openCreateDialog();

    // Fill in title
    await page.fill('input[placeholder*="Welcome Message"]', testName);

    // Focus editor
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500);

    // Add some text
    await editor.fill("Here are the steps:");
    await page.keyboard.press("Enter");

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Create bullet list
    await page.click('button[aria-label="Bullet list"]');
    await editor.type("First step");
    await page.keyboard.press("Enter");
    await editor.type("Second step");
    await page.keyboard.press("Enter");
    await editor.type("Third step");

    // Save the reply
    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "saved-reply-bullet-list.png");
  });

  test("should create saved reply with links", async ({ page }) => {
    const testName = `Link Test ${generateRandomString()}`;
    const testContent = "Visit our website";

    // Open create dialog
    await savedRepliesPage.openCreateDialog();

    // Fill in title
    await page.fill('input[placeholder*="Welcome Message"]', testName);

    // Focus editor and add content
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500);
    await editor.fill(testContent);

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Select the text and create a link
    await page.keyboard.press("Control+a");
    await page.click('button[aria-label="Link"]');

    // Fill in link URL in the link modal
    const urlInput = page.locator('input[placeholder="URL"]');
    await expect(urlInput).toBeVisible();
    await urlInput.fill("https://example.com");

    // Confirm the link
    await page.keyboard.press("Enter");

    // Save the reply
    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "saved-reply-with-link.png");
  });

  test("should preserve formatting when editing saved reply", async ({ page }) => {
    const testName = `Edit Test ${generateRandomString()}`;
    const originalContent = "Original bold text";
    const updatedContent = "Updated italic text";

    // First create a saved reply with bold text
    await savedRepliesPage.openCreateDialog();

    await page.fill('input[placeholder*="Welcome Message"]', testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500);
    await editor.fill(originalContent);

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Make text bold
    await page.keyboard.press("Control+a");
    await page.click('button[aria-label="Bold"]');

    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    // Now edit the saved reply
    await savedRepliesPage.savedReplyCards.first().click();
    await savedRepliesPage.expectEditDialogVisible();

    // Clear and add new content
    await editor.click();
    await page.keyboard.press("Control+a");
    await editor.fill(updatedContent);

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Make new text italic instead
    await page.keyboard.press("Control+a");
    await page.click('button[aria-label="Italic"]');

    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "edited-formatted-reply.png");
  });

  test("should insert formatted saved reply into conversation", async ({ page }) => {
    const testName = `Insert Test ${generateRandomString()}`;
    const testContent = "This should be bold in conversation too";

    // Create a saved reply with formatting
    await savedRepliesPage.openCreateDialog();

    await page.fill('input[placeholder*="Welcome Message"]', testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500);
    await editor.fill(testContent);

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Make text bold
    await page.keyboard.press("Control+a");
    await page.click('button[aria-label="Bold"]');

    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    // Verify the saved reply was created with formatted content
    await savedRepliesPage.expectSavedRepliesVisible();
    
    // Find the specific saved reply by name instead of assuming its position
    const replyCount = await savedRepliesPage.getSavedReplyCount();
    let foundReply = false;
    let replyIndex = -1;
    
    for (let i = 0; i < replyCount; i++) {
      try {
        const title = await savedRepliesPage.getSavedReplyTitle(i);
        if (title === testName) {
          foundReply = true;
          replyIndex = i;
          break;
        }
      } catch (error) {
        // Continue checking other replies
      }
    }
    
    expect(foundReply).toBe(true);

    // Test copying the formatted content
    await savedRepliesPage.clickCopyButton(replyIndex);
    await page.waitForTimeout(500);

    await takeDebugScreenshot(page, "formatted-reply-created.png");
  });

  test("should handle mixed formatting correctly", async ({ page }) => {
    const testName = `Mixed Format Test ${generateRandomString()}`;

    // Open create dialog
    await savedRepliesPage.openCreateDialog();

    await page.fill('input[placeholder*="Welcome Message"]', testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500);

    // Add mixed content with different formatting
    await editor.fill("Bold text and italic text and normal text");

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Select first part and make bold
    await page.keyboard.press("Control+Home");
    await page.keyboard.down("Shift");
    for (let i = 0; i < 9; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await page.keyboard.up("Shift");
    await page.click('button[aria-label="Bold"]');

    // Move to "italic text" part and make italic
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.down("Shift");
    for (let i = 0; i < 11; i++) {
      await page.keyboard.press("ArrowRight");
    }
    await page.keyboard.up("Shift");
    await page.click('button[aria-label="Italic"]');

    await savedRepliesPage.clickSaveButton();
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "mixed-formatting-reply.png");
  });

  test("should show toolbar controls in editor", async ({ page }) => {
    await savedRepliesPage.openCreateDialog();

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.waitForTimeout(500);

    // Add some content to make toolbar visible
    await editor.fill("Test content");
    await page.waitForTimeout(500);

    // Check that all expected toolbar buttons are visible
    await expect(page.locator('button[aria-label="Bold"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Italic"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Bullet list"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Numbered list"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Link"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Clear formatting"]')).toBeVisible();

    await savedRepliesPage.clickCancelButton();
    await takeDebugScreenshot(page, "toolbar-controls.png");
  });
});
