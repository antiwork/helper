import { expect, test } from "@playwright/test";
import { createConversation, loginAsTestUser } from "../../utils";

test.describe("Unread Messages Filter", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser({ page });
  });

  test("should show unread messages filter button", async ({ page }) => {
    await page.goto("/conversations");
    
    // Check if the unread messages filter button is visible
    const filterButton = page.locator('button:has-text("Unread messages")');
    await expect(filterButton).toBeVisible();
    
    // Check initial state (not active)
    await expect(filterButton).not.toHaveClass(/bright/);
  });

  test("should filter conversations to show only unread messages", async ({ page }) => {
    // Create a test conversation with unread messages
    const conversation = await createConversation({
      emailFrom: "test@example.com",
      assignedToId: "test-user-id", // Assign to ensure unread badge shows
      hasUnreadUserMessages: true,
    });

    await page.goto("/conversations");
    
    // Click the unread messages filter
    const filterButton = page.locator('button:has-text("Unread messages")');
    await filterButton.click();
    
    // Check that filter is now active (bright variant)
    await expect(filterButton).toHaveClass(/bright/);
    
    // Check URL parameter is set
    await expect(page).toHaveURL(/hasUnreadMessages=true/);
    
    // Verify only conversations with unread messages are shown
    const conversationItems = page.locator('[data-testid="conversation-item"]');
    await expect(conversationItems).toBeVisible();
    
    // Check that unread badge is present on filtered conversations
    const unreadBadge = page.locator('[data-testid="unread-messages-badge"]');
    await expect(unreadBadge).toBeVisible();
  });

  test("should clear filter when clicked again", async ({ page }) => {
    await page.goto("/conversations");
    
    const filterButton = page.locator('button:has-text("Unread messages")');
    
    // Activate filter
    await filterButton.click();
    await expect(filterButton).toHaveClass(/bright/);
    
    // Deactivate filter
    await filterButton.click();
    await expect(filterButton).not.toHaveClass(/bright/);
    
    // Check URL parameter is cleared
    await expect(page).not.toHaveURL(/hasUnreadMessages=true/);
  });

  test("should work with other filters", async ({ page }) => {
    await page.goto("/conversations");
    
    // Apply date filter first
    const dateFilter = page.locator('button:has-text("Created")');
    await dateFilter.click();
    const todayOption = page.locator('text="Today"');
    await todayOption.click();
    
    // Then apply unread messages filter
    const unreadFilter = page.locator('button:has-text("Unread messages")');
    await unreadFilter.click();
    
    // Check both filters are active
    await expect(dateFilter).toHaveClass(/bright/);
    await expect(unreadFilter).toHaveClass(/bright/);
    
    // Check URL has both parameters
    await expect(page).toHaveURL(/hasUnreadMessages=true/);
    await expect(page).toHaveURL(/createdAfter=/);
  });

  test("should only show unread badges on assigned conversations", async ({ page }) => {
    // Create assigned conversation with unread messages
    const assignedConversation = await createConversation({
      emailFrom: "assigned@example.com",
      assignedToId: "test-user-id",
      hasUnreadUserMessages: true,
    });

    // Create unassigned conversation with messages (should not show badge)
    const unassignedConversation = await createConversation({
      emailFrom: "unassigned@example.com",
      assignedToId: null,
      hasUnreadUserMessages: true,
    });

    await page.goto("/conversations");
    
    // Check that only assigned conversation shows unread badge
    const assignedItem = page.locator(`[data-conversation-id="${assignedConversation.id}"]`);
    const unassignedItem = page.locator(`[data-conversation-id="${unassignedConversation.id}"]`);
    
    await expect(assignedItem.locator('[data-testid="unread-messages-badge"]')).toBeVisible();
    await expect(unassignedItem.locator('[data-testid="unread-messages-badge"]')).not.toBeVisible();
  });

  test("should update filter count in clear filters button", async ({ page }) => {
    await page.goto("/conversations");
    
    // Apply unread messages filter
    const unreadFilter = page.locator('button:has-text("Unread messages")');
    await unreadFilter.click();
    
    // Check that clear filters button shows count
    const clearButton = page.locator('button:has-text("Clear filters")');
    await expect(clearButton).toBeVisible();
    
    // Apply another filter
    const vipFilter = page.locator('button:has-text("VIP")');
    await vipFilter.click();
    const vipOnlyOption = page.locator('text="VIP only"');
    await vipOnlyOption.click();
    
    // Clear all filters
    await clearButton.click();
    
    // Check filters are cleared
    await expect(unreadFilter).not.toHaveClass(/bright/);
    await expect(vipFilter).not.toHaveClass(/bright/);
    await expect(clearButton).not.toBeVisible();
  });
});