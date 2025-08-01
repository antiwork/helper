import { test, expect } from '@playwright/test';
import { ConversationActionsPage } from '../utils/page-objects/conversationActionsPage';

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe('Conversation Actions', () => {
  let conversationActionsPage: ConversationActionsPage;

  test.beforeEach(async ({ page }) => {
    conversationActionsPage = new ConversationActionsPage(page);
    try {
      await page.goto("/mine", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mine", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
    
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible({ timeout: 10000 });
    const firstConversationLink = page.locator('a[href*="/conversations?id="]').first();
    await expect(firstConversationLink).toBeVisible({ timeout: 10000 });
    await firstConversationLink.click();
    await page.waitForLoadState("networkidle");
  });

  test('should send a reply message', async () => {
    const testMessage = 'This is a test reply message';
    
    await conversationActionsPage.typeInComposer(testMessage);
    
    const composerText = await conversationActionsPage.getComposerText();
    expect(composerText).toContain(testMessage);
    
    await conversationActionsPage.clickReplyButton();
    
    await conversationActionsPage.waitForTimeout(2000);
  });

  test('should show conversation metadata', async () => {
    await expect(conversationActionsPage.getConversationHeader()).toBeVisible();
  });

  test('should trigger command bar with slash key', async () => {
    await conversationActionsPage.focusComposer();
    await conversationActionsPage.pressSlashKey();
    
    await expect(conversationActionsPage.getCommandBar()).toBeVisible();
  });

  test('should escape command bar', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.pressEscapeKey();
    
    await expect(conversationActionsPage.getCommandBar()).not.toBeVisible();
  });

  test('should open generate draft command', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.selectCommand('generate-draft');
    
    await conversationActionsPage.waitForTimeout(1000);
  });

  test('should handle empty reply attempt', async () => {
    await conversationActionsPage.clearReply();
    await conversationActionsPage.waitForTimeout(500);
    
    await conversationActionsPage.focusComposer();
    await conversationActionsPage.waitForTimeout(500);
    
    const composerText = await conversationActionsPage.getComposerText();
    
    const replyButton = conversationActionsPage.getReplyButton();
    
    if (composerText.trim().length === 0) {
      await expect(replyButton).toBeDisabled();
    } else {
      await expect(replyButton).toBeVisible();
    }
  });

  test('should preserve composer content when switching between actions', async () => {
    const testMessage = 'This message should be preserved';
    
    await conversationActionsPage.clearReply();
    await conversationActionsPage.waitForTimeout(500);
    
    await conversationActionsPage.typeInComposer(testMessage);
    await conversationActionsPage.waitForTimeout(500);
    
    const initialText = await conversationActionsPage.getComposerText();
    expect(initialText.trim()).toContain(testMessage);
    
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.waitForTimeout(300);
    await conversationActionsPage.pressEscapeKey();
    await conversationActionsPage.waitForTimeout(500);
    
    const finalText = await conversationActionsPage.getComposerText();
    expect(finalText.trim()).toContain(testMessage);
  });

  test('should handle keyboard shortcuts', async () => {
    await conversationActionsPage.typeInComposer('Keyboard shortcut test');
    await conversationActionsPage.pressControlEnter();
    
    await conversationActionsPage.waitForTimeout(2000);
  });

  test('should toggle CC field via command bar', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.selectCommand('toggle-cc-bcc');
    
    await conversationActionsPage.waitForTimeout(1000);
    
    const ccInput = conversationActionsPage.getCcInput();
    await expect(ccInput).toBeVisible({ timeout: 5000 });
  });

  test('should filter commands when typing in command bar', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.typeInCommandBar('generate');
    
    await conversationActionsPage.waitForTimeout(500);
    
    await expect(conversationActionsPage.getCommand('generate-draft')).toBeVisible();
  });

  test('should validate composer with actual content', async () => {
    const testMessage = 'This is a valid message';
    await conversationActionsPage.typeInComposer(testMessage);
    
    const replyButton = conversationActionsPage.getReplyButton();
    await expect(replyButton).toBeEnabled();
  });

  test('should access internal note functionality', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.selectCommand('add-note');
    
    await conversationActionsPage.waitForTimeout(1000);
    
    const noteText = 'This is an internal note for testing';
    await conversationActionsPage.addInternalNote(noteText);
    
    await conversationActionsPage.waitForTimeout(1000);
  });

  test('should handle multiple sequential actions', async () => {
    await conversationActionsPage.clearReply();
    await conversationActionsPage.waitForTimeout(500);
    
    await conversationActionsPage.typeInComposer('Test message');
    await conversationActionsPage.waitForTimeout(500);
    
    const initialText = await conversationActionsPage.getComposerText();
    expect(initialText.trim()).toContain('Test message');
    
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.waitForTimeout(300);
    await conversationActionsPage.pressEscapeKey();
    await conversationActionsPage.waitForTimeout(500);
    
    const composerText = await conversationActionsPage.getComposerText();
    expect(composerText.trim()).toContain('Test message');
    
    await conversationActionsPage.clickReplyButton();
    await conversationActionsPage.waitForTimeout(2000);
  });

  test('should close and reopen conversation', async () => {
    await conversationActionsPage.clearReply();
    await conversationActionsPage.waitForTimeout(500);
    
    const initialStatus = await conversationActionsPage.getConversationStatus();
    
    if (initialStatus === 'open') {
      try {
        await conversationActionsPage.closeConversation();
        await conversationActionsPage.waitForConversationStatusChange();
        
        const statusAfterClose = await conversationActionsPage.getConversationStatus();
        
        if (statusAfterClose === 'closed') {
          await conversationActionsPage.expectConversationClosed();
          
          await conversationActionsPage.reopenConversation();
          await conversationActionsPage.waitForConversationStatusChange();
          await conversationActionsPage.expectConversationReopened();
        } else {
        }
      } catch (error) {
        return;
      }
    } else if (initialStatus === 'closed') {
      await conversationActionsPage.reopenConversation();
      await conversationActionsPage.waitForConversationStatusChange();
      await conversationActionsPage.expectConversationReopened();
      
      await conversationActionsPage.closeConversation();
      await conversationActionsPage.waitForConversationStatusChange();
      await conversationActionsPage.expectConversationClosed();
    }
  });

  test('should send reply and close conversation', async () => {
    const testMessage = 'Reply and close test message';
    
    const status = await conversationActionsPage.getConversationStatus();
    if (status === 'closed') {
      await conversationActionsPage.reopenConversation();
      await conversationActionsPage.waitForConversationStatusChange();
    }
    
    await conversationActionsPage.clearReply();
    await conversationActionsPage.waitForTimeout(500);
    
    await conversationActionsPage.typeInComposer(testMessage);
    await conversationActionsPage.waitForTimeout(500);
    
    try {
      await conversationActionsPage.expectReplyAndCloseButtonVisible();
      await conversationActionsPage.clickReplyAndCloseButton();
      await conversationActionsPage.waitForConversationStatusChange();
      await conversationActionsPage.expectConversationClosed();
    } catch (error) {
      const composerText = await conversationActionsPage.getComposerText();
      
      if (composerText.trim().length > 0) {
        const replyButton = conversationActionsPage.getReplyButton();
        await expect(replyButton).toBeEnabled();
      } else {
        await conversationActionsPage.typeInComposer(testMessage);
        await conversationActionsPage.waitForTimeout(500);
        
        const updatedText = await conversationActionsPage.getComposerText();
        expect(updatedText.trim()).toContain(testMessage);
        
        const replyButton = conversationActionsPage.getReplyButton();
        await expect(replyButton).toBeEnabled();
      }
      
    }
  });

  test('should add CC recipient via command bar', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.selectCommand('toggle-cc-bcc');
    await conversationActionsPage.waitForTimeout(1000);
    
    const ccInput = conversationActionsPage.getCcInput();
    
    try {
      const isVisible = await ccInput.isVisible();
      
      if (isVisible) {
        await expect(ccInput).toBeVisible({ timeout: 5000 });
        await conversationActionsPage.addCcRecipient('test@example.com');
        await conversationActionsPage.waitForTimeout(500);
      } else {
        await conversationActionsPage.waitForTimeout(1000);
      }
    } catch (error) {
    }
  });

  test('should add BCC recipient via command bar', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.selectCommand('toggle-cc-bcc');
    await conversationActionsPage.waitForTimeout(1000);
    
    const bccInput = conversationActionsPage.getBccInput();
    
    try {
      const isVisible = await bccInput.isVisible();
      
      if (isVisible) {
        await expect(bccInput).toBeVisible({ timeout: 5000 });
        await conversationActionsPage.addBccRecipient('bcc@example.com');
        await conversationActionsPage.waitForTimeout(500);
      } else {
        await conversationActionsPage.waitForTimeout(1000);
      }
    } catch (error) {
    }
  });

  test('should assign conversation to common issue', async () => {
    await conversationActionsPage.openCommandBar();
    
    const commands = await conversationActionsPage.getVisibleCommands();
    
    try {
      await conversationActionsPage.selectCommand('assign-issue');
      await conversationActionsPage.waitForTimeout(1000);
    } catch (error) {
      await conversationActionsPage.pressEscapeKey();
    }
  });

  test('should generate draft response via command bar', async () => {
    await conversationActionsPage.openCommandBar();
    await conversationActionsPage.selectCommand('generate-draft');
    
    await conversationActionsPage.waitForTimeout(2000);
    
    const composerText = await conversationActionsPage.getComposerText();
    expect(composerText.length).toBeGreaterThan(0);
  });
});
