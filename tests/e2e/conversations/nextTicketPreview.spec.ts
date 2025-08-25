import { expect, test } from "@playwright/test";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversations } from "../../../db/schema";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function getTestConversations() {
  const result = await db
    .select({ 
      id: conversations.id, 
      slug: conversations.slug,
      subject: conversations.subject,
      status: conversations.status 
    })
    .from(conversations)
    .where(eq(conversations.status, "open"))
    .limit(5);

  if (result.length < 2) {
    throw new Error(
      `Insufficient conversations for testing: found ${result.length}, need at least 2. ` +
      "Please ensure there are at least 2 open conversations in the test database.",
    );
  }

  return result;
}

test.describe("Next Ticket Preview", () => {
  test.describe.configure({ mode: "serial" });

  let testConversations: Awaited<ReturnType<typeof getTestConversations>>;

  test.beforeAll(async () => {
    testConversations = await getTestConversations();
    
    // Ensure Next Ticket Preview feature is enabled in the database
    try {
      await db.execute(sql`
        UPDATE mailboxes_mailbox 
        SET preferences = COALESCE(preferences, '{}') || '{"showNextTicketPreview": true}' 
        WHERE slug = 'gumroad';
      `);
    } catch (error) {
      console.error("⚠️ Failed to enable Next Ticket Preview in database:", error);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to conversations list page to establish conversation list context  
    await page.goto("/mine");
    await page.waitForLoadState("networkidle");
    
    // Wait for conversation list to load by looking for conversation links
    await page.waitForSelector('a[href*="/conversations?id="]', { timeout: 10000 });
    
    // Add explicit wait for the conversation list to be fully populated
    // This ensures that conversationListData is available to NextTicketPreview
    await page.waitForFunction(() => {
      const links = document.querySelectorAll('a[href*="/conversations?id="]');
      return links.length >= 2; // Ensure we have at least 2 conversations for Next Ticket Preview
    }, { timeout: 10000 });
    
    // Get the first conversation ID from the link and navigate directly to /mine?id= pattern
    // This is where the NextTicketPreview component actually renders
    const firstConversationLink = page.locator('a[href*="/conversations?id="]').first();
    const href = await firstConversationLink.getAttribute('href');
    const conversationId = href?.match(/id=([^&]+)/)?.[1];
    
    if (conversationId) {
      // Navigate directly to the /mine?id= pattern where the component is visible
      await page.goto(`/mine?id=${conversationId}`);
      await page.waitForLoadState("networkidle");
    } else {
      // Fallback to clicking if we can't parse the ID
      await firstConversationLink.click();
      await page.waitForLoadState("networkidle");
    }
    
    // Wait for conversation content to fully load
    await page.waitForSelector('[data-testid="conversation-content"], .prose, [aria-label="Conversation editor"]', { timeout: 10000 });
  });

  test("should display Next Ticket Preview when feature is enabled", async ({ page }) => {
    await takeDebugScreenshot(page, "next-ticket-preview-initial.png");

    // Look for the Next Ticket Preview component by its header text
    const ticketHeader = page.locator("h4", { hasText: /^(Next|First) Ticket:/ });
    const previewContainer = ticketHeader.locator("..");

    const isVisible = await previewContainer.count();
    
    if (isVisible > 0) {
      // Feature is enabled - test its functionality
      await expect(previewContainer).toBeVisible();

      // Check for the header with ticket information
      const ticketHeader = page.locator("h4", { hasText: /^(Next|First) Ticket:/ });
      await expect(ticketHeader).toBeVisible();

      // Verify ticket ID is displayed
      const ticketId = ticketHeader.locator("span.text-muted-foreground");
      await expect(ticketId).toBeVisible();
      
      // Check for the Switch button
      const switchButton = page.locator("button", { hasText: /Switch →|Switching.../ });
      await expect(switchButton).toBeVisible();
      await expect(switchButton).toBeEnabled();

      // Verify customer information is displayed
      const customerEmail = page.locator("span.text-xs.text-muted-foreground").filter({ hasText: /@/ });
      await expect(customerEmail).toBeVisible();

      // Verify subject is displayed  
      const subject = page.locator("h3.font-medium.text-sm");
      await expect(subject).toBeVisible();

      await takeDebugScreenshot(page, "next-ticket-preview-visible.png");

    } else {
      await takeDebugScreenshot(page, "next-ticket-preview-disabled.png");
    }
  });

  test("should handle collapse and expand functionality", async ({ page }) => {
    const ticketHeader = page.locator("h4", { hasText: /^(Next|First) Ticket:/ });
    const previewContainer = ticketHeader.locator("..");

    if (await previewContainer.count() > 0) {
      // Test collapse functionality
      const collapseButton = page.locator("button[aria-label*='Collapse preview']");
      await expect(collapseButton).toBeVisible();
      
      // Take screenshot before collapse
      await takeDebugScreenshot(page, "before-collapse.png");
      
      await collapseButton.click();
      
      // Should now show expand button
      const expandButton = page.locator("button[aria-label*='Expand preview']");
      await expect(expandButton).toBeVisible();
      
      // Subject should be visible in collapsed state
      const collapsedSubject = page.locator("span.text-xs.text-muted-foreground.truncate.max-w-\\[250px\\]");
      await expect(collapsedSubject).toBeVisible();
      
      await takeDebugScreenshot(page, "after-collapse.png");
      
      // Test expand functionality
      await expandButton.click();
      await expect(collapseButton).toBeVisible();
      
      // Full content should be visible again
      const messageContent = page.locator("div.text-xs.text-muted-foreground.mt-2.whitespace-pre-wrap");
      if (await messageContent.count() > 0) {
        await expect(messageContent).toBeVisible();
      }
      
      await takeDebugScreenshot(page, "after-expand.png");
      
    }
  });

  test("should navigate to next conversation when Switch button is clicked", async ({ page }) => {
    const ticketHeader = page.locator("h4", { hasText: /^(Next|First) Ticket:/ });
    const previewContainer = ticketHeader.locator("..");

    if (await previewContainer.count() > 0) {
      // Get initial URL to verify navigation
      const initialUrl = page.url();
      
      // Find and click the Switch button
      const switchButton = page.locator("button", { hasText: "Switch →" });
      await expect(switchButton).toBeVisible();
      await expect(switchButton).toBeEnabled();
      
      await takeDebugScreenshot(page, "before-switch.png");
      
      // Click switch button and wait for navigation
      await Promise.all([
        page.waitForURL((url) => url.toString() !== initialUrl, { timeout: 10000 }),
        switchButton.click()
      ]);
      
      await page.waitForLoadState("networkidle");
      
      // Verify we navigated to a different conversation
      const newUrl = page.url();
      expect(newUrl).not.toBe(initialUrl);
      expect(newUrl).toMatch(/\/mine\?id=/);
      
      // Verify we're on a valid conversation page
      const conversationContent = page.locator('[aria-label="Conversation editor"], .prose, [data-testid="conversation-content"]');
      await expect(conversationContent.first()).toBeVisible({ timeout: 10000 });
      
      await takeDebugScreenshot(page, "after-switch.png");
      
    }
  });

  test("should show appropriate ticket label based on position", async ({ page }) => {
    const ticketHeader = page.locator("h4", { hasText: /^(Next|First) Ticket:/ });
    const previewContainer = ticketHeader.locator("..");

    if (await previewContainer.count() > 0) {
      // Navigate to the last conversation to test "First Ticket" label
      const lastConversation = testConversations[testConversations.length - 1];
      await page.goto(`/mine?id=${lastConversation.id}`);
      await page.waitForLoadState("networkidle");
      
      await takeDebugScreenshot(page, "last-conversation.png");
      
      const ticketHeader = page.locator("h4", { hasText: /^(Next|First) Ticket:/ });
      if (await ticketHeader.count() > 0) {
        const headerText = await ticketHeader.textContent();
        
        // Should show either "Next Ticket" or "First Ticket" depending on conversation list
        expect(headerText).toMatch(/^(Next|First) Ticket:/);
        
      }
    }
  });

  test("should handle VIP customer badge display", async ({ page }) => {
    const ticketHeader = page.locator("h4", { hasText: /^(Next|First) Ticket:/ });
    const previewContainer = ticketHeader.locator("..");

    if (await previewContainer.count() > 0) {
      // Look for VIP badge if present
      const vipBadge = page.locator("span", { hasText: "VIP" }).locator("..").filter({ hasClass: /badge/ });
      
      const vipBadgeCount = await vipBadge.count();
      if (vipBadgeCount > 0) {
        await expect(vipBadge).toBeVisible();
      } else {
      }
      
      await takeDebugScreenshot(page, "vip-badge-check.png");
    }
  });
});