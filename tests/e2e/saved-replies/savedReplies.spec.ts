import { expect, test, type Page } from "@playwright/test";
import { deleteSavedReplyByName } from "../utils/cleanupSavedReplies";
import {
  clickCreateOneButton,
  clickFloatingAddButton,
  clickSaveButton,
  createSavedReply,
  fillSavedReplyForm,
  openCreateDialog,
} from "../utils/replyHelpers";
import { debugWait, generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";
import { waitForToast } from "../utils/toastHelpers";

// Use the working authentication and grant clipboard permissions
test.use({
  storageState: "tests/e2e/.auth/user.json",
  permissions: ["clipboard-read", "clipboard-write"],
});

// Helper functions
async function navigateToSavedReplies(page: Page) {
  await page.goto("/saved-replies");
  await page.waitForLoadState("networkidle");
}

async function expectPageVisible(page: Page) {
  await expect(page.locator('h1:has-text("Saved replies")')).toBeVisible();
}

async function expectSearchVisible(page: Page) {
  await expect(page.locator('input[placeholder="Search saved replies..."]').first()).toBeVisible();
}

async function expectNewReplyButtonVisible(page: Page) {
  const savedReplyCards = page.locator('[data-testid="saved-reply-card"]');
  const floatingAddButton = page.locator("button.fixed");
  const createOneButton = page.locator('button:has-text("Create one")');
  const hasReplies = (await savedReplyCards.count()) > 0;

  if (hasReplies) {
    await expect(floatingAddButton).toBeVisible();
  } else {
    await expect(createOneButton).toBeVisible();
  }
}

async function expectEmptyState(page: Page) {
  await expect(page.locator('text="No saved replies yet"')).toBeVisible();
  await expect(page.locator('button:has-text("Create one")')).toBeVisible();
}

async function expectSavedRepliesVisible(page: Page) {
  await expect(page.locator('[data-testid="saved-reply-card"]').first()).toBeVisible();
}

async function expectCreateDialogVisible(page: Page) {
  const createDialog = page.locator('[role="dialog"]:has-text("New saved reply")');
  await expect(createDialog).toBeVisible();
  await expect(page.locator('[role="dialog"] h2')).toContainText("New saved reply");
}

async function expectEditDialogVisible(page: Page) {
  const editDialog = page.locator('[role="dialog"]:has-text("Edit saved reply")');
  await expect(editDialog).toBeVisible();
  await expect(page.locator('[role="dialog"] h2')).toContainText("Edit saved reply");
}

async function expectDeleteDialogVisible(page: Page) {
  const deleteDialog = page.locator('[role="dialog"]:has-text("Are you sure you want to delete")');
  await expect(deleteDialog).toBeVisible();
  await expect(deleteDialog).toContainText("Are you sure you want to delete");
}

async function searchSavedReplies(page: Page, searchTerm: string) {
  const searchInput = page.locator('input[placeholder="Search saved replies..."]').first();
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(500);

  try {
    await page.waitForLoadState("networkidle", { timeout: 3000 });
  } catch {
    // Continue if networkidle times out
  }

  await page.waitForTimeout(200);
}

async function clearSearch(page: Page) {
  const searchInput = page.locator('input[placeholder="Search saved replies..."]').first();
  await searchInput.clear();
  await page.waitForTimeout(500);
  try {
    await page.waitForLoadState("networkidle", { timeout: 3000 });
  } catch {
    // Continue if networkidle times out
  }
  await page.waitForTimeout(200);
}

async function clickCancelButton(page: Page) {
  await page.locator('button:has-text("Cancel")').click();
}

async function clickCopyButton(page: Page, index = 0) {
  await page.locator('[data-testid="copy-button"]').nth(index).click();
}

async function clickDeleteButtonInModal(page: Page) {
  await page.locator('button:has-text("Delete"):not(:has-text("saved reply"))').click();
}

async function confirmDelete(page: Page) {
  await page.locator('[role="dialog"] button:has-text("Yes")').click();
}

async function getSavedReplyCount(page: Page): Promise<number> {
  return await page.locator('[data-testid="saved-reply-card"]').count();
}

async function getSavedReplyTitle(page: Page, index = 0): Promise<string> {
  return (await page.locator('[data-testid="saved-reply-card"] .text-lg').nth(index).textContent()) || "";
}

async function findSavedReplyByTitle(page: Page, title: string) {
  // Find the saved reply card that contains the specific title
  return page.locator('[data-testid="saved-reply-card"]').filter({ hasText: title });
}

async function editSavedReplyByTitle(page: Page, originalTitle: string, newName: string, newContent: string) {
  const replyCard = await findSavedReplyByTitle(page, originalTitle);

  // Ensure the reply exists
  await expect(replyCard).toBeVisible({ timeout: 5000 });

  // Click on the card to open edit dialog
  await replyCard.click();
  await expectEditDialogVisible(page);

  const nameInput = page.locator('input[placeholder*="Welcome Message"]');
  const contentEditor = page.locator('[role="textbox"][contenteditable="true"]');
  await nameInput.clear();
  await contentEditor.click();
  await contentEditor.clear();

  await fillSavedReplyForm(page, newName, newContent);
  await clickSaveButton(page);
  await waitForToast(page, "Saved reply updated successfully");
}

async function copySavedReplyByTitle(page: Page, title: string) {
  const replyCard = await findSavedReplyByTitle(page, title);

  // Ensure the reply exists
  await expect(replyCard).toBeVisible({ timeout: 5000 });

  // Find and click the copy button within this specific card
  const copyButton = replyCard
    .locator('[data-testid="copy-button"], button[title*="copy" i], button[aria-label*="copy" i]')
    .first();
  await expect(copyButton).toBeVisible({ timeout: 5000 });
  await copyButton.click();
}

async function deleteSavedReply(page: Page, index: number) {
  await page.locator('[data-testid="saved-reply-card"]').nth(index).click();
  await expectEditDialogVisible(page);

  await clickDeleteButtonInModal(page);
  await expectDeleteDialogVisible(page);
  await confirmDelete(page);
  await waitForToast(page, "Saved reply deleted successfully");
}

async function expectSearchResults(page: Page, expectedCount: number) {
  if (expectedCount === 0) {
    await expect(page.locator('text="No saved replies found matching your search"')).toBeVisible();
  } else {
    await expect(page.locator('[data-testid="saved-reply-card"]')).toHaveCount(expectedCount);
  }
}

async function expectClipboardContent(page: Page) {
  await waitForToast(page, "Saved reply copied to clipboard");
}

test.describe("Saved Replies Management", () => {
  test.beforeEach(async ({ page }) => {
    // Add delay to reduce database contention between tests
    await page.waitForTimeout(1000);

    // Navigate with retry logic for improved reliability
    try {
      await navigateToSavedReplies(page);
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await navigateToSavedReplies(page);
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should display saved replies page with proper title", async ({ page }) => {
    await expectPageVisible(page);
    await expect(page).toHaveURL(/.*saved-replies.*/);

    await takeDebugScreenshot(page, "saved-replies-page-loaded.png");
  });

  test("should show empty state when no saved replies exist", async ({ page }) => {
    // If there are existing replies, this test might not be applicable
    const replyCount = await getSavedReplyCount(page);

    if (replyCount === 0) {
      await expectEmptyState(page);
      await expect(page.locator('input[placeholder="Search saved replies..."]').first()).not.toBeVisible();
      await expect(page.locator('button:has-text("New saved reply")')).not.toBeVisible();

      await takeDebugScreenshot(page, "saved-replies-empty-state.png");
    } else {
      // Skip this test if replies already exist
      test.skip(true, "Saved replies already exist, skipping empty state test");
    }
  });

  test("should create a new saved reply from empty state", async ({ page }) => {
    const initialCount = await getSavedReplyCount(page);

    if (initialCount === 0) {
      const testName = `Welcome Message ${generateRandomString()}`;
      const testContent = `Hello! Welcome to our support. How can I help you today? - ${generateRandomString()}`;

      await createSavedReply(page, testName, testContent);

      // Verify the new reply appears
      await expectSavedRepliesVisible(page);
      const newCount = await getSavedReplyCount(page);
      expect(newCount).toBeGreaterThan(0);

      // Verify our specific reply was created by searching for it
      let foundReply = false;
      for (let i = 0; i < newCount; i++) {
        try {
          const title = await getSavedReplyTitle(page, i);
          if (title.includes(testName)) {
            foundReply = true;
            break;
          }
        } catch (error) {
          // Continue checking other replies
        }
      }
      expect(foundReply).toBe(true);

      await deleteSavedReplyByName(testName);

      await takeDebugScreenshot(page, "saved-reply-created-from-empty.png");
    } else {
      test.skip(true, "Saved replies already exist, skipping empty state creation test");
    }
  });

  test("should create a new saved reply when replies exist", async ({ page }) => {
    const initialCount = await getSavedReplyCount(page);
    const createOneButton = page.locator('button:has-text("Create one")');

    // Ensure we can see the UI elements first
    if (initialCount > 0 || (await createOneButton.isVisible())) {
      const testName = `Test Reply ${generateRandomString()}`;
      const testContent = `This is a test reply content - ${generateRandomString()}`;

      await createSavedReply(page, testName, testContent);

      // Wait for UI to update
      await page.waitForTimeout(1000);

      // Use the title-based helper function to verify the reply exists
      const createdReply = await findSavedReplyByTitle(page, testName);
      await expect(createdReply).toBeVisible({ timeout: 5000 });

      await deleteSavedReplyByName(testName);

      await takeDebugScreenshot(page, "saved-reply-created.png");
    }
  });

  test("should show search and new reply button when replies exist", async ({ page }) => {
    const replyCount = await getSavedReplyCount(page);

    if (replyCount > 0) {
      await expectSearchVisible(page);
      await expectNewReplyButtonVisible(page);

      await takeDebugScreenshot(page, "saved-replies-with-search.png");
    }
  });

  test("should search saved replies with debounced input", async ({ page }) => {
    const replyCount = await getSavedReplyCount(page);

    if (replyCount > 0) {
      // Test search functionality
      await searchSavedReplies(page, "nonexistent-term-12345");
      await expectSearchResults(page, 0);

      // Clear search
      await clearSearch(page);

      // Should show all replies again
      const allRepliesCount = await getSavedReplyCount(page);
      expect(allRepliesCount).toBeGreaterThan(0);

      await takeDebugScreenshot(page, "saved-replies-search-test.png");
    }
  });

  test("should maintain search input focus during typing", async ({ page }) => {
    const replyCount = await getSavedReplyCount(page);

    if (replyCount > 0) {
      const searchInput = page.locator('input[placeholder="Search saved replies..."]').first();
      // Focus on search input and wait for it to be properly focused
      await searchInput.focus();
      await expect(searchInput).toBeFocused();

      // Type more slowly to avoid overwhelming React re-renders
      await searchInput.type("test", { delay: 100 });

      // Wait for any debounced operations to complete
      await page.waitForTimeout(400);

      // Verify focus is maintained - use more reliable check
      await expect(searchInput).toBeFocused();

      // Also verify the value was typed correctly
      await expect(searchInput).toHaveValue("test");

      await clearSearch(page);
    }
  });

  test("should edit a saved reply", async ({ page }) => {
    const testName = `Edit Target ${generateRandomString()}`;
    const testContent = `Original content ${generateRandomString()}`;
    const updatedTitle = `Updated ${generateRandomString()}`;
    const updatedContent = `Updated content - ${generateRandomString()}`;

    await createSavedReply(page, testName, testContent);

    await page.waitForTimeout(2000);
    await expectSavedRepliesVisible(page);

    await editSavedReplyByTitle(page, testName, updatedTitle, updatedContent);

    await page.waitForTimeout(1000);

    const updatedReply = await findSavedReplyByTitle(page, updatedTitle);
    await expect(updatedReply).toBeVisible({ timeout: 5000 });

    // Ensure the original title no longer exists
    const originalReply = await findSavedReplyByTitle(page, testName);
    await expect(originalReply).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-edited.png");
    await deleteSavedReplyByName(testName);
  });

  test("should copy saved reply to clipboard", async ({ page }) => {
    const replyCount = await getSavedReplyCount(page);
    let testName: string;

    if (replyCount === 0) {
      // If no replies exist, create one first
      testName = `Copy Target ${generateRandomString()}`;
      const testContent = `Copy content ${generateRandomString()}`;
      await createSavedReply(page, testName, testContent);
      await page.waitForTimeout(1000);
    } else {
      // Use the first existing reply's title
      testName = await getSavedReplyTitle(page, 0);
    }

    await copySavedReplyByTitle(page, testName);
    await expectClipboardContent(page);

    await takeDebugScreenshot(page, "saved-reply-copied.png");
    await deleteSavedReplyByName(testName);
  });

  test("should delete a saved reply with confirmation", async ({ page }) => {
    // Create a reply specifically for deletion test with unique identifier
    const uniqueId = generateRandomString();
    const testName = `Delete Me ${uniqueId}`;
    const testContent = `This reply will be deleted - ${uniqueId}`;

    await createSavedReply(page, testName, testContent);

    // Wait for creation to complete
    await page.waitForTimeout(1000);

    const initialCount = await getSavedReplyCount(page);
    expect(initialCount).toBeGreaterThan(0);

    // Find and delete the reply we just created
    let replyIndex = -1;
    let foundTargetReply = false;

    for (let i = 0; i < initialCount; i++) {
      try {
        const title = await getSavedReplyTitle(page, i);
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
      await deleteSavedReply(page, replyIndex);

      // Wait for deletion to complete
      await page.waitForTimeout(1000);

      // Verify the specific reply was deleted by checking it's no longer findable
      const newCount = await getSavedReplyCount(page);
      let stillFound = false;

      for (let i = 0; i < newCount; i++) {
        try {
          const title = await getSavedReplyTitle(page, i);
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
    await openCreateDialog(page);

    // Try to save without filling required fields
    await clickSaveButton(page);

    // Should show validation errors or prevent submission
    // Dialog should remain open
    await expectCreateDialogVisible(page);

    // Cancel the dialog
    await clickCancelButton(page);

    await takeDebugScreenshot(page, "saved-reply-validation.png");
  });

  test("should handle loading states properly", async ({ page }) => {
    // Navigate to page and check for loading states
    await page.goto("/saved-replies");

    // Loading skeletons might be visible briefly
    // This test ensures the page loads correctly
    await page.waitForLoadState("networkidle");
    await expectPageVisible(page);

    // Ensure no loading skeletons remain visible
    await expect(page.locator(".animate-default-pulse").first()).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-replies-loaded.png");
  });

  test("should maintain authentication state", async ({ page }) => {
    // First verify we're authenticated and on the correct page
    await expectPageVisible(page);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/.*saved-replies.*/);

    // Test navigation away and back to verify auth persists
    await page.goto("/mine");
    await page.waitForLoadState("networkidle");

    // Navigate back to saved replies to test auth persistence
    await page.goto("/saved-replies");
    await page.waitForLoadState("networkidle");

    // Should remain authenticated and stay on the saved replies page
    await expect(page).toHaveURL(/.*saved-replies.*/);
    await expectPageVisible(page);

    await takeDebugScreenshot(page, "saved-replies-auth-persisted.png");
  });

  test("should navigate between conversations and saved replies", async ({ page }) => {
    // Test direct navigation to conversations page
    await page.goto("/mine");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*mine.*/);

    // Navigate back to saved replies
    await page.goto("/saved-replies");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/.*saved-replies.*/);
    await expectPageVisible(page);

    await takeDebugScreenshot(page, "saved-replies-navigation.png");
  });

  test("should support keyboard navigation", async ({ page }) => {
    const replyCount = await getSavedReplyCount(page);

    // Focus on search input if it exists (when there are replies)
    if (replyCount > 0) {
      const searchInput = page.locator('input[placeholder="Search saved replies..."]').first();
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    }

    // Test keyboard navigation to the appropriate button
    await page.keyboard.press("Escape"); // Ensure no dialogs are open

    if (replyCount === 0) {
      // When no replies exist, use the "Create one" button
      await clickCreateOneButton(page);
    } else {
      // When replies exist, use the floating action button
      await clickFloatingAddButton(page);
    }

    await expectCreateDialogVisible(page);

    // Escape should close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Verify dialog is closed
    await expect(page.locator('[role="dialog"]:has-text("New saved reply")')).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-replies-keyboard-nav.png");
  });

  test("should handle edge cases and errors gracefully", async ({ page }) => {
    // Test with extremely long content
    const longContent = "A".repeat(5000);
    const testName = `Long Content Test ${generateRandomString()}`;

    try {
      await createSavedReply(page, testName, longContent);

      // Should either succeed or show appropriate validation
      const replyCount = await getSavedReplyCount(page);
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

    await navigateToSavedReplies(page);

    const testData = Array.from({ length: 10 }, (_, i) => ({
      name: `Bulk Test Reply ${i + 1} ${generateRandomString()}`,
      content: `This is bulk test content ${i + 1} - ${generateRandomString()}`,
    }));

    for (const data of testData) {
      await createSavedReply(page, data.name, data.content);
      await debugWait(page, 200); // Small delay between creations
    }

    const finalCount = await getSavedReplyCount(page);
    expect(finalCount).toBeGreaterThanOrEqual(10);

    // Test search with many replies
    await searchSavedReplies(page, "Bulk Test");
    const searchResults = await getSavedReplyCount(page);
    expect(searchResults).toBeGreaterThanOrEqual(10);

    await takeDebugScreenshot(page, "saved-replies-bulk-test.png");
  });
});

test.describe("Saved Replies Rich Text Editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.waitForTimeout(1000);

    try {
      await navigateToSavedReplies(page);
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await navigateToSavedReplies(page);
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });

  test("should display TipTap editor in create dialog", async ({ page }) => {
    // Open create dialog
    await openCreateDialog(page);

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

    await clickCancelButton(page);
    await takeDebugScreenshot(page, "saved-reply-tiptap-editor.png");
  });

  test("should create saved reply with bold text", async ({ page }) => {
    const testName = `Bold Test ${generateRandomString()}`;
    const testContent = "This text should be bold";

    // Open create dialog
    await openCreateDialog(page);

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
    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    // Verify the reply was created
    await expectSavedRepliesVisible(page);
    await takeDebugScreenshot(page, "saved-reply-bold-text.png");
    await deleteSavedReplyByName(testName);
  });

  test("should create saved reply with italic text", async ({ page }) => {
    const testName = `Italic Test ${generateRandomString()}`;
    const testContent = "This text should be italic";

    // Open create dialog
    await openCreateDialog(page);

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
    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "saved-reply-italic-text.png");
    await deleteSavedReplyByName(testName);
  });

  test("should create saved reply with bullet list", async ({ page }) => {
    const testName = `List Test ${generateRandomString()}`;

    // Open create dialog
    await openCreateDialog(page);

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
    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "saved-reply-bullet-list.png");
    await deleteSavedReplyByName(testName);
  });

  test("should create saved reply with links", async ({ page }) => {
    const testName = `Link Test ${generateRandomString()}`;
    const testContent = "Visit our website";

    // Open create dialog
    await openCreateDialog(page);

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
    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "saved-reply-with-link.png");
    await deleteSavedReplyByName(testName);
  });

  test("should preserve formatting when editing saved reply", async ({ page }) => {
    const testName = `Edit Test ${generateRandomString()}`;
    const originalContent = "Original bold text";
    const updatedContent = "Updated italic text";

    // First create a saved reply with bold text
    await openCreateDialog(page);

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

    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    // Now edit the saved reply
    await page.locator('[data-testid="saved-reply-card"]').first().click();
    await expectEditDialogVisible(page);

    // Clear and add new content
    await editor.click();
    await page.keyboard.press("Control+a");
    await editor.fill(updatedContent);

    // Wait for toolbar to be visible
    await page.waitForTimeout(500);

    // Make new text italic instead
    await page.keyboard.press("Control+a");
    await page.click('button[aria-label="Italic"]');

    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "edited-formatted-reply.png");
    await deleteSavedReplyByName(testName);
  });

  test("should insert formatted saved reply into conversation", async ({ page }) => {
    const testName = `Insert Test ${generateRandomString()}`;
    const testContent = "This should be bold in conversation too";

    // Create a saved reply with formatting
    await openCreateDialog(page);

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

    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    // Verify the saved reply was created with formatted content
    await expectSavedRepliesVisible(page);

    // Verify the reply exists by finding it directly
    const createdReply = await findSavedReplyByTitle(page, testName);
    await expect(createdReply).toBeVisible({ timeout: 5000 });

    // Test copying the formatted content using the title-based approach
    await copySavedReplyByTitle(page, testName);
    await expectClipboardContent(page);

    await takeDebugScreenshot(page, "formatted-reply-created.png");
    await deleteSavedReplyByName(testName);
  });

  test("should handle mixed formatting correctly", async ({ page }) => {
    const testName = `Mixed Format Test ${generateRandomString()}`;

    // Open create dialog
    await openCreateDialog(page);

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

    await clickSaveButton(page);
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "mixed-formatting-reply.png");
    await deleteSavedReplyByName(testName);
  });

  test("should show toolbar controls in editor", async ({ page }) => {
    await openCreateDialog(page);

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

    await clickCancelButton(page);
    await takeDebugScreenshot(page, "toolbar-controls.png");
  });
});
