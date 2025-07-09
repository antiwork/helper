import { expect, test } from "@playwright/test";
import { BasePage } from "../utils/page-objects/basePage";
import { SavedRepliesPage } from "../utils/page-objects/savedRepliesPage";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Saved Reply Usage Tracking", () => {
  let conversationsPage: ConversationsPage;
  let savedRepliesPage: SavedRepliesPage;
  let basePage: BasePage;

  test.beforeEach(async ({ page }) => {
    conversationsPage = new ConversationsPage(page);
    savedRepliesPage = new SavedRepliesPage(page);
    basePage = new (class extends BasePage {})(page);
  });

  test("should track usage count when saved reply is used", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Usage Tracking ${generateRandomString()}`;
    const testContent = `This reply will be used multiple times - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Use the saved reply in new conversation modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // First usage
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    let replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    // Wait for usage tracking to complete
    await page.waitForTimeout(1000);

    // Close modal and check usage count in saved replies page
    await page.keyboard.press("Escape");
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    // Find our saved reply and check usage count
    const savedReplyCard = page.locator(`text="${testName}"`).locator("..").locator("..");
    await expect(savedReplyCard).toContainText("1");

    // Use the saved reply again
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Second usage
    await savedRepliesButton.click();
    replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    await page.waitForTimeout(1000);

    // Check usage count in dropdown shows updated count
    await page.keyboard.press("Escape");
    await conversationsPage.openNewConversationModal();
    await savedRepliesButton.click();

    const usageText = page.locator('text="Used 2 times"');
    await expect(usageText).toBeVisible();

    await takeDebugScreenshot(page, "usage-tracking-incremented.png");
  });

  test("should show usage count in saved replies management page", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Management Usage ${generateRandomString()}`;
    const testContent = `This reply usage will be tracked - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Use the saved reply multiple times
    for (let i = 0; i < 3; i++) {
      await basePage.goto("/mailboxes/gumroad/mine");
      await page.waitForLoadState("networkidle");
      await conversationsPage.openNewConversationModal();

      const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
      await savedRepliesButton.click();

      const replyItem = page.locator(`text="${testName}"`);
      await replyItem.click();

      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape");
    }

    // Check usage count in management page
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    // Look for usage count display in the management interface
    const savedReplyCard = page.locator(`text="${testName}"`).locator("..").locator("..");
    await expect(savedReplyCard).toContainText("3");

    await takeDebugScreenshot(page, "usage-count-management-page.png");
  });

  test("should handle concurrent usage tracking correctly", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Concurrent Usage ${generateRandomString()}`;
    const testContent = `This reply will be used concurrently - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Use the saved reply multiple times in quick succession
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");

    for (let i = 0; i < 5; i++) {
      await conversationsPage.openNewConversationModal();

      const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
      await savedRepliesButton.click();

      const replyItem = page.locator(`text="${testName}"`);
      await replyItem.click();

      // Don't wait long between uses to test concurrent handling
      await page.waitForTimeout(200);
      await page.keyboard.press("Escape");
    }

    // Wait for all usage tracking to complete
    await page.waitForTimeout(2000);

    // Check final usage count
    await conversationsPage.openNewConversationModal();
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const usageText = page.locator('text="Used 5 times"');
    await expect(usageText).toBeVisible();

    await takeDebugScreenshot(page, "concurrent-usage-tracking.png");
  });

  test("should persist usage count across page reloads", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Persist Usage ${generateRandomString()}`;
    const testContent = `This reply usage will persist - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Use the saved reply
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();

    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check usage count persists after reload
    await conversationsPage.openNewConversationModal();
    await savedRepliesButton.click();

    const usageText = page.locator('text="Used 1 times"');
    await expect(usageText).toBeVisible();

    await takeDebugScreenshot(page, "usage-persists-after-reload.png");
  });

  test("should not increment usage count on failed insertion", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Failed Usage ${generateRandomString()}`;
    const testContent = `This reply should not increment on failure - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Check initial usage count
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const initialUsageText = page.locator('text="Used 0 times"');
    await expect(initialUsageText).toBeVisible();

    // Close dropdown without selecting
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    // Reopen and check usage count hasn't changed
    await conversationsPage.openNewConversationModal();
    await savedRepliesButton.click();

    const unchangedUsageText = page.locator('text="Used 0 times"');
    await expect(unchangedUsageText).toBeVisible();

    await takeDebugScreenshot(page, "no-usage-increment-on-failure.png");
  });

  test("should display usage count in correct format", async ({ page }) => {
    // Create a test saved reply
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testName = `Format Usage ${generateRandomString()}`;
    const testContent = `This reply will test usage format - ${generateRandomString()}`;
    await savedRepliesPage.createSavedReply(testName, testContent);

    // Go to conversations page
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Check initial format (0 times)
    let usageText = page.locator('text="Used 0 times"');
    await expect(usageText).toBeVisible();

    // Use the reply once
    const replyItem = page.locator(`text="${testName}"`);
    await replyItem.click();
    await page.waitForTimeout(1000);

    // Check format for 1 usage
    await page.keyboard.press("Escape");
    await conversationsPage.openNewConversationModal();
    await savedRepliesButton.click();

    usageText = page.locator('text="Used 1 times"');
    await expect(usageText).toBeVisible();

    // Use the reply again
    await replyItem.click();
    await page.waitForTimeout(1000);

    // Check format for 2 usages
    await page.keyboard.press("Escape");
    await conversationsPage.openNewConversationModal();
    await savedRepliesButton.click();

    usageText = page.locator('text="Used 2 times"');
    await expect(usageText).toBeVisible();

    await takeDebugScreenshot(page, "usage-count-format.png");
  });
});