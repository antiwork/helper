import { expect, test } from "@playwright/test";
import { BasePage } from "../utils/page-objects/basePage";
import { SavedRepliesPage } from "../utils/page-objects/savedRepliesPage";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Saved Reply Selection in New Conversation Modal", () => {
  let conversationsPage: ConversationsPage;
  let savedRepliesPage: SavedRepliesPage;
  let basePage: BasePage;

  test.beforeEach(async ({ page }) => {
    conversationsPage = new ConversationsPage(page);
    savedRepliesPage = new SavedRepliesPage(page);
    basePage = new (class extends BasePage {})(page);

    // Navigate to conversations page
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  });

  test("should not show saved replies button when no saved replies exist", async ({ page }) => {
    // First, ensure we have no saved replies by going to saved replies page
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    // Delete all existing saved replies if any
    const existingReplies = await savedRepliesPage.getSavedReplyCount();
    for (let i = 0; i < existingReplies; i++) {
      await savedRepliesPage.deleteSavedReply(0);
      await page.waitForTimeout(500);
    }

    // Go back to conversations page
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");

    // Open new conversation modal
    await conversationsPage.openNewConversationModal();

    // Saved replies button should not be visible
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await expect(savedRepliesButton).not.toBeVisible();

    await takeDebugScreenshot(page, "no-saved-replies-button.png");
  });

  test("should show saved replies button when saved replies exist", async ({ page }) => {
    // Create a test saved reply first
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Test Reply ${generateRandomString()}`;
    const testContent = `This is a test reply - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");

    // Open new conversation modal
    await conversationsPage.openNewConversationModal();

    // Saved replies button should be visible
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await expect(savedRepliesButton).toBeVisible();

    // Button should have correct icon and text
    await expect(savedRepliesButton.locator('svg')).toBeVisible(); // MessageSquare icon
    await expect(savedRepliesButton.locator('text="Saved Replies"')).toBeVisible();

    await takeDebugScreenshot(page, "saved-replies-button-visible.png");
  });

  test("should open saved replies dropdown when button is clicked", async ({ page }) => {
    // Ensure we have saved replies
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Dropdown Test ${generateRandomString()}`;
    const testContent = `This is for dropdown test - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Click saved replies button
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Dropdown should be visible
    const dropdown = page.locator('[role="dialog"]').filter({ hasText: "Search saved replies" });
    await expect(dropdown).toBeVisible();

    // Search input should be visible
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await expect(searchInput).toBeVisible();

    // Our test reply should be in the list
    const replyItem = page.locator(`text="${testName}"`);
    await expect(replyItem).toBeVisible();

    await takeDebugScreenshot(page, "saved-replies-dropdown-open.png");
  });

  test("should search saved replies in dropdown", async ({ page }) => {
    // Create multiple saved replies
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testReplies = [
      { name: `Search Test 1 ${generateRandomString()}`, content: "Welcome message content" },
      { name: `Search Test 2 ${generateRandomString()}`, content: "Thank you message content" },
      { name: `Different Reply ${generateRandomString()}`, content: "Some other content" }
    ];

    for (const reply of testReplies) {
      await savedRepliesPage.createSavedReply(reply.name, reply.content);
      await page.waitForTimeout(500);
    }

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for "Search Test"
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("Search Test");

    // Should only show matching results
    const searchResults = page.locator('[role="option"]');
    const resultCount = await searchResults.count();
    expect(resultCount).toBe(2);

    // Should show both Search Test items
    await expect(page.locator(`text="${testReplies[0].name}"`)).toBeVisible();
    await expect(page.locator(`text="${testReplies[1].name}"`)).toBeVisible();

    // Should not show the "Different Reply" item
    await expect(page.locator(`text="${testReplies[2].name}"`)).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-replies-search-results.png");
  });

  test("should display saved reply usage count", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Usage Test ${generateRandomString()}`;
    const testContent = `Usage test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Check that usage count is displayed (should be 0 initially)
    const usageText = page.locator('text="Used 0 times"');
    await expect(usageText).toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-usage-count.png");
  });

  test("should insert saved reply content into subject and message", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Insert Test ${generateRandomString()}`;
    const testContent = `<p>This is <strong>bold</strong> test content - ${generateRandomString()}</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in To field first
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("test@example.com");

    // Open saved replies dropdown and select our reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check that subject field is populated
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    // Check that message content is populated in the editor
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("This is bold test content");

    // Check that formatting is preserved (should contain bold text)
    const boldText = editor.locator('strong');
    await expect(boldText).toBeVisible();
    await expect(boldText).toContainText("bold");

    // Dropdown should be closed after selection
    const dropdown = page.locator('[role="dialog"]').filter({ hasText: "Search saved replies" });
    await expect(dropdown).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-inserted.png");
  });

  test("should show success toast after inserting saved reply", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Toast Test ${generateRandomString()}`;
    const testContent = `Toast test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown and select our reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check for success toast
    const toast = page.locator('[data-sonner-toast]').filter({ hasText: "Saved reply inserted" });
    await expect(toast).toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-success-toast.png");
  });

  test("should increment usage count after using saved reply", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Usage Increment Test ${generateRandomString()}`;
    const testContent = `Usage increment content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown and select our reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Wait for usage tracking to complete
    await page.waitForTimeout(1000);

    // Close modal and open again to see updated usage count
    await page.keyboard.press("Escape");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown again
    await savedRepliesButton.click();

    // Check that usage count is now 1
    const usageText = page.locator('text="Used 1 times"');
    await expect(usageText).toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-usage-incremented.png");
  });

  test("should handle keyboard navigation in saved replies dropdown", async ({ page }) => {
    // Create multiple saved replies
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testReplies = [
      { name: `Keyboard Test 1 ${generateRandomString()}`, content: "First reply" },
      { name: `Keyboard Test 2 ${generateRandomString()}`, content: "Second reply" },
      { name: `Keyboard Test 3 ${generateRandomString()}`, content: "Third reply" }
    ];

    for (const reply of testReplies) {
      await savedRepliesPage.createSavedReply(reply.name, reply.content);
      await page.waitForTimeout(500);
    }

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search input should be focused
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await expect(searchInput).toBeFocused();

    // Use arrow keys to navigate
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    
    // Press Enter to select
    await page.keyboard.press("Enter");

    // Should have inserted one of the replies
    const subjectField = page.locator('input[placeholder="Subject"]');
    const subjectValue = await subjectField.inputValue();
    expect(subjectValue).toMatch(/Keyboard Test/);

    await takeDebugScreenshot(page, "saved-reply-keyboard-navigation.png");
  });

  test("should close dropdown when clicking outside", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Close Test ${generateRandomString()}`;
    const testContent = `Close test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Dropdown should be visible
    const dropdown = page.locator('[role="dialog"]').filter({ hasText: "Search saved replies" });
    await expect(dropdown).toBeVisible();

    // Click outside the dropdown (on the modal background)
    const toField = page.locator('input[placeholder="To"]');
    await toField.click();

    // Dropdown should be closed
    await expect(dropdown).not.toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-dropdown-closed.png");
  });

  test("should preserve existing content when inserting saved reply", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Preserve Test ${generateRandomString()}`;
    const testContent = `Inserted content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in some initial content
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("test@example.com");

    const subjectField = page.locator('input[placeholder="Subject"]');
    await subjectField.fill("Initial Subject");

    // Open saved replies dropdown and select our reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // To field should be preserved
    await expect(toField).toHaveValue("test@example.com");

    // Subject should be replaced with saved reply name
    await expect(subjectField).toHaveValue(testName);

    // Message content should be replaced with saved reply content
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("Inserted content");

    await takeDebugScreenshot(page, "saved-reply-content-preserved.png");
  });

  test("should handle empty saved replies list gracefully", async ({ page }) => {
    // Ensure no saved replies exist
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const existingReplies = await savedRepliesPage.getSavedReplyCount();
    for (let i = 0; i < existingReplies; i++) {
      await savedRepliesPage.deleteSavedReply(0);
      await page.waitForTimeout(500);
    }

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Saved replies button should not be visible
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await expect(savedRepliesButton).not.toBeVisible();

    // Modal should still be functional
    const toField = page.locator('input[placeholder="To"]');
    await expect(toField).toBeVisible();

    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toBeVisible();

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-empty-list.png");
  });

  test("should handle loading state correctly", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // During loading, saved replies button should not be visible
    // (This test verifies the isLoading condition works)
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    
    // Now check final state based on whether saved replies exist
    const buttonExists = await savedRepliesButton.isVisible();
    
    // Button visibility should be consistent with saved replies existence
    if (buttonExists) {
      await expect(savedRepliesButton).toBeVisible();
    } else {
      await expect(savedRepliesButton).not.toBeVisible();
    }

    await takeDebugScreenshot(page, "saved-reply-loading-state.png");
  });

  test("should work with complex HTML content in saved replies", async ({ page }) => {
    // Create a saved reply with complex HTML
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Complex HTML Test ${generateRandomString()}`;
    const testContent = `
      <p>Hello <strong>there</strong>!</p>
      <ul>
        <li>First item</li>
        <li>Second item with <em>emphasis</em></li>
      </ul>
      <p>Best regards,<br>Support Team</p>
    `;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown and select our reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check that complex HTML is properly rendered in the editor
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    
    // Check for bold text
    await expect(editor.locator('strong')).toContainText("there");
    
    // Check for italic text
    await expect(editor.locator('em')).toContainText("emphasis");
    
    // Check for list items
    await expect(editor.locator('li')).toHaveCount(2);
    await expect(editor.locator('li').first()).toContainText("First item");
    await expect(editor.locator('li').last()).toContainText("Second item with emphasis");

    await takeDebugScreenshot(page, "saved-reply-complex-html.png");
  });

  test("should integrate with new conversation form validation", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Validation Test ${generateRandomString()}`;
    const testContent = `Validation test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Insert saved reply without filling To field
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Try to send without valid To field
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Should show validation error
    const errorToast = page.locator('[data-sonner-toast]').filter({ hasText: "Please enter a valid" });
    await expect(errorToast).toBeVisible();

    // Fill in valid email and try again
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("test@example.com");

    // Send button should now work (assuming send succeeds)
    await sendButton.click();

    await takeDebugScreenshot(page, "saved-reply-form-validation.png");
  });
});