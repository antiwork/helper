import { expect, type Page } from "@playwright/test";

// Standard selector for conversation links across all tests
export const CONVERSATION_LINKS_SELECTOR = 'a[href*="/conversations?id="]';

/**
 * Navigate to a conversation, handling cases where there might be no conversations
 * in /mine and checking /unassigned as fallback
 */
export async function navigateToAnyConversation(page: Page): Promise<boolean> {
  // Try /mine first
  await page.goto("/mine");

  // Wait for the page to actually load - look for key elements
  await page.waitForSelector('input[placeholder="Search conversations"]', { timeout: 10000 });

  // Give the conversations time to render
  await page.waitForTimeout(1000);

  let conversationLinks = page.locator(CONVERSATION_LINKS_SELECTOR);
  let count = await conversationLinks.count();

  if (count === 0) {
    // Try /unassigned
    await page.goto("/unassigned");

    // Wait for the page to actually load
    await page.waitForSelector('input[placeholder="Search conversations"]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    conversationLinks = page.locator(CONVERSATION_LINKS_SELECTOR);
    count = await conversationLinks.count();
  }

  if (count > 0) {
    await conversationLinks.first().click();

    // Wait for conversation to load - look for message content
    await page.waitForSelector(".prose", { timeout: 10000 }).catch(() => {
      // Fallback: wait for any conversation content
      return page
        .waitForSelector('[data-testid="conversation-content"], .conversation-message, .message-content', {
          timeout: 10000,
        })
        .catch(() => {});
    });

    return true;
  }

  return false;
}

/**
 * Get the count of conversations, checking both /mine and /unassigned
 */
export async function getTotalConversationCount(page: Page): Promise<number> {
  // Check /mine
  await page.goto("/mine");
  await page.waitForSelector('input[placeholder="Search conversations"]', { timeout: 10000 });
  await page.waitForTimeout(1000); // Give conversations time to render

  const mineCount = await page.locator(CONVERSATION_LINKS_SELECTOR).count();

  // Check /unassigned
  await page.goto("/unassigned");
  await page.waitForSelector('input[placeholder="Search conversations"]', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const unassignedCount = await page.locator(CONVERSATION_LINKS_SELECTOR).count();

  return mineCount + unassignedCount;
}

/**
 * Ensure we have at least N conversations available for testing
 */
export async function ensureMinimumConversations(page: Page, minimum: number): Promise<void> {
  const total = await getTotalConversationCount(page);

  if (total < minimum) {
    throw new Error(
      `Test requires at least ${minimum} conversations but only ${total} found. ` +
        `Please ensure test data is properly seeded.`,
    );
  }
}

/**
 * Wait for a setting to be saved (looking for save indicator to appear and disappear)
 */
export async function waitForSettingSaved(page: Page) {
  // Multiple strategies to detect save completion

  // Strategy 1: Look for "Saving" indicator
  const savingIndicator = page.locator('text="Saving"');
  const savedIndicator = page.locator('text="Saved"');

  // Wait for either saving to start or saved to appear
  await Promise.race([
    savingIndicator.waitFor({ state: "visible", timeout: 3000 }).catch(() => {}),
    savedIndicator.waitFor({ state: "visible", timeout: 3000 }).catch(() => {}),
  ]);

  // If saving appeared, wait for it to disappear
  if (await savingIndicator.isVisible().catch(() => false)) {
    await savingIndicator.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  }

  // Check if saved indicator is visible
  if (await savedIndicator.isVisible().catch(() => false)) {
    // Wait a bit for it to stabilize
    await page.waitForTimeout(500);
  }

  // Additional wait to ensure the setting has propagated
  await page.waitForTimeout(1000);
}

/**
 * Enable or disable a setting toggle
 */
export async function setToggleState(page: Page, toggleSelector: string, enabled: boolean): Promise<void> {
  const toggle = page.locator(toggleSelector).first();
  await expect(toggle).toBeVisible({ timeout: 10000 });

  const currentState = await toggle.getAttribute("data-state");
  const isCurrentlyChecked = currentState === "checked";

  if (isCurrentlyChecked !== enabled) {
    await toggle.click();
    await waitForSettingSaved(page);

    // Verify the state changed
    const newState = await toggle.getAttribute("data-state");
    const isNowChecked = newState === "checked";
    expect(isNowChecked).toBe(enabled);
  }
}
