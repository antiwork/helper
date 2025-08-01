import { expect, type Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class ConversationActionsPage extends BasePage {
  private readonly messageComposer = '[data-testid="message-composer"]';
  private readonly replyButton = '[data-testid="reply-button"]';
  private readonly replyAndCloseButton = '[data-testid="reply-and-close-button"]';
  private readonly closeConversationButton = '[data-testid="close-conversation-button"]';
  private readonly reopenConversationButton = '[data-testid="reopen-conversation-button"]';
  private readonly ccInput = '[data-testid="cc-input"]';
  private readonly bccInput = '[data-testid="bcc-input"]';
  private readonly commandBar = '[data-testid="command-bar"]';
  private readonly commandBarInput = '[data-testid="command-bar-input"]';
  private readonly internalNoteTextarea = '[data-testid="internal-note-textarea"]';
  private readonly addNoteButton = '[data-testid="add-note-button"]';
  private readonly messageElement = '[data-testid="message"]';
  private readonly conversationStatusBadge = '[data-testid="conversation-status-badge"]';
  private readonly issueAssignmentSelect = '[data-testid="issue-assignment-select"]';

  constructor(page: Page) {
    super(page);
  }
  async navigateToConversation(conversationId?: string) {
    if (conversationId) {
      await this.goto(`/conversations?id=${conversationId}`);
    } else {
      await this.goto("/mine");
      await this.waitForPageLoad();
      
      await this.page.waitForLoadState("networkidle");
      await expect(this.page.locator('input[placeholder="Search conversations"]')).toBeVisible({ timeout: 10000 });
      
      const firstConversationLink = this.page.locator('a[href*="/conversations?id="]').first();
      await expect(firstConversationLink).toBeVisible({ timeout: 10000 });
      await firstConversationLink.click();
    }
    await this.page.waitForLoadState("networkidle");
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  async waitForConversationLoad() {
    await expect(this.page.locator('.flex.items-center.border-b.border-border').first()).toBeVisible({ timeout: 10000 });
    await expect(this.page.locator('.flex.h-full.flex-col').first()).toBeVisible({ timeout: 10000 });
  }

  async typeReply(message: string) {
    const composer = this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
    await composer.click({ force: true });
    await composer.clear();
    await composer.fill(message);
  }

  async typeInComposer(message: string) {
    const composer = this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
    await composer.click({ force: true });
    await composer.clear();
    await composer.fill(message);
  }

  async clearReply() {
    const composer = this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
    await composer.click({ force: true });
    await composer.clear();
  }

  async focusComposer() {
    const composer = this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
    await composer.click();
    await composer.focus();
  }  async getComposerText(): Promise<string> {
    const composer = this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
    return await composer.textContent() || '';
  }

  async isComposerFocused(): Promise<boolean> {
    const composer = this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
    return await composer.evaluate(el => document.activeElement === el);
  }

  async clickReplyButton() {
    await this.page.locator(this.replyButton).click();
  }

  async clickReplyAndCloseButton() {
    await this.page.locator(this.replyAndCloseButton).click();
  }

  async sendReply(message: string) {
    await this.typeReply(message);
    await this.clickReplyButton();
    await this.waitForSendingToComplete();
  }

  async sendReplyAndClose(message: string) {
    await this.typeReply(message);
    await this.clickReplyAndCloseButton();
    await this.waitForSendingToComplete();
  }

  async closeConversation() {
    await expect(this.page.locator(this.closeConversationButton)).toBeVisible({ timeout: 5000 });
    await expect(this.page.locator(this.closeConversationButton)).toBeEnabled({ timeout: 5000 });
    
    await Promise.all([
      this.page.waitForResponse(response => response.url().includes('/api/') && response.status() === 200, { timeout: 10000 }),
      this.page.locator(this.closeConversationButton).click()
    ]);
    
    await this.page.waitForTimeout(2000);
  }

  async reopenConversation() {
    await this.page.locator(this.reopenConversationButton).click();
  }

  async assignToIssue(issueTitle: string) {
    await this.page.locator(this.issueAssignmentSelect).click();
    
    await this.page.waitForTimeout(500);
    
    const issueOption = this.page.locator(`[role="option"]`).filter({ hasText: issueTitle });
    await expect(issueOption).toBeVisible({ timeout: 5000 });
    await issueOption.click();
    
    await this.page.waitForTimeout(1000);
  }

  getIssueAssignmentSelect() {
    return this.page.locator(this.issueAssignmentSelect);
  }

  getPage() {
    return this.page;
  }

  async showCCBCCFields() {
    await this.openCommandBar();
    await this.selectCommand('toggle-cc-bcc');
    await this.page.waitForTimeout(500);
    
    const ccVisible = await this.page.locator(this.ccInput).isVisible();
    if (!ccVisible) {
      const toggleSelectors = [
        'button:has-text("CC")',
        'button:has-text("BCC")',
        '[data-testid="cc-bcc-toggle"]',
        'text=CC',
        'text=BCC'
      ];
      
      for (const selector of toggleSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible()) {
            await element.click();
            await this.page.waitForTimeout(500);
            break;
          }
        } catch (e) {
        }
      }
    }
  }

  async addCCRecipient(email: string) {
    await this.showCCBCCFields();
    await this.page.locator(this.ccInput).fill(email);
  }

  async addBCCRecipient(email: string) {
    await this.showCCBCCFields();
    await this.page.locator(this.bccInput).fill(email);
  }

  async addCcRecipient(email: string) {
    await this.showCCBCCFields();
    await this.page.locator(this.ccInput).fill(email);
  }

  async addBccRecipient(email: string) {
    await this.showCCBCCFields();
    await this.page.locator(this.bccInput).fill(email);
  }

  async showCcBccFields() {
    await this.showCCBCCFields();
  }

  async getCcValue(): Promise<string> {
    return await this.page.locator(this.ccInput).inputValue();
  }

  async getBccValue(): Promise<string> {
    return await this.page.locator(this.bccInput).inputValue();
  }

  async isCcFieldVisible(): Promise<boolean> {
    return await this.page.locator(this.ccInput).isVisible();
    return await this.page.getByTestId("cc-input").isVisible();
  }

  async isBccFieldVisible(): Promise<boolean> {
    return await this.page.getByTestId("bcc-input").isVisible();
  }

  async clearCCRecipients() {
    await this.page.getByTestId("cc-input").clear();
  }

  async clearBCCRecipients() {
    await this.page.getByTestId("bcc-input").clear();
  }

  async expectMessageComposerVisible() {
    await expect(this.page.getByTestId("message-composer")).toBeVisible();
  }

  async expectReplyButtonVisible() {
    await expect(this.page.getByTestId("reply-button")).toBeVisible();
  }

  async expectReplyAndCloseButtonVisible() {
    await expect(this.page.getByTestId("reply-and-close-button")).toBeVisible();
  }

  async expectCloseButtonVisible() {
    await expect(this.page.getByTestId("close-conversation-button")).toBeVisible();
  }

  async expectReopenButtonVisible() {
    await expect(this.page.getByTestId("reopen-conversation-button")).toBeVisible();
  }

  async expectCCInputVisible() {
    await expect(this.page.getByTestId("cc-input")).toBeVisible();
  }

  async expectBCCInputVisible() {
    await expect(this.page.getByTestId("bcc-input")).toBeVisible();
  }

  async expectReplyButtonEnabled() {
    await expect(this.page.getByTestId("reply-button")).toBeEnabled();
  }

  async expectReplyButtonDisabled() {
    await expect(this.page.getByTestId("reply-button")).toBeDisabled();
  }

  async expectReplyAndCloseButtonEnabled() {
    await expect(this.page.getByTestId("reply-and-close-button")).toBeEnabled();
  }

  async expectReplyAndCloseButtonDisabled() {
    await expect(this.page.getByTestId("reply-and-close-button")).toBeDisabled();
  }

  async expectMessageComposerContent(expectedContent: string) {
    const content = await this.page.getByTestId("message-composer").textContent();
    expect(content).toContain(expectedContent);
  }

  async expectCCContent(expectedEmail: string) {
    await expect(this.page.getByTestId("cc-input")).toHaveValue(expectedEmail);
  }

  async expectBCCContent(expectedEmail: string) {
    await expect(this.page.getByTestId("bcc-input")).toHaveValue(expectedEmail);
  }

  async expectEmptyMessageComposer() {
    const composer = this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
    
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="message-composer"] [contenteditable="true"]');
      return element && (element.textContent?.trim() === '' || element.textContent?.trim() === undefined);
    }, { timeout: 10000 });
    
    const content = await composer.textContent();
    expect(content?.trim()).toBe("");
  }

  async expectConversationClosed() {
    await expect(this.page.locator(this.conversationStatusBadge)).toHaveText("closed", { timeout: 10000 });
    await expect(this.page.locator(this.closeConversationButton)).toBeDisabled();
  }

  async expectConversationReopened() {
    await expect(this.page.locator(this.conversationStatusBadge)).toHaveText("open", { timeout: 10000 });
    await expect(this.page.locator(this.closeConversationButton)).toBeEnabled();
    await expect(this.page.locator(this.reopenConversationButton)).not.toBeVisible();
  }

  async waitForSendingToComplete() {
    await this.page.waitForLoadState("networkidle");
  }

  async waitForMessageToSend() {
    await this.page.waitForLoadState("networkidle");
  }

  async waitForConversationStatusChange() {
    await this.page.waitForTimeout(1000);
    await this.page.waitForLoadState("networkidle");
  }

  async getConversationStatus(): Promise<string> {
    const closeButton = this.page.getByTestId("close-conversation-button");
    const reopenButton = this.page.getByTestId("reopen-conversation-button");
    
    if (await closeButton.isVisible()) {
      return "open";
    } else if (await reopenButton.isVisible()) {
      return "closed";
    }
    return "unknown";
  }

  async openCommandBar() {
    const composer = this.page.getByTestId("message-composer").locator('[contenteditable="true"]');
    await composer.click({ force: true });
    await this.page.keyboard.press('/');
    await this.page.waitForTimeout(300);
    
    if (await this.isCommandBarVisible()) {
      return;
    }
    
    await this.page.keyboard.press('Control+k');
    await this.page.waitForTimeout(300);
  }

  async typeSlashToOpenCommandBar() {
    await this.page.keyboard.press('/');
    await this.page.waitForTimeout(300);
  }

  async isCommandBarVisible(): Promise<boolean> {
    return await this.page.locator(this.commandBar).isVisible();
  }

  async selectCommand(commandId: string) {
    const commandSelector = `[data-testid="command-${commandId}"]`;
    await this.page.locator(commandSelector).click();
  }

  async typeInCommandBar(text: string) {
    const commandInput = this.page.locator(this.commandBarInput);
    await commandInput.fill(text);
  }

  async getVisibleCommands(): Promise<string[]> {
    const commands = await this.page.locator('[data-testid^="command-"]').allTextContents();
    return commands;
  }

  async waitForCommandBarToClose() {
    await expect(this.page.locator(this.commandBar)).not.toBeVisible({ timeout: 5000 });
  }

  async addInternalNote(noteText: string) {
    const textarea = this.page.locator(this.internalNoteTextarea);
    await textarea.fill(noteText);
    
    const addButton = this.page.locator(this.addNoteButton);
    await addButton.click();
  }

  async isInternalNoteTextareaVisible(): Promise<boolean> {
    return await this.page.locator(this.internalNoteTextarea).isVisible();
  }

  async useKeyboardShortcut(shortcut: string) {
    await this.page.keyboard.press(shortcut);
  }

  async sendReplyWithKeyboard() {
    await this.page.keyboard.press("Control+Enter");
  }

  async sendReplyAndCloseWithKeyboard() {
    await this.page.keyboard.press("Alt+Enter");
  }

  async navigateToNextConversation() {
    const nextConversationLink = this.page.locator('a[href*="/conversations?id="]').nth(1);
    if (await nextConversationLink.isVisible()) {
      await nextConversationLink.click();
    }
  }

  async loadStoredAuthState() {
    try {
      await this.page.goto('/conversations');
      await this.page.waitForLoadState('networkidle');
    } catch (error) {
    }
  }

  getLastMessage() {
    return this.page.locator(this.messageElement).last();
  }

  getConversationStatusLocator() {
    return this.page.locator('[data-testid="conversation-status"]');
  }

  getCcInput() {
    return this.page.locator(this.ccInput);
  }

  getBccInput() {
    return this.page.locator(this.bccInput);
  }

  getCommandBar() {
    return this.page.locator(this.commandBar);
  }

  getCommand(commandId: string) {
    return this.page.getByTestId(`command-${commandId}`);
  }

  getComposer() {
    return this.page.locator(this.messageComposer).locator('[contenteditable="true"]');
  }

  getReplyButton() {
    return this.page.locator(this.replyButton);
  }

  getConversationHeader() {
    return this.page.locator('.flex.items-center.border-b.border-border').first();
  }

  async clickCloseButton() {
    await this.closeConversation();
  }

  async clickReopenButton() {
    await this.reopenConversation();
  }

  async waitForTimeout(ms: number) {
    await this.page.waitForTimeout(ms);
  }

  async pressKey(key: string) {
    await this.page.keyboard.press(key);
  }

  async pressSlashKey() {
    await this.page.keyboard.press('/');
  }

  async pressEscapeKey() {
    await this.page.keyboard.press('Escape');
  }

  async pressControlEnter() {
    await this.page.keyboard.press('Control+Enter');
  }
}
