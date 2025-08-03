import { expect, type Locator, type Page } from "@playwright/test";

type ConversationId = string;
type MessageContent = string;
type EventDescription = string;
type AttachmentIndex = number;

export class ConversationDetailsPage {
  readonly page: Page;

  private readonly TIMEOUTS = {
    DEFAULT: 10000,
    SCROLL_ANIMATION: 300,
    SCROLL_VERIFICATION: 200,
    NETWORK_IDLE: "networkidle" as const,
  } as const;

  private readonly ROUTES = {
    CONVERSATIONS: "/conversations",
    CONVERSATION_WITH_ID: (id: ConversationId) => `/conversations?id=${id}`,
  } as const;

  private readonly TEST_IDS = {
    CONVERSATION_HEADER: "conversation-header",
    MESSAGE_THREAD: "message-thread",
    MESSAGES_CONTAINER: "messages-container",
    CONVERSATION_LIST_ITEM: "conversation-list-item",
    TOGGLE_SIDEBAR_BUTTON: "toggle-sidebar-button",
    CONVERSATION_SUBJECT: "conversation-subject",
    CONVERSATION_COUNTER: "conversation-counter",
    MESSAGE_ITEM: "message-item",
    EVENT_ITEM: "event-item",
    EVENT_DETAILS: "event-details",
    VIEW_AI_REASONING_BUTTON: "view-ai-reasoning-button",
    MESSAGE_ATTACHMENTS: "message-attachments",
    MESSAGE_THREAD_PANEL: "message-thread-panel",
    CONVERSATION_SUMMARY: "conversation-summary",
    PROMPT_INDICATOR: "prompt-indicator",
    MESSAGE_HEADER: "message-header",
    MESSAGE_CONTENT: "message-content",
    MESSAGE_FOOTER: "message-footer",
  } as const;

  private readonly SCROLL_POSITIONS = {
    TEST_SCROLL: 300,
  } as const;

  private readonly COUNTER_PATTERN = /^\d+ of \d+\+?$/;
  private readonly NOTE_BUTTON_PATTERN = /note|internal/i;
  private readonly SUBMIT_BUTTON_PATTERN = /save|add|submit/i;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToConversation(conversationId?: ConversationId) {
    if (conversationId) {
      await this.page.goto(this.ROUTES.CONVERSATION_WITH_ID(conversationId));
    } else {
      await this.page.goto(this.ROUTES.CONVERSATIONS);
      await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);

      const firstConversation = this.getConversationListItem().first();
      const conversationLink = firstConversation.locator("a").first();
      await conversationLink.click();
    }

