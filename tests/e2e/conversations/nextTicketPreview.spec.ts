import { expect, test } from "@playwright/test";
import {
  CONVERSATION_LINKS_SELECTOR,
  ensureMinimumConversations,
  getTotalConversationCount,
  navigateToAnyConversation,
  setToggleState,
  waitForSettingSaved,
} from "../utils/conversationHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Next Ticket Preview", () => {

  test("should show Next Ticket Preview when enabled and multiple conversations exist", async ({ page }) => {
    // First ensure we have enough conversations for the test
    const conversationCount = await getTotalConversationCount(page);
    
    if (conversationCount < 2) {
      test.skip();
      return;
    }

    // Enable the setting
    await page.goto("/settings/preferences");
    
    // Wait for settings page to load completely
    await page.waitForSelector('h1:has-text("Preferences"), h2:has-text("Preferences")', { timeout: 15000 });
    await page.waitForTimeout(1000); // Allow React to fully render
    
    // Enable Next Ticket Preview
    await setToggleState(
      page,
      'button[role="switch"][aria-label="Show Next Ticket Preview Switch"]',
      true
    );
    
    // Give the setting time to persist
    await page.waitForTimeout(1000);

    // Navigate to a conversation
    const hasConversation = await navigateToAnyConversation(page);
    expect(hasConversation).toBe(true);
    
    // Wait a bit for the Next Ticket Preview to render
    await page.waitForTimeout(1500);

    // Next Ticket Preview should be visible - use more flexible selector
    const nextTicketPreview = page.locator('h4').filter({ 
      hasText: /^(Next|First) Ticket/i 
    }).first();
    await expect(nextTicketPreview).toBeVisible({ timeout: 15000 });

    // Should have a Switch button
    const switchButton = page.locator('button').filter({ hasText: /Switch to/i });
    await expect(switchButton).toBeVisible({ timeout: 10000 });
    
    // Should show customer info (email)
    const customerInfo = page.locator('text=/@/i').first();
    await expect(customerInfo).toBeVisible({ timeout: 10000 });
  });

  test("should not show Next Ticket Preview when disabled", async ({ page }) => {
    // Disable the setting
    await page.goto("/settings/preferences");
    
    // Wait for settings page to load
    await page.waitForSelector('h1:has-text("Preferences"), h2:has-text("Preferences")', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // Disable Next Ticket Preview
    await setToggleState(
      page,
      'button[role="switch"][aria-label="Show Next Ticket Preview Switch"]',
      false
    );
    
    // Give the setting time to persist
    await page.waitForTimeout(1500);

    // Navigate to a conversation
    const hasConversation = await navigateToAnyConversation(page);
    
    if (!hasConversation) {
      test.skip();
      return;
    }
    
    // Wait to ensure the page has rendered
    await page.waitForTimeout(2000);

    // Next Ticket Preview should NOT be visible
    const nextTicketPreview = page.locator('h4').filter({ 
      hasText: /^(Next|First) Ticket/i 
    });
    await expect(nextTicketPreview).not.toBeVisible({ timeout: 5000 });
    
    // Switch button should NOT be visible
    const switchButton = page.locator('button').filter({ hasText: /Switch to/i });
    await expect(switchButton).not.toBeVisible({ timeout: 5000 });
  });

  test("should navigate to next conversation when Switch button is clicked", async ({ page }) => {
    // First ensure we have enough conversations
    await ensureMinimumConversations(page, 2);

    // Enable the feature
    await page.goto("/settings/preferences");
    
    // Wait for settings page
    await page.waitForSelector('h1:has-text("Preferences"), h2:has-text("Preferences")', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // Enable Next Ticket Preview
    await setToggleState(
      page,
      'button[role="switch"][aria-label="Show Next Ticket Preview Switch"]',
      true
    );
    
    // Give setting time to persist
    await page.waitForTimeout(1000);

    // Navigate to first conversation
    const hasConversation = await navigateToAnyConversation(page);
    expect(hasConversation).toBe(true);

    // Get initial URL
    const initialUrl = page.url();
    
    // Wait for Next Ticket Preview to load
    await page.waitForTimeout(1500);
    const nextTicketPreview = page.locator('h4').filter({ 
      hasText: /^(Next|First) Ticket/i 
    }).first();
    await expect(nextTicketPreview).toBeVisible({ timeout: 15000 });

    // Find and click Switch button
    const switchButton = page.locator('button').filter({ hasText: /Switch to/i }).first();
    await expect(switchButton).toBeVisible({ timeout: 10000 });
    
    // Click and wait for navigation
    await Promise.all([
      page.waitForURL((url) => url.toString() !== initialUrl, { timeout: 10000 }),
      switchButton.click()
    ]);
    
    // Verify URL changed
    const newUrl = page.url();
    expect(newUrl).not.toBe(initialUrl);
    expect(newUrl).toMatch(/\/(mine|unassigned|all|assigned)\?id=/);
  });

  test("should not show Next Ticket Preview with only one conversation", async ({ page }) => {
    const conversationCount = await getTotalConversationCount(page);
    
    // Skip test if we have multiple conversations (can't test this scenario)
    if (conversationCount > 1) {
      test.skip();
      return;
    }

    // Enable the setting
    await page.goto("/settings/preferences");
    
    // Wait for settings page
    await page.waitForSelector('h1:has-text("Preferences"), h2:has-text("Preferences")', { timeout: 15000 });
    await page.waitForTimeout(1000);
    
    // Enable Next Ticket Preview
    await setToggleState(
      page,
      'button[role="switch"][aria-label="Show Next Ticket Preview Switch"]',
      true
    );
    
    // Give setting time to persist
    await page.waitForTimeout(1000);

    // Navigate to the single conversation
    const hasConversation = await navigateToAnyConversation(page);
    
    if (!hasConversation) {
      test.skip();
      return;
    }
    
    // Wait to ensure page is rendered
    await page.waitForTimeout(2000);

    // Next Ticket Preview should NOT be visible (only one conversation)
    const nextTicketPreview = page.locator('h4').filter({ 
      hasText: /^(Next|First) Ticket/i 
    });
    await expect(nextTicketPreview).not.toBeVisible({ timeout: 5000 });
  });
});