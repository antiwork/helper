import { expect, Page } from "@playwright/test";

export class ConversationDetailsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToConversation(conversationId?: string) {
    if (conversationId) {
      await this.page.goto(`/conversations?id=${conversationId}`);
    } else {
      // Navigate to conversations list and click first conversation
      await this.page.goto("/conversations");
      await this.page.waitForLoadState("networkidle");

      const firstConversation = this.page.getByTestId("conversation-list-item").first();
      // Click on the actual link within the conversation item
      const conversationLink = firstConversation.locator("a").first();
      await conversationLink.click();
    }
    await this.page.waitForLoadState("networkidle");
  }

  async waitForConversationLoad() {
    await expect(this.page.getByTestId("conversation-header")).toBeVisible();
    await expect(this.page.getByTestId("message-thread")).toBeVisible();
  }

  // Header actions
  async closeConversation() {
    await this.page.getByTestId("close-conversation-button").click();
  }

  async goToPreviousConversation() {
    await this.page.getByTestId("previous-conversation-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async goToNextConversation() {
    await this.page.getByTestId("next-conversation-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async toggleSidebar() {
    await this.page.getByTestId("toggle-sidebar-button").click();
  }

  // Conversation information
  async getConversationSubject() {
    const subject = await this.page.getByTestId("conversation-subject").textContent();
    return subject?.trim() || "";
  }

  async getConversationCounter() {
    const counter = await this.page.getByTestId("conversation-counter").textContent();
    return counter?.trim() || "";
  }

  async expectConversationSubject(expectedSubject: string) {
    await expect(this.page.getByTestId("conversation-subject")).toContainText(expectedSubject);
  }

  // Message thread interactions
  async getMessageCount() {
    const messages = this.page.getByTestId("message-item");
    return await messages.count();
  }

  async getEventCount() {
    const events = this.page.getByTestId("event-item");
    return await events.count();
  }

  async expectMessageExists(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    await expect(messageItem).toBeVisible();
  }

  async expectEventExists(eventDescription: string) {
    const eventItem = this.page.getByTestId("event-item").filter({ hasText: eventDescription });
    await expect(eventItem).toBeVisible();
  }

  async clickMessage(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    await messageItem.click();
  }

  async expandEventDetails(eventDescription: string) {
    const eventItem = this.page.getByTestId("event-item").filter({ hasText: eventDescription });
    const summaryButton = eventItem.getByTestId("event-summary-button");
    await summaryButton.click();

    const eventDetails = eventItem.getByTestId("event-details");
    await expect(eventDetails).toBeVisible();
  }

  async expectEventDetails(eventDescription: string, detailsText: string) {
    const eventItem = this.page.getByTestId("event-item").filter({ hasText: eventDescription });
    const eventDetails = eventItem.getByTestId("event-details");
    await expect(eventDetails).toContainText(detailsText);
  }

  // Message interactions
  async expandQuotedContext(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    const expandButton = messageItem.getByTestId("expand-quoted-context-button");
    await expandButton.click();
  }

  async viewAIReasoning(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    const reasoningButton = messageItem.getByTestId("view-ai-reasoning-button");
    await reasoningButton.click();

    // Wait for popover to appear
    await expect(this.page.locator('[role="dialog"]')).toBeVisible();
  }

  async expectAIReasoningPopover(reasoningText: string) {
    const popover = this.page.locator('[role="dialog"]');
    await expect(popover).toContainText(reasoningText);
  }

  // Attachments
  async expectMessageHasAttachments(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    const attachments = messageItem.getByTestId("message-attachments");
    await expect(attachments).toBeVisible();
  }

  async getAttachmentCount(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    const attachments = messageItem.getByTestId("message-attachments").locator("a");
    return await attachments.count();
  }

  async clickAttachment(messageContent: string, attachmentIndex: number = 0) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    const attachments = messageItem.getByTestId("message-attachments").locator("a");
    await attachments.nth(attachmentIndex).click();
  }

  // Scroll and navigation
  async scrollToTop() {
    const scrollButton = this.page.getByTestId("scroll-to-top-button");
    if (await scrollButton.isVisible()) {
      await scrollButton.click();
    }
  }

  async scrollToBottom() {
    await this.page.getByTestId("message-thread-panel").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  // Conversation summary
  async expectConversationSummary() {
    await expect(this.page.getByTestId("conversation-summary")).toBeVisible();
  }

  async expectPromptIndicator() {
    await expect(this.page.getByTestId("prompt-indicator")).toBeVisible();
  }

  // Message types
  async expectUserMessage(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    await expect(messageItem).toHaveAttribute("data-type", "message");

    const header = messageItem.getByTestId("message-header");
    await expect(header).toBeVisible();
  }

  async expectAIMessage(messageContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    await expect(messageItem).toHaveAttribute("data-type", "message");

    const content = messageItem.getByTestId("message-content");
    await expect(content).toBeVisible();
  }

  async expectNote(noteContent: string) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: noteContent });
    await expect(messageItem).toHaveAttribute("data-type", "note");
  }

  // Wait for real-time updates
  async waitForNewMessage(messageContent: string, timeout: number = 10000) {
    const messageItem = this.page.getByTestId("message-item").filter({ hasText: messageContent });
    await expect(messageItem).toBeVisible({ timeout });
  }

  // General expectations
  async expectConversationLoaded() {
    await expect(this.page.getByTestId("conversation-header")).toBeVisible();
    await expect(this.page.getByTestId("message-thread")).toBeVisible();
    await expect(this.page.getByTestId("messages-container")).toBeVisible();
  }

  async expectConversationEmpty() {
    const messageCount = await this.getMessageCount();
    expect(messageCount).toBe(0);
  }

  async expectNavigationControls() {
    await expect(this.page.getByTestId("previous-conversation-button")).toBeVisible();
    await expect(this.page.getByTestId("next-conversation-button")).toBeVisible();
    await expect(this.page.getByTestId("conversation-counter")).toBeVisible();
  }
}