    await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);

    await this.page.waitForFunction(
      () => {
        const url = new URL(window.location.href);
        return url.searchParams.has("id") || url.pathname.includes("/conversations");
      },
      { timeout: this.TIMEOUTS.DEFAULT },
    );
  }

  async waitForConversationLoad() {
    await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);
    await expect(this.getSubjectElement()).toBeVisible({ timeout: this.TIMEOUTS.DEFAULT });
    await expect(this.getConversationHeader()).toBeVisible();
    await expect(this.getMessageThread()).toBeVisible();
  }

  async closeConversation() {
    await this.getCloseButton().click();
  }

  async goToPreviousConversation() {
    await this.getPreviousButton().click();
    await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);
  }

  async goToNextConversation() {
    await this.getNextButton().click();
    await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);
  }

  async toggleSidebar() {
    await this.getSidebarToggleButton().click();
  }

  async getConversationSubject() {
    const subject = await this.getSubjectElement().textContent();
    return subject?.trim() || "";
  }

  async getConversationCounter() {
    const counter = await this.getCounterElement().textContent();
    return counter?.trim() || "";
  }

  async expectConversationSubject(expectedSubject: string) {
    await expect(this.getSubjectElement()).toContainText(expectedSubject);
  }

  async getMessageCount() {
    const messages = this.getAllMessages();
    return await messages.count();
  }

  async getEventCount() {
    const events = this.getAllEvents();
    return await events.count();
  }

  async expectMessageExists(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    await expect(messageItem).toBeVisible();
  }

  async expectEventExists(eventDescription: EventDescription) {
    const eventItem = this.findEventByDescription(eventDescription);
    await expect(eventItem).toBeVisible();
  }

  async clickMessage(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    await messageItem.click();
  }

  async expandEventDetails(eventDescription: EventDescription) {
    const eventItem = this.findEventByDescription(eventDescription);
    const summaryButton = eventItem.locator("button[aria-label='Toggle event details']");
    await summaryButton.click();

    const eventDetails = eventItem.getByTestId(this.TEST_IDS.EVENT_DETAILS);
    await expect(eventDetails).toBeVisible();
  }

  async expectEventDetails(eventDescription: EventDescription, detailsText: string) {
    const eventItem = this.findEventByDescription(eventDescription);
    const eventDetails = eventItem.getByTestId(this.TEST_IDS.EVENT_DETAILS);
    await expect(eventDetails).toContainText(detailsText);
  }

  async expandQuotedContext(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    const expandButton = messageItem.locator("button[aria-label='Toggle quoted context']");
    await expandButton.click();
  }

  async viewAIReasoning(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    const reasoningButton = messageItem.getByTestId(this.TEST_IDS.VIEW_AI_REASONING_BUTTON);
    await reasoningButton.click();

    await expect(this.page.locator('[role="dialog"]')).toBeVisible();
  }

  async expectAIReasoningPopover(reasoningText: string) {
    const popover = this.page.locator('[role="dialog"]');
    await expect(popover).toContainText(reasoningText);
  }

  async expectMessageHasAttachments(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    const attachments = this.getMessageAttachments(messageItem);
    await expect(attachments).toBeVisible();
  }

  async getAttachmentCount(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    const attachments = this.getMessageAttachments(messageItem).locator("a");
    return await attachments.count();
  }

  async clickAttachment(messageContent: MessageContent, attachmentIndex: AttachmentIndex = 0) {
    const messageItem = this.findMessageByContent(messageContent);
    const attachments = this.getMessageAttachments(messageItem).locator("a");
    await attachments.nth(attachmentIndex).click();
  }

  async scrollToTop() {
    const scrollButton = this.getScrollToTopButton();
    if (await scrollButton.isVisible()) {
      await scrollButton.click();
    }
  }

  async scrollToBottom() {
    await this.getMessageThreadPanel().evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  async expectConversationSummary() {
    await expect(this.getSummaryElement()).toBeVisible();
  }

  async expectPromptIndicator() {
    await expect(this.getPromptIndicatorElement()).toBeVisible();
  }

  async expectUserMessage(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    await expect(messageItem).toHaveAttribute("data-type", "message");

    const header = this.getMessageHeader(messageItem);
    await expect(header).toBeVisible();
  }

  async expectAIMessage(messageContent: MessageContent) {
    const messageItem = this.findMessageByContent(messageContent);
    await expect(messageItem).toHaveAttribute("data-type", "message");

    const content = this.getMessageContent(messageItem);
    await expect(content).toBeVisible();
  }

  async expectNote(noteContent: MessageContent) {
    const messageItem = this.findMessageByContent(noteContent);
    await expect(messageItem).toHaveAttribute("data-type", "note");
  }

  async waitForNewMessage(messageContent: MessageContent, timeout: number = this.TIMEOUTS.DEFAULT) {
    const messageItem = this.findMessageByContent(messageContent);
    await expect(messageItem).toBeVisible({ timeout });
  }

  async expectConversationLoaded() {
    await expect(this.getSubjectElement()).toBeVisible();
    await expect(this.getConversationHeader()).toBeVisible();
    await expect(this.getMessageThread()).toBeVisible();
    await expect(this.getMessagesContainer()).toBeVisible();
  }

  async expectConversationEmpty() {
    const messageCount = await this.getMessageCount();
    expect(messageCount).toBe(0);
  }

  async expectNavigationControls() {
    await expect(this.getPreviousButton()).toBeVisible();
    await expect(this.getNextButton()).toBeVisible();
    await expect(this.getCounterElement()).toBeVisible();
  }

  async performScrollTest() {
    const messageCount = await this.getMessageCount();

    if (messageCount > 0) {
      const messageThreadPanel = this.getMessageThreadPanel();

      await messageThreadPanel.evaluate((el, scrollPos) => {
        el.scrollTop = scrollPos;
      }, this.SCROLL_POSITIONS.TEST_SCROLL);

      await this.page.waitForTimeout(this.TIMEOUTS.SCROLL_ANIMATION);

      const scrollButton = this.getScrollToTopButton();
      await expect(scrollButton).toBeAttached();

      if (await scrollButton.isVisible()) {
        await scrollButton.click();
        await this.page.waitForTimeout(this.TIMEOUTS.SCROLL_VERIFICATION);

        const newScrollTop = await messageThreadPanel.evaluate((el) => el.scrollTop);
        expect(newScrollTop).toBeLessThan(this.SCROLL_POSITIONS.TEST_SCROLL);
      }
    }
  }

  async validateCounterFormat() {
    const counter = await this.getConversationCounter();
    expect(counter).toMatch(this.COUNTER_PATTERN);

    const match = counter.match(/^(\d+) of (\d+)\+?$/);
    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      expect(current).toBeGreaterThan(0);
      expect(current).toBeLessThanOrEqual(total);
    }

    return counter;
  }

  async createInternalNoteIfAvailable(testNote: string) {
    const addNoteButton = this.page.locator("button").filter({ hasText: this.NOTE_BUTTON_PATTERN }).first();
    const addNoteExists = await addNoteButton.count();

    if (addNoteExists > 0 && (await addNoteButton.isVisible())) {
      await addNoteButton.click();

      const noteInput = this.page.locator('textarea, [data-testid="tiptap-editor-content"] .ProseMirror').first();

      if (await noteInput.isVisible()) {
        await noteInput.fill(testNote);

        const submitButton = this.page.getByRole("button", { name: this.SUBMIT_BUTTON_PATTERN });
        await submitButton.click();

        await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);
        await this.expectMessageExists(testNote);
        return true;
      }
    }
    return false;
  }

  private getConversationHeader(): Locator {
    return this.page.getByTestId(this.TEST_IDS.CONVERSATION_HEADER);
  }

  private getMessageThread(): Locator {
    return this.page.getByTestId(this.TEST_IDS.MESSAGE_THREAD);
  }

  private getMessagesContainer(): Locator {
    return this.page.getByTestId(this.TEST_IDS.MESSAGES_CONTAINER);
  }

  private getConversationListItem(): Locator {
    return this.page.getByTestId(this.TEST_IDS.CONVERSATION_LIST_ITEM);
  }

  private getCloseButton(): Locator {
    return this.page.locator("button[aria-label='Close conversation']");
  }

  private getPreviousButton(): Locator {
    return this.page.locator("button[aria-label='Previous conversation']");
  }

  private getNextButton(): Locator {
    return this.page.locator("button[aria-label='Next conversation']");
  }

  private getSidebarToggleButton(): Locator {
    return this.page.getByTestId(this.TEST_IDS.TOGGLE_SIDEBAR_BUTTON);
  }

  private getSubjectElement(): Locator {
    return this.page.getByTestId(this.TEST_IDS.CONVERSATION_SUBJECT);
  }

  private getCounterElement(): Locator {
    return this.page.getByTestId(this.TEST_IDS.CONVERSATION_COUNTER);
  }

  private getAllMessages(): Locator {
    return this.page.getByTestId(this.TEST_IDS.MESSAGE_ITEM);
  }

  private getAllEvents(): Locator {
    return this.page.getByTestId(this.TEST_IDS.EVENT_ITEM);
  }

  private getScrollToTopButton(): Locator {
    return this.page.locator("[aria-label='Scroll to top']");
  }

  private getMessageThreadPanel(): Locator {
    return this.page.getByTestId(this.TEST_IDS.MESSAGE_THREAD_PANEL);
  }

  private getSummaryElement(): Locator {
    return this.page.getByTestId(this.TEST_IDS.CONVERSATION_SUMMARY);
  }

  private getPromptIndicatorElement(): Locator {
    return this.page.getByTestId(this.TEST_IDS.PROMPT_INDICATOR);
  }

  private findMessageByContent(messageContent: MessageContent): Locator {
    return this.getAllMessages().filter({ hasText: messageContent });
  }

  private findEventByDescription(eventDescription: EventDescription): Locator {
    return this.getAllEvents().filter({ hasText: eventDescription });
  }

  private getMessageHeader(messageItem: Locator): Locator {
    return messageItem.getByTestId(this.TEST_IDS.MESSAGE_HEADER);
  }

  private getMessageContent(messageItem: Locator): Locator {
    return messageItem.getByTestId(this.TEST_IDS.MESSAGE_CONTENT);
  }

  private getMessageAttachments(messageItem: Locator): Locator {
    return messageItem.getByTestId(this.TEST_IDS.MESSAGE_ATTACHMENTS);
  }
}
