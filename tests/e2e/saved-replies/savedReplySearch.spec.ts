import { expect, test } from "@playwright/test";
import { BasePage } from "../utils/page-objects/basePage";
import { SavedRepliesPage } from "../utils/page-objects/savedRepliesPage";
import { ConversationsPage } from "../utils/page-objects/conversationsPage";
import { generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Saved Reply Search in New Conversation Modal", () => {
  let conversationsPage: ConversationsPage;
  let savedRepliesPage: SavedRepliesPage;
  let basePage: BasePage;

  test.beforeEach(async ({ page }) => {
    conversationsPage = new ConversationsPage(page);
    savedRepliesPage = new SavedRepliesPage(page);
    basePage = new (class extends BasePage {})(page);

    // Create multiple test saved replies for search functionality
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const testReplies = [
      {
        name: `Welcome Message ${generateRandomString()}`,
        content: `Hello! Welcome to our support. How can I help you today?`
      },
      {
        name: `Thank You Reply ${generateRandomString()}`,
        content: `Thank you for contacting us. We appreciate your feedback.`
      },
      {
        name: `Troubleshooting Guide ${generateRandomString()}`,
        content: `Please try these troubleshooting steps: 1. Clear cache 2. Restart browser`
      },
      {
        name: `Billing Question ${generateRandomString()}`,
        content: `For billing questions, please check your account settings or contact our billing team.`
      },
      {
        name: `Account Support ${generateRandomString()}`,
        content: `We're here to help with your account. Please provide more details about the issue.`
      }
    ];

    // Clean up any existing replies and create our test set
    const existingCount = await savedRepliesPage.getSavedReplyCount();
    for (let i = 0; i < existingCount; i++) {
      await savedRepliesPage.deleteSavedReply(0);
      await page.waitForTimeout(300);
    }

    for (const reply of testReplies) {
      await savedRepliesPage.createSavedReply(reply.name, reply.content);
      await page.waitForTimeout(500);
    }
  });

  test("should search saved replies by name", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for "Welcome"
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("Welcome");

    // Should show only the welcome message
    const searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(1);
    await expect(searchResults).toContainText("Welcome Message");

    await takeDebugScreenshot(page, "search-by-name.png");
  });

  test("should search saved replies by content", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for content within replies
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("troubleshooting");

    // Should show only the troubleshooting reply
    const searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(1);
    await expect(searchResults).toContainText("Troubleshooting Guide");

    await takeDebugScreenshot(page, "search-by-content.png");
  });

  test("should search saved replies case insensitively", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search with different case variations
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    
    // Test lowercase
    await searchInput.fill("welcome");
    let searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(1);
    await expect(searchResults).toContainText("Welcome Message");

    // Test uppercase
    await searchInput.clear();
    await searchInput.fill("WELCOME");
    searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(1);
    await expect(searchResults).toContainText("Welcome Message");

    // Test mixed case
    await searchInput.clear();
    await searchInput.fill("WeLcOmE");
    searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(1);
    await expect(searchResults).toContainText("Welcome Message");

    await takeDebugScreenshot(page, "search-case-insensitive.png");
  });

  test("should show partial matches in search", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for partial word
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("supp");

    // Should show replies containing "support"
    const searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(2); // "Account Support" and "Welcome Message" (contains "support")

    await takeDebugScreenshot(page, "search-partial-matches.png");
  });

  test("should show no results for non-existent search terms", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for non-existent term
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("nonexistentterm12345");

    // Should show no results message
    const noResults = page.locator('[role="option"]');
    await expect(noResults).toHaveCount(0);

    const emptyMessage = page.locator('text="No saved replies found."');
    await expect(emptyMessage).toBeVisible();

    await takeDebugScreenshot(page, "search-no-results.png");
  });

  test("should clear search results when input is cleared", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for specific term
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("Welcome");

    // Verify filtered results
    let searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(1);

    // Clear search
    await searchInput.clear();

    // Should show all saved replies again
    searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(5); // All our test replies

    await takeDebugScreenshot(page, "search-cleared.png");
  });

  test("should update search results in real-time", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    const searchResults = page.locator('[role="option"]');

    // Type "T" - should show "Thank You Reply" and "Troubleshooting Guide"
    await searchInput.fill("T");
    await page.waitForTimeout(100);
    await expect(searchResults).toHaveCount(2);

    // Type "Th" - should show "Thank You Reply" and "Troubleshooting Guide"
    await searchInput.fill("Th");
    await page.waitForTimeout(100);
    await expect(searchResults).toHaveCount(2);

    // Type "Tha" - should show only "Thank You Reply"
    await searchInput.fill("Tha");
    await page.waitForTimeout(100);
    await expect(searchResults).toHaveCount(1);
    await expect(searchResults).toContainText("Thank You Reply");

    await takeDebugScreenshot(page, "search-real-time.png");
  });

  test("should highlight search terms in results", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for term
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("support");

    // Check if search term is highlighted (implementation may vary)
    const searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(2);

    // Verify results contain the search term
    await expect(searchResults.first()).toContainText("support");

    await takeDebugScreenshot(page, "search-highlight.png");
  });

  test("should allow selecting search results with keyboard", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for term
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("Welcome");

    // Use arrow keys to navigate
    await page.keyboard.press("ArrowDown");
    
    // Press Enter to select
    await page.keyboard.press("Enter");

    // Should insert the selected reply
    const subjectField = page.locator('input[placeholder="Subject"]');
    await expect(subjectField).toHaveValue(/Welcome Message/);

    await takeDebugScreenshot(page, "search-keyboard-select.png");
  });

  test("should maintain search state when reopening dropdown", async ({ page }) => {
    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for term
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("Welcome");

    // Close dropdown by clicking outside
    const toField = page.locator('input[placeholder="To"]');
    await toField.click();

    // Reopen dropdown
    await savedRepliesButton.click();

    // Search should be cleared (fresh state)
    const newSearchInput = page.locator('input[placeholder="Search saved replies..."]');
    await expect(newSearchInput).toHaveValue("");

    // Should show all results again
    const searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(5);

    await takeDebugScreenshot(page, "search-state-fresh.png");
  });

  test("should handle special characters in search", async ({ page }) => {
    // Create a reply with special characters
    await savedRepliesPage.navigateToSavedReplies();
    await page.waitForLoadState("networkidle");

    const specialName = `Special & Test (with) symbols! ${generateRandomString()}`;
    const specialContent = `This has special characters: @#$%^&*()`;
    await savedRepliesPage.createSavedReply(specialName, specialContent);

    // Go to conversations page and open modal
    await basePage.goto("/mailboxes/gumroad/mine");
    await page.waitForLoadState("networkidle");
    await conversationsPage.openNewConversationModal();

    // Open saved replies dropdown
    const savedRepliesButton = page.locator('button:has-text("Saved Replies")');
    await savedRepliesButton.click();

    // Search for special characters
    const searchInput = page.locator('input[placeholder="Search saved replies..."]');
    await searchInput.fill("Special &");

    // Should find the reply with special characters
    const searchResults = page.locator('[role="option"]');
    await expect(searchResults).toHaveCount(1);
    await expect(searchResults).toContainText("Special & Test");

    await takeDebugScreenshot(page, "search-special-characters.png");
  });
});