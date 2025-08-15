import { expect, test } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Unread Message Indicators", () => {
  test("Complete unread reply indicators user journey", async ({ page }) => {
    await page.goto("/mine");
    await page.waitForLoadState("domcontentloaded");

    // Check if there are any unread conversations
    const unreadButton = page.locator('button:has-text("unread")');
    const yellowCircles = page.locator("span.bg-yellow-500");
    const unreadConversations = page.locator('[class*="bg-blue-50"]');

    // Test visual indicators if unread messages exist
    if ((await yellowCircles.count()) > 0) {
      await takeDebugScreenshot(page, "unread-indicators-overview.png");

      // 1. Verify yellow circle indicators
      await expect(yellowCircles.first()).toBeVisible();
      await expect(yellowCircles.first()).toHaveClass(/bg-yellow-500/);
      await expect(yellowCircles.first()).toHaveClass(/rounded-full/);

      // 2. Verify blue conversation styling
      if ((await unreadConversations.count()) > 0) {
        const firstUnreadConversation = unreadConversations.first();
        await expect(firstUnreadConversation).toHaveClass(/bg-blue-50/);
        await expect(firstUnreadConversation).toHaveClass(/border-l-blue-500/);
        await expect(firstUnreadConversation).toHaveClass(/font-bold/);
      }

      // 3. Test hover tooltip on yellow circle
      const firstCircle = yellowCircles.first();
      await firstCircle.hover();
      const tooltip = page.locator('[role="tooltip"]');
      await expect(tooltip).toBeVisible();
      const tooltipText = await tooltip.textContent();
      expect(tooltipText).toMatch(/^\d+ unread messages?$/);
      await takeDebugScreenshot(page, "tooltip-hover.png");

      // 4. Test sidebar unread count and filtering
      if (await unreadButton.isVisible()) {
        // Verify sidebar count format
        const buttonText = await unreadButton.textContent();
        expect(buttonText).toMatch(/^\d+ unread$/);

        // Test filter functionality
        await unreadButton.click();
        await page.waitForURL(/hasUnreadReplies=true/, { timeout: 5000 });
        await expect(page).toHaveURL(/hasUnreadReplies=true/);
        await expect(unreadButton).toHaveClass(/text-blue-600/);
        await takeDebugScreenshot(page, "filtered-conversations.png");

        // Verify filtered conversations have unread styling
        const visibleConversations = page.locator('a[href*="/conversations?id="]');
        const filteredCount = await visibleConversations.count();
        if (filteredCount > 0) {
          for (let i = 0; i < Math.min(filteredCount, 3); i++) {
            const conversation = visibleConversations.nth(i);
            const parentContainer = conversation.locator("..");
            await expect(parentContainer).toHaveClass(/bg-blue-50/);
          }
        }

        // Remove filter
        await unreadButton.click();
        await page.waitForURL((url) => !url.searchParams.has('hasUnreadReplies'), { timeout: 5000 });
        await expect(page).not.toHaveURL(/hasUnreadReplies=true/);
        await expect(unreadButton).not.toHaveClass(/text-blue-600/);
      }

      // 5. Test mark-as-read behavior
      if ((await unreadConversations.count()) > 0) {
        const firstUnreadConversation = unreadConversations.first();
        const conversationLink = firstUnreadConversation.locator('a[href*="/conversations?id="]').first();
        await expect(conversationLink).toBeVisible();
        const href = await conversationLink.getAttribute('href');

        await takeDebugScreenshot(page, "before-reading.png");

        // Click conversation to read it
        await conversationLink.click();
        await page.waitForLoadState("domcontentloaded");
        await page.waitForResponse(response => 
          response.url().includes('markAsRead') && response.status() === 200,
          { timeout: 5000 }
        );

        // Go back and verify unread styling removed
        await page.goBack();
        await page.waitForLoadState("domcontentloaded");
        await takeDebugScreenshot(page, "after-reading.png");

        if (href) {
          const reloadedContainer = page.locator(`a[href="${href}"]`).locator('..');
          await expect(reloadedContainer).not.toHaveClass(/bg-blue-50/);
          await expect(reloadedContainer).not.toHaveClass(/font-bold/);
        }
      }
    } else {
      // No unread messages - verify clean state
      await expect(yellowCircles).toHaveCount(0);
      await expect(unreadConversations).toHaveCount(0);
      if (await unreadButton.isVisible()) {
        await expect(unreadButton).not.toHaveClass(/text-blue-600/);
      }
      await takeDebugScreenshot(page, "no-unread-messages.png");
    }
  });
});
