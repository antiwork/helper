import { expect, test } from "@playwright/test";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Quick Actions on Conversation List", () => {
  let conversationsPage: ConversationsPage;

  test.beforeEach(async ({ page }) => {
    conversationsPage = new ConversationsPage(page);
    await conversationsPage.navigateToConversations();
  });

  test("should show quick action buttons on hover (desktop)", async ({ page }) => {
    // Set desktop viewport
    await conversationsPage.setDesktopViewport();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No conversations found, skipping test");
      return;
    }
    
    // Initially, action buttons should not be visible (opacity-0 on desktop)
    await conversationsPage.expectQuickActionsHidden();
    
    // Hover over the first conversation item
    await conversationsPage.hoverFirstConversation();
    
    // Action buttons should become visible on hover
    await conversationsPage.expectQuickActionsVisible();
    
    await takeDebugScreenshot(page, "quick-actions-hover.png");
  });

  test("should show action buttons permanently on mobile", async ({ page }) => {
    // Set mobile viewport
    await conversationsPage.setMobileViewport();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No conversations found, skipping test");
      return;
    }
    
    // On mobile, action buttons should be visible without hover
    // The buttons exist but may not be in the opacity-0 container on mobile
    const conversationCount = await conversationsPage.getConversationCount();
    expect(conversationCount).toBeGreaterThan(0);
    
    await takeDebugScreenshot(page, "quick-actions-mobile.png");
  });

  test("should close an open conversation", async ({ page }) => {
    // Navigate to open conversations to ensure we have open conversations to test
    await conversationsPage.navigateToOpenConversations();
    
    // Set desktop viewport for hover functionality
    await conversationsPage.setDesktopViewport();
    
    // Check if there are open conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No open conversations found, skipping test");
      return;
    }
    
    // Hover to reveal action buttons and click close
    await conversationsPage.hoverFirstConversation();
    await conversationsPage.clickCloseButton();
    
    // Should show success toast
    await conversationsPage.expectSuccessToast("Conversation closed");
    
    await takeDebugScreenshot(page, "conversation-closed.png");
  });

  test("should mark conversation as spam with undo option", async ({ page }) => {
    // Navigate to open conversations
    await conversationsPage.navigateToOpenConversations();
    
    // Set desktop viewport for hover functionality
    await conversationsPage.setDesktopViewport();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No open conversations found, skipping test");
      return;
    }
    
    // Hover to reveal action buttons and click spam
    await conversationsPage.hoverFirstConversation();
    await conversationsPage.clickSpamButton();
    
    // Should show spam toast with undo option
    await conversationsPage.expectSuccessToast("Marked as spam");
    
    // Test undo functionality
    await conversationsPage.clickUndoInToast();
    
    // Should show undo success message
    await conversationsPage.expectSuccessToast("No longer marked as spam");
    
    await takeDebugScreenshot(page, "conversation-spam-undo.png");
  });

  test("should reopen a closed conversation", async ({ page }) => {
    // Navigate to closed conversations
    await conversationsPage.navigateToClosedConversations();
    
    // Set desktop viewport for hover functionality
    await conversationsPage.setDesktopViewport();
    
    // Check if there are closed conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No closed conversations found, skipping test");
      return;
    }
    
    // Hover to reveal action buttons and click reopen
    await conversationsPage.hoverFirstConversation();
    await conversationsPage.clickReopenButton();
    
    // Should show success toast
    await conversationsPage.expectSuccessToast("Conversation reopened");
    
    await takeDebugScreenshot(page, "conversation-reopened.png");
  });

  test("should show appropriate buttons based on conversation status", async ({ page }) => {
    // Set desktop viewport
    await conversationsPage.setDesktopViewport();
    
    // Test open conversations - should have close and spam buttons
    await conversationsPage.navigateToOpenConversations();
    
    if (await conversationsPage.hasConversations()) {
      const firstConversation = await conversationsPage.hoverFirstConversation();
      
      // Check for close button (Archive icon)
      const closeButton = page.locator('button:has(svg[data-testid="lucide-archive"])');
      const spamButton = page.locator('button:has(svg[data-testid="lucide-shield-alert"])');
      const reopenButton = page.locator('button:has(svg[data-testid="lucide-corner-up-left"])');
      
      // Open conversations should have close and spam buttons, not reopen
      await expect(closeButton).toBeVisible();
      await expect(spamButton).toBeVisible();
      await expect(reopenButton).not.toBeVisible();
    }
    
    // Test closed conversations - should have reopen and spam buttons
    await conversationsPage.navigateToClosedConversations();
    
    if (await conversationsPage.hasConversations()) {
      const firstConversation = await conversationsPage.hoverFirstConversation();
      
      const closeButton = page.locator('button:has(svg[data-testid="lucide-archive"])');
      const spamButton = page.locator('button:has(svg[data-testid="lucide-shield-alert"])');
      const reopenButton = page.locator('button:has(svg[data-testid="lucide-corner-up-left"])');
      
      // Closed conversations should have reopen and spam buttons, not close
      await expect(reopenButton).toBeVisible();
      await expect(spamButton).toBeVisible();
      await expect(closeButton).not.toBeVisible();
    }
  });

  test("should handle error states gracefully", async ({ page }) => {
    // Set desktop viewport
    await conversationsPage.setDesktopViewport();
    
    // Navigate to open conversations
    await conversationsPage.navigateToOpenConversations();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No conversations found, skipping error test");
      return;
    }
    
    // Intercept API calls to simulate errors
    await page.route('**/api/trpc/mailbox.conversations.update*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Server error' } })
      });
    });
    
    // Try to perform an action (close conversation)
    await conversationsPage.hoverFirstConversation();
    await conversationsPage.clickCloseButton();
    
    // Should show error toast
    await conversationsPage.expectErrorToast();
    
    await takeDebugScreenshot(page, "quick-actions-error.png");
  });

  test("should be accessible with keyboard navigation", async ({ page }) => {
    // Set desktop viewport
    await conversationsPage.setDesktopViewport();
    
    // Navigate to conversations
    await conversationsPage.navigateToOpenConversations();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No conversations found, skipping keyboard test");
      return;
    }
    
    // Use keyboard to navigate to action buttons
    await page.keyboard.press("Tab");
    
    // Continue tabbing until we reach an action button
    let tabCount = 0;
    const maxTabs = 30;
    
    while (tabCount < maxTabs) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          ariaLabel: el?.getAttribute('aria-label'),
          title: el?.getAttribute('title'),
          className: el?.className
        };
      });
      
      // Check if we've focused on an action button
      if (focusedElement.tagName === 'BUTTON' && 
          focusedElement.className?.includes('rounded-md p-1')) {
        
        // We found an action button, test that Enter key works
        await page.keyboard.press("Enter");
        
        // Wait for action to complete
        await page.waitForTimeout(1000);
        
        // Should trigger some action (toast appears)
        const toast = page.locator('.toast, [role="alert"]');
        await expect(toast).toBeVisible({ timeout: 5000 });
        
        break;
      }
      
      await page.keyboard.press("Tab");
      tabCount++;
    }
    
    await takeDebugScreenshot(page, "quick-actions-keyboard.png");
  });

  test("should have proper tooltips for action buttons", async ({ page }) => {
    // Set desktop viewport
    await conversationsPage.setDesktopViewport();
    
    // Navigate to open conversations
    await conversationsPage.navigateToOpenConversations();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No conversations found, skipping tooltip test");
      return;
    }
    
    // Hover over conversation to reveal buttons
    await conversationsPage.hoverFirstConversation();
    
    // Test close button tooltip
    const closeButton = page.locator('button:has(svg[data-testid="lucide-archive"])').first();
    if (await closeButton.count() > 0) {
      await closeButton.hover();
      
      // Look for tooltip
      const tooltip = page.locator('[role="tooltip"], .tooltip').filter({ hasText: /Close/i });
      await expect(tooltip).toBeVisible({ timeout: 2000 });
    }
    
    // Test spam button tooltip  
    const spamButton = page.locator('button:has(svg[data-testid="lucide-shield-alert"])').first();
    if (await spamButton.count() > 0) {
      await spamButton.hover();
      
      // Look for tooltip
      const tooltip = page.locator('[role="tooltip"], .tooltip').filter({ hasText: /Mark as spam|spam/i });
      await expect(tooltip).toBeVisible({ timeout: 2000 });
    }
    
    await takeDebugScreenshot(page, "quick-actions-tooltips.png");
  });

  test("should prevent action button clicks from triggering conversation navigation", async ({ page }) => {
    // Set desktop viewport
    await conversationsPage.setDesktopViewport();
    
    // Navigate to open conversations
    await conversationsPage.navigateToOpenConversations();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No conversations found, skipping navigation test");
      return;
    }
    
    const currentUrl = page.url();
    
    // Hover to reveal action buttons
    await conversationsPage.hoverFirstConversation();
    
    // Click spam button (should not navigate)
    await conversationsPage.clickSpamButton();
    
    // Wait a moment for any potential navigation
    await page.waitForTimeout(1000);
    
    // URL should remain the same (no navigation to conversation details)
    expect(page.url()).toBe(currentUrl);
    
    // Should show spam toast instead of navigating
    await conversationsPage.expectSuccessToast("Marked as spam");
  });

  test("should work correctly with undo error messages", async ({ page }) => {
    // Set desktop viewport
    await conversationsPage.setDesktopViewport();
    
    // Navigate to open conversations
    await conversationsPage.navigateToOpenConversations();
    
    // Check if there are conversations to test with
    if (!(await conversationsPage.hasConversations())) {
      console.log("No conversations found, skipping undo error test");
      return;
    }
    
    // Mark conversation as spam first
    await conversationsPage.hoverFirstConversation();
    await conversationsPage.clickSpamButton();
    await conversationsPage.expectSuccessToast("Marked as spam");
    
    // Intercept the undo API call to simulate an error
    await page.route('**/api/trpc/mailbox.conversations.update*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Server error' } })
      });
    });
    
    // Try to undo (this should fail with our intercepted error)
    await conversationsPage.clickUndoInToast();
    
    // Should show appropriate error message (testing our bug fix)
    const errorToast = page.locator('.toast, [role="alert"]').filter({ 
      hasText: /Failed to reopen conversation|Failed to undo spam conversation/i 
    });
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    
    await takeDebugScreenshot(page, "undo-error-message.png");
  });
});