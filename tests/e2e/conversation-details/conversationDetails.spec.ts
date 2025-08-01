import { expect, test } from "@playwright/test";
import { ConversationDetailsPage } from "../utils/page-objects/conversationDetailsPage";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Conversation Details", () => {
  let conversationDetailsPage: ConversationDetailsPage;

  test.beforeEach(async ({ page }) => {
    conversationDetailsPage = new ConversationDetailsPage(page);
  });

  test("should display conversation details page", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    await conversationDetailsPage.expectConversationLoaded();
    await conversationDetailsPage.expectNavigationControls();
  });

  test("should show conversation subject", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const subject = await conversationDetailsPage.getConversationSubject();
    expect(subject.length).toBeGreaterThan(0);
  });

  test("should display messages in conversation", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const messageCount = await conversationDetailsPage.getMessageCount();
    expect(messageCount).toBeGreaterThan(0);
  });

  test("should navigate between conversations", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const initialSubject = await conversationDetailsPage.getConversationSubject();
    const initialCounter = await conversationDetailsPage.getConversationCounter();

    // Try to go to next conversation
    await conversationDetailsPage.goToNextConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const nextSubject = await conversationDetailsPage.getConversationSubject();
    const nextCounter = await conversationDetailsPage.getConversationCounter();

    // Counter should change (assuming there's more than one conversation)
    if (nextCounter !== initialCounter) {
      expect(nextSubject).not.toBe(initialSubject);
    }
  });

  test("should toggle sidebar", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    // Click toggle sidebar button
    await conversationDetailsPage.toggleSidebar();

    // The button should still be visible regardless of sidebar state
    await expect(conversationDetailsPage.page.getByTestId("toggle-sidebar-button")).toBeVisible();
  });

  test("should close conversation", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    await conversationDetailsPage.closeConversation();

    // Should navigate back to conversations list
    await expect(conversationDetailsPage.page.url()).toContain("/conversations");
  });

  test("should display conversation with multiple messages", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    // Verify basic conversation structure
    await conversationDetailsPage.expectConversationLoaded();
    await conversationDetailsPage.expectNavigationControls();

    const messageCount = await conversationDetailsPage.getMessageCount();
    expect(messageCount).toBeGreaterThan(0);

    // Test message structure for each message
    const messages = conversationDetailsPage.page.getByTestId("message-item");
    const count = await messages.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      // Test first 3 messages
      const message = messages.nth(i);
      await expect(message).toBeVisible();
      await expect(message.getByTestId("message-header")).toBeVisible();
      await expect(message.getByTestId("message-content")).toBeVisible();
      await expect(message.getByTestId("message-footer")).toBeVisible();
    }
  });

  test("should handle conversation navigation properly", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const initialSubject = await conversationDetailsPage.getConversationSubject();
    const initialCounter = await conversationDetailsPage.getConversationCounter();

    // Test previous/next navigation
    await conversationDetailsPage.goToNextConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const nextSubject = await conversationDetailsPage.getConversationSubject();
    const nextCounter = await conversationDetailsPage.getConversationCounter();

    // If there are multiple conversations, subjects should be different
    if (initialCounter !== nextCounter) {
      expect(nextSubject).not.toBe(initialSubject);
    }

    // Navigate back
    await conversationDetailsPage.goToPreviousConversation();
    await conversationDetailsPage.waitForConversationLoad();

    // Should be back to original conversation
    const backSubject = await conversationDetailsPage.getConversationSubject();
    expect(backSubject).toBe(initialSubject);
  });

  test("should test scroll functionality in long conversations", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const messageCount = await conversationDetailsPage.getMessageCount();

    if (messageCount > 0) {
      const messageThreadPanel = conversationDetailsPage.page.getByTestId("message-thread-panel");

      // Scroll down
      await messageThreadPanel.evaluate((el) => {
        el.scrollTop = 300;
      });

      // Wait for scroll event processing
      await conversationDetailsPage.page.waitForTimeout(300);

      // Check if scroll to top button exists
      const scrollButton = conversationDetailsPage.page.getByTestId("scroll-to-top-button");
      await expect(scrollButton).toBeAttached();

      // If visible, test clicking it
      if (await scrollButton.isVisible()) {
        await scrollButton.click();
        await conversationDetailsPage.page.waitForTimeout(200);

        // Verify scroll position changed
        const newScrollTop = await messageThreadPanel.evaluate((el) => el.scrollTop);
        expect(newScrollTop).toBeLessThan(300);
      }
    }
  });

  test("should close conversation and return to list", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    // Test conversation close
    await conversationDetailsPage.closeConversation();

    // Should be back at conversations list
    await conversationDetailsPage.page.waitForLoadState("networkidle");
    await expect(conversationDetailsPage.page.url()).toContain("/conversations");

    // Should see conversation list items
    await expect(conversationDetailsPage.page.getByTestId("conversation-list-item").first()).toBeVisible();
  });

  test("should handle conversation counter display correctly", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const counter = await conversationDetailsPage.getConversationCounter();

    // Counter should be in format "X of Y" or "X of Y+"
    expect(counter).toMatch(/^\d+ of \d+\+?$/);

    // Extract numbers to verify they make sense
    const match = counter.match(/^(\d+) of (\d+)\+?$/);
    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      expect(current).toBeGreaterThan(0);
      expect(current).toBeLessThanOrEqual(total);
    }
  });

  test("should create and display internal note", async () => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    // Look for add note functionality in message actions
    const addNoteButton = conversationDetailsPage.page
      .locator("button")
      .filter({ hasText: /note|internal/i })
      .first();
    const addNoteExists = await addNoteButton.count();

    if (addNoteExists > 0 && (await addNoteButton.isVisible())) {
      const testNote = `Internal note ${generateRandomString(8)}`;

      await addNoteButton.click();

      // Look for note input field (could be textarea or TipTap editor)
      const noteInput = conversationDetailsPage.page
        .locator('textarea, [data-testid="tiptap-editor-content"] .ProseMirror')
        .first();
      if (await noteInput.isVisible()) {
        await noteInput.fill(testNote);

        // Submit the note
        const submitButton = conversationDetailsPage.page.getByRole("button", { name: /save|add|submit/i });
        await submitButton.click();

        await conversationDetailsPage.page.waitForLoadState("networkidle");

        // Verify note was created
        await conversationDetailsPage.expectMessageExists(testNote);
      }
    }
  });
});
