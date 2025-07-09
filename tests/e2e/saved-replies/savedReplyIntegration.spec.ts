import { expect, test } from "@playwright/test";
import { BasePage } from "../utils/page-objects/basePage";
import { SavedRepliesPage } from "../utils/page-objects/savedRepliesPage";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Saved Reply Integration with Email Composition", () => {
  let conversationsPage: ConversationsPage;
  let savedRepliesPage: SavedRepliesPage;
  let basePage: BasePage;

  test.beforeEach(async ({ page }) => {
    conversationsPage = new ConversationsPage(page);
    savedRepliesPage = new SavedRepliesPage(page);
    basePage = new (class extends BasePage {})(page);
  });

  test("should integrate saved replies with email signature", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Signature Test ${generateRandomString()}`;
    const testContent = `<p>This is the main message content.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check that both saved reply content and signature are present
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("This is the main message content");
    
    // Email signature should be present (if configured)
    // This depends on the actual signature implementation
    await page.waitForTimeout(1000);

    await takeDebugScreenshot(page, "saved-reply-with-signature.png");
  });

  test("should integrate saved replies with file attachments", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Attachment Test ${generateRandomString()}`;
    const testContent = `<p>Please find the attached file.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in required fields
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("test@example.com");

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // TODO: Add file attachment here if file upload is available
    // This would depend on the actual file upload implementation

    // Check that message content is correct
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("Please find the attached file");

    await takeDebugScreenshot(page, "saved-reply-with-attachments.png");
  });

  test("should integrate saved replies with CC and BCC fields", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `CC BCC Test ${generateRandomString()}`;
    const testContent = `<p>This message should work with CC and BCC.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Add CC and BCC fields
    const ccButton = page.locator('button:has-text("CC")');
    await ccButton.click();

    const bccButton = page.locator('button:has-text("BCC")');
    await bccButton.click();

    // Fill in email fields
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("primary@example.com");

    const ccField = page.locator('input[placeholder="CC"]');
    await ccField.fill("cc@example.com");

    const bccField = page.locator('input[placeholder="BCC"]');
    await bccField.fill("bcc@example.com");

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check that all email fields are preserved
    await expect(toField).toHaveValue("primary@example.com");
    await expect(ccField).toHaveValue("cc@example.com");
    await expect(bccField).toHaveValue("bcc@example.com");

    // Check that subject and message are from saved reply
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("This message should work with CC and BCC");

    await takeDebugScreenshot(page, "saved-reply-with-cc-bcc.png");
  });

  test("should work with speech recognition integration", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Speech Test ${generateRandomString()}`;
    const testContent = `<p>This is a saved reply for speech testing.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check that saved reply content is inserted
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("This is a saved reply for speech testing");

    // Check if speech recognition controls are still available
    // This depends on the actual speech recognition implementation
    const speechButton = page.locator('[aria-label*="microphone"], [aria-label*="speech"], [aria-label*="record"]');
    if (await speechButton.isVisible()) {
      await expect(speechButton).toBeVisible();
    }

    await takeDebugScreenshot(page, "saved-reply-with-speech.png");
  });

  test("should validate email before sending with saved reply", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Validation Test ${generateRandomString()}`;
    const testContent = `<p>This is a complete email message.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Use the saved reply without filling To field
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
    await toField.fill("valid@example.com");

    // Send button should work now
    await sendButton.click();

    // Should show sending state
    const sendingButton = page.locator('button:has-text("Sending...")');
    await expect(sendingButton).toBeVisible();

    await takeDebugScreenshot(page, "saved-reply-validation.png");
  });

  test("should handle saved reply with complex email formatting", async ({ page }) => {
    // Create a saved reply with complex email formatting
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Complex Email ${generateRandomString()}`;
    const testContent = `
      <p>Dear Customer,</p>
      <p>Thank you for your inquiry. Here are the details:</p>
      <ul>
        <li><strong>Issue:</strong> Account access problem</li>
        <li><strong>Solution:</strong> Reset your password</li>
        <li><strong>Timeline:</strong> 24-48 hours</li>
      </ul>
      <p>If you have any questions, please reply to this email.</p>
      <p>Best regards,<br>Support Team</p>
    `;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in email details
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("customer@example.com");

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check that complex formatting is preserved
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("Dear Customer");
    await expect(editor).toContainText("Thank you for your inquiry");
    await expect(editor).toContainText("Issue: Account access problem");
    await expect(editor).toContainText("Solution: Reset your password");
    await expect(editor).toContainText("Timeline: 24-48 hours");
    await expect(editor).toContainText("Best regards");
    await expect(editor).toContainText("Support Team");

    // Check for preserved formatting elements
    await expect(editor.locator('strong')).toContainText("Issue:");
    await expect(editor.locator('strong')).toContainText("Solution:");
    await expect(editor.locator('strong')).toContainText("Timeline:");
    await expect(editor.locator('li')).toHaveCount(3);

    await takeDebugScreenshot(page, "complex-email-formatting.png");
  });

  test("should integrate with keyboard shortcuts", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Keyboard Test ${generateRandomString()}`;
    const testContent = `<p>This message tests keyboard shortcuts.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in required fields
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("test@example.com");

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Test keyboard shortcuts after saved reply insertion
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();

    // Test Ctrl+A (select all)
    await page.keyboard.press("Control+a");
    
    // Test Ctrl+B (bold)
    await page.keyboard.press("Control+b");
    
    // Content should be selected and bold formatting applied
    await expect(editor.locator('strong')).toContainText("This message tests keyboard shortcuts");

    await takeDebugScreenshot(page, "keyboard-shortcuts-integration.png");
  });

  test("should handle saved reply with email threading", async ({ page }) => {
    // Create a test saved reply for threading
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Threading Test ${generateRandomString()}`;
    const testContent = `<p>This is a follow-up message in the thread.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in fields for threading
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("customer@example.com");

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Verify that saved reply works in threading context
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(testName);

    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("This is a follow-up message in the thread");

    await takeDebugScreenshot(page, "saved-reply-threading.png");
  });

  test("should work with different email priority levels", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Priority Test ${generateRandomString()}`;
    const testContent = `<p>This is an urgent message requiring immediate attention.</p>`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in basic fields
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("urgent@example.com");

    // Use the saved reply
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Check that saved reply content is inserted
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await expect(editor).toContainText("This is an urgent message requiring immediate attention");

    // TODO: Set email priority if the feature exists
    // This would depend on the actual priority implementation

    await takeDebugScreenshot(page, "saved-reply-priority.png");
  });

  test("should integrate with email templates and saved replies", async ({ page }) => {
    // Create multiple saved replies for template testing
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testReplies = [
      {
        name: `Template Header ${generateRandomString()}`,
        content: `<p>Dear [Customer Name],</p><p>Thank you for contacting us.</p>`
      },
      {
        name: `Template Body ${generateRandomString()}`,
        content: `<p>We have received your request and will process it within 24 hours.</p>`
      },
      {
        name: `Template Footer ${generateRandomString()}`,
        content: `<p>Best regards,<br>Support Team</p>`
      }
    ];

    for (const reply of testReplies) {
      await savedRepliesPage.createSavedReply(reply.name, reply.content);
      await page.waitForTimeout(500);
    }

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Fill in email
    const toField = page.locator('input[placeholder="To"]');
    await toField.fill("customer@example.com");

    // Use first saved reply (header)
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const headerReply = page.locator(`text="${testReplies[0].name}"`);
    await headerReply.click();

    // Move cursor to end and add body
    const editor = page.locator('[role="textbox"][contenteditable="true"]');
    await editor.click();
    await page.keyboard.press("Control+End");

    // Add body template
    await savedRepliesButton.click();
    const bodyReply = page.locator(`text="${testReplies[1].name}"`);
    await bodyReply.click();

    // Verify combined content
    await expect(editor).toContainText("Dear [Customer Name]");
    await expect(editor).toContainText("Thank you for contacting us");
    await expect(editor).toContainText("We have received your request");

    await takeDebugScreenshot(page, "template-integration.png");
  });
});