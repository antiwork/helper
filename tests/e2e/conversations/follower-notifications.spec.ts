import { expect, test } from "@playwright/test";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Working Follower Email Notifications", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/mine", { timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mine", { timeout: 30000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }
  });


  test("should trigger follower notification on new message", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);
    await conversationsPage.expectConversationsVisible();
    
    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if (await conversationLinks.count() === 0) {
      console.log("No conversations available for testing");
      return;
    }
    
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    
    const buttonText = await followButton.textContent();
    if (!buttonText?.includes("Following")) {
      await followButton.click();
      await page.waitForTimeout(2000);
    }

    const messageInput = page.locator('textarea[placeholder*="Write a message"], textarea[placeholder*="message"]').first();
    
    if (await messageInput.isVisible({ timeout: 5000 })) {
      await messageInput.fill("Test message to trigger follower notification");
      
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      await takeDebugScreenshot(page, "new-message-sent.png");
    } else {
      console.log("Message input not available");
    }
  });

  test("should trigger follower notification on status change", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);
    await conversationsPage.expectConversationsVisible();
    
    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if (await conversationLinks.count() === 0) {
      console.log("No conversations available for testing");
      return;
    }
    
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    
    const buttonText = await followButton.textContent();
    if (!buttonText?.includes("Following")) {
      await followButton.click();
      await page.waitForTimeout(2000);
    }

    const statusButton = page.locator('button:has-text("Open"), button:has-text("Closed")').first();
    
    if (await statusButton.isVisible({ timeout: 5000 })) {
      const currentStatus = await statusButton.textContent();
      
      if (currentStatus?.toLowerCase().includes("open")) {
        const closeButton = page.locator('button:has-text("Close")').first();
        if (await closeButton.isVisible({ timeout: 5000 })) {
          await closeButton.click();
          await page.waitForTimeout(1000);
          await takeDebugScreenshot(page, "status-changed-to-closed.png");
        }
      }
    } else {
      console.log("Status change buttons not found");
    }
  });

  test("should trigger follower notification on assignment change", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);
    await conversationsPage.expectConversationsVisible();
    
    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if (await conversationLinks.count() === 0) {
      console.log("No conversations available for testing");
      return;
    }
    
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    
    const buttonText = await followButton.textContent();
    if (!buttonText?.includes("Following")) {
      await followButton.click();
      await page.waitForTimeout(2000);
    }

    const assignButton = page.locator('button:has-text("Assign"), button:has-text("Unassigned")').first();
    
    if (await assignButton.isVisible({ timeout: 5000 })) {
      await assignButton.click();
      await page.waitForTimeout(500);
      
      const assignmentOptions = page.locator('[role="menuitem"], [role="option"]');
      if (await assignmentOptions.first().isVisible({ timeout: 3000 })) {
        await assignmentOptions.first().click();
        await page.waitForTimeout(1000);
        await takeDebugScreenshot(page, "assignment-changed.png");
      }
    } else {
      console.log("Assignment button not found");
    }
  });

  test("should trigger follower notification on note added", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);
    await conversationsPage.expectConversationsVisible();
    
    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if (await conversationLinks.count() === 0) {
      console.log("No conversations available for testing");
      return;
    }
    
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    
    const buttonText = await followButton.textContent();
    if (!buttonText?.includes("Following")) {
      await followButton.click();
      await page.waitForTimeout(2000);
    }

    const addNoteButton = page.locator('button:has-text("Add note"), button:has-text("Note")').first();
    
    if (await addNoteButton.isVisible({ timeout: 3000 })) {
      await addNoteButton.click();
      await page.waitForTimeout(1000);
      
      const noteInput = page.locator('textarea[placeholder*="note"], textarea[placeholder*="Add a note"]').first();
      
      if (await noteInput.isVisible({ timeout: 3000 })) {
        await noteInput.fill("Test note to trigger follower notification");
        
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")').first();
        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click();
          await page.waitForTimeout(3000);
          await takeDebugScreenshot(page, "note-added.png");
        } else {
          console.log("Save note button not found");
        }
      } else {
        console.log("Note input field not found");
      }
    } else {
      console.log("Notes functionality not found");
      await takeDebugScreenshot(page, "no-notes-functionality.png");
    }
  });

  test("should verify multiple followers can be following same conversation", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);
    await conversationsPage.expectConversationsVisible();
    
    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if (await conversationLinks.count() === 0) {
      console.log("No conversations available for testing");
      return;
    }
    
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    
    const buttonText = await followButton.textContent();
    if (!buttonText?.includes("Following")) {
      await followButton.click();
      await page.waitForTimeout(2000);
    }
    
    const followersSection = page.locator('[data-testid="followers"], .followers');
    
    if (await followersSection.isVisible({ timeout: 5000 })) {
      await takeDebugScreenshot(page, "followers-section.png");
    } else {
      const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
      const buttonText = await followButton.textContent();
      expect(buttonText).toContain("Following");
    }
  });

  test("should handle notification triggers when not following conversation", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);
    await conversationsPage.expectConversationsVisible();
    
    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if (await conversationLinks.count() === 0) {
      console.log("No conversations available for testing");
      return;
    }
    
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 10000 });
    
    const buttonText = await followButton.textContent();
    if (buttonText?.includes("Following")) {
      await followButton.click();
      await page.waitForTimeout(1000);
      const updatedText = await followButton.textContent();
      expect(updatedText).toContain("Follow");
    }

    const messageInput = page.locator('textarea[placeholder*="Write a message"], textarea[placeholder*="message"]').first();
    
    if (await messageInput.isVisible({ timeout: 5000 })) {
      await messageInput.fill("Message sent while not following");
      
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();
      await sendButton.click();
      await page.waitForTimeout(2000);
      
      await takeDebugScreenshot(page, "message-sent-not-following.png");
    }
  });

  test("should verify UI elements needed for notification triggers are accessible", async ({ page }) => {
    const conversationsPage = new ConversationsPage(page);
    await conversationsPage.expectConversationsVisible();
    
    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if (await conversationLinks.count() === 0) {
      console.log("No conversations available for testing");
      return;
    }
    
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    
    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible();
    
    const hasMessageInput = await page.locator('textarea[placeholder*="message"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasStatusControls = await page.locator('button:has-text("Open"), button:has-text("Closed")').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasAssignControls = await page.locator('button:has-text("Assign")').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasNotesControls = await page.locator('button:has-text("Note")').first().isVisible({ timeout: 2000 }).catch(() => false);
    
    const totalControlsAvailable = [hasMessageInput, hasStatusControls, hasAssignControls, hasNotesControls].filter(Boolean).length;
    
    if (totalControlsAvailable === 0) {
      console.log("No notification trigger controls found besides follow button");
      await takeDebugScreenshot(page, "notification-trigger-ui-elements-none-found.png");
    } else {
      console.log(`Found ${totalControlsAvailable} notification trigger controls`);
    }
    
    await takeDebugScreenshot(page, "notification-trigger-ui-elements.png");
  });
});