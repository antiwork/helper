import { expect, test } from "@playwright/test";
import { BasePage } from "../utils/page-objects/basePage";
import { SavedRepliesPage } from "../utils/page-objects/savedRepliesPage";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Saved Reply Error Handling and Edge Cases", () => {
  let conversationsPage: ConversationsPage;
  let savedRepliesPage: SavedRepliesPage;
  let basePage: BasePage;

  test.beforeEach(async ({ page }) => {
    conversationsPage = new ConversationsPage(page);
    savedRepliesPage = new SavedRepliesPage(page);
    basePage = new (class extends BasePage {})(page);
  });

  test("should handle network error during saved reply insertion", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Network Error Test ${generateRandomString()}`;
    const testContent = `Network error test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Simulate network failure by going offline
    await page.context().setOffline(true);

    // Try to use saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should show error toast
    const errorToast = page.locator('[data-sonner-toast]').filter({ hasText: "Failed to insert saved reply" });
    await expect(errorToast).toBeVisible();

    // Content should still be inserted (optimistic update)
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    // Restore network
    await page.context().setOffline(false);

    await takeDebugScreenshot(page, "network-error-handling.png");
  });

  test("should handle very large saved reply content", async ({ page }) => {
    // Create a saved reply with very large content
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Large Content Test ${generateRandomString()}`;
    const largeContent = "This is a very long message. ".repeat(1000); // ~30KB content
    await savedRepliesPage.createSavedReply(testName, largeContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the large saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should handle large content gracefully
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("This is a very long message");

    await takeDebugScreenshot(page, "large-content-handling.png");
  });

  test("should handle malformed HTML in saved reply content", async ({ page }) => {
    // Create a saved reply with malformed HTML
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Malformed HTML Test ${generateRandomString()}`;
    const malformedContent = `<p>Hello <strong>world</p><script>alert('xss')</script><div><span>test</div>`;
    await savedRepliesPage.createSavedReply(testName, malformedContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the saved reply with malformed HTML
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should handle malformed HTML gracefully (sanitized)
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("Hello world");
    await expect(editor).toContainText("test");

    // Script tags should be removed
    await expect(editor).not.toContainText("alert");

    await takeDebugScreenshot(page, "malformed-html-handling.png");
  });

  test("should handle saved reply with empty content", async ({ page }) => {
    // Create a saved reply with empty content
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Empty Content Test ${generateRandomString()}`;
    const emptyContent = "";
    await savedRepliesPage.createSavedReply(testName, emptyContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the empty saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should handle empty content gracefully
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    // Editor should be empty or contain only whitespace
    const editorContent = await editor.textContent();
    expect(editorContent?.trim()).toBe("");

    await takeDebugScreenshot(page, "empty-content-handling.png");
  });

  test("should handle rapid consecutive clicks on saved reply", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Rapid Click Test ${generateRandomString()}`;
    const testContent = `Rapid click test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);

    // Click rapidly multiple times
    for (let i = 0; i < 5; i++) {
      await replyItem.click();
      await page.waitForTimeout(50); // Very short wait
    }

    // Should handle rapid clicks gracefully
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    // Should not show multiple success toasts
    const successToasts = page.locator('[data-sonner-toast]').filter({ hasText: "Saved reply inserted" });
    const toastCount = await successToasts.count();
    expect(toastCount).toBeLessThanOrEqual(1);

    await takeDebugScreenshot(page, "rapid-click-handling.png");
  });

  test("should handle saved reply with special unicode characters", async ({ page }) => {
    // Create a saved reply with unicode characters
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Unicode Test ${generateRandomString()} 🚀`;
    const unicodeContent = `Hello 世界! 🌍 Testing unicode: αβγ δεζ μαθηματικά 数学 🔢`;
    await savedRepliesPage.createSavedReply(testName, unicodeContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the unicode saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should handle unicode characters properly
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("Hello 世界!");
    await expect(editor).toContainText("🌍");
    await expect(editor).toContainText("αβγ");
    await expect(editor).toContainText("数学");

    await takeDebugScreenshot(page, "unicode-handling.png");
  });

  test("should handle saved reply dropdown closing during loading", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Loading Test ${generateRandomString()}`;
    const testContent = `Loading test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Immediately close dropdown while it might be loading
    await page.keyboard.press("Escape");

    // Should handle this gracefully - no errors
    const toField = page.locator('input[placeholder="To"]');
    await expect(toField).toBeVisible();

    // Should be able to reopen dropdown
    await savedRepliesButton.click();
    const dropdown = page.locator('[role="dialog"]').filter({ hasText: "Search saved replies" });
    await expect(dropdown).toBeVisible();

    await takeDebugScreenshot(page, "loading-interruption-handling.png");
  });

  test("should handle saved reply with only whitespace content", async ({ page }) => {
    // Create a saved reply with only whitespace
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Whitespace Test ${generateRandomString()}`;
    const whitespaceContent = "   \n\t   \n   ";
    await savedRepliesPage.createSavedReply(testName, whitespaceContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the whitespace saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should handle whitespace content gracefully
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    // Editor should handle whitespace appropriately
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    const editorContent = await editor.textContent();
    expect(editorContent?.trim()).toBe("");

    await takeDebugScreenshot(page, "whitespace-handling.png");
  });

  test("should handle saved reply insertion when editor is not ready", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Editor Ready Test ${generateRandomString()}`;
    const testContent = `Editor ready test content - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go back to modal quickly (editor might not be fully ready)
    await basePage.goto("/mailboxes/gumroad/mine");
    await conversationsPage.openNewConversationModal();

    // Try to use saved reply immediately
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should handle editor not being ready gracefully
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    // Wait for editor to be ready and check content
    await page.waitForTimeout(1000);
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("Editor ready test content");

    await takeDebugScreenshot(page, "editor-ready-handling.png");
  });

  test("should handle saved reply with mixed content types", async ({ page }) => {
    // Create a saved reply with mixed content
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Mixed Content Test ${generateRandomString()}`;
    const mixedContent = `
      <h1>Heading</h1>
      <p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>
      <ul>
        <li>List item 1</li>
        <li>List item 2 with <a href="https://example.com">link</a></li>
      </ul>
      <blockquote>Quote block</blockquote>
      <p>Final paragraph.</p>
    `;
    await savedRepliesPage.createSavedReply(testName, mixedContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the mixed content saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Should handle mixed content properly
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    
    // Check for various content types
    await expect(editor).toContainText("Heading");
    await expect(editor).toContainText("Paragraph with bold and italic text");
    await expect(editor).toContainText("List item 1");
    await expect(editor).toContainText("List item 2 with link");
    await expect(editor).toContainText("Quote block");
    await expect(editor).toContainText("Final paragraph");

    // Check for preserved formatting
    await expect(editor.locator('strong')).toContainText("bold");
    await expect(editor.locator('em')).toContainText("italic");
    await expect(editor.locator('a')).toContainText("link");

    await takeDebugScreenshot(page, "mixed-content-handling.png");
  });
});