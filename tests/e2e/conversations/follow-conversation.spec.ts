import { expect, test } from "@playwright/test";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversationFollowers, conversations } from "../../../db/schema";
import { authUsers } from "../../../db/supabaseSchema/auth";
import { takeDebugScreenshot, debugWait } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Working Conversation Follow/Unfollow", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/mine", { timeout: 30000, waitUntil: "domcontentloaded" });
      // Wait for the conversation list to be visible instead of networkidle
      await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible({ timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mine", { timeout: 30000, waitUntil: "domcontentloaded" });
      await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test("should toggle follow state when clicking follow button", async ({ page }) => {
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test follow toggle");
      return;
    }

    await conversationLinks.first().click();
    
    // Wait for conversation detail page to load by checking for follow button
    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    await expect(followButton).toBeEnabled({ timeout: 5000 });

    const initialButtonText = await followButton.textContent();

    await followButton.click();

    // Wait for the button text to change deterministically
    if (initialButtonText?.includes("Following")) {
      await expect(followButton).toHaveText(/^Follow$/, { timeout: 5000 });
    } else {
      await expect(followButton).toHaveText(/Following/, { timeout: 5000 });
    }
    
    const finalButtonText = await followButton.textContent();

    if (initialButtonText?.includes("Following")) {
      expect(finalButtonText).toContain("Follow");
      expect(finalButtonText).not.toContain("Following");
    } else {
      expect(finalButtonText).toContain("Following");
    }

    await takeDebugScreenshot(page, "follow-button-toggled.png");
  });

  test("should show correct button states", async ({ page }) => {
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test button states");
      return;
    }

    await conversationLinks.first().click();

    // Wait for the follow button to appear
    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 10000 });

    const buttonText = await followButton.textContent();
    expect(buttonText?.includes("Follow")).toBeTruthy();

    const bellIcon = followButton.locator("svg");
    await expect(bellIcon).toBeVisible();

    await takeDebugScreenshot(page, "follow-button-states.png");
  });

  test("should handle follow/unfollow errors gracefully", async ({ page }) => {
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test error handling");
      return;
    }

    await conversationLinks.first().click();

    // Wait for conversation page to load and follow button to appear
    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    await expect(followButton).toBeEnabled({ timeout: 5000 });

    await page.route("**/api/trpc/**", (route) => {
      const url = route.request().url();
      if (url.includes("follow")) {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server error" }),
        });
      } else {
        route.continue();
      }
    });

    await followButton.click();
    
    // Wait for potential error toast or button state change
    await debugWait(page, 500);

    await takeDebugScreenshot(page, "follow-button-error.png");
  });

  test("should preserve follow state on page refresh", async ({ page }) => {
    const [user] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, "support@gumroad.com"))
      .limit(1);

    const unfollowedConversation = await db
      .select({
        id: conversations.id,
        slug: conversations.slug,
        subject: conversations.subject,
      })
      .from(conversations)
      .leftJoin(
        conversationFollowers,
        and(eq(conversationFollowers.conversationId, conversations.id), eq(conversationFollowers.userId, user.id)),
      )
      .where(isNull(conversationFollowers.id))
      .limit(1);

    if (unfollowedConversation.length === 0) {
      console.log("No unfollowed conversations available to test reseed database");
      return;
    }

    await page.goto(`/conversations?id=${unfollowedConversation[0].slug}`);

    await page.getByRole("button", { name: "Follow conversation" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Unfollow conversation" })).toBeVisible();

    await takeDebugScreenshot(page, "follow-state-preserved.png");
  });

  test("should handle multiple rapid clicks gracefully", async ({ page }) => {
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test rapid clicks");
      return;
    }

    await conversationLinks.first().click();

    // Wait for conversation page and follow button to be ready
    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    await expect(followButton).toBeEnabled({ timeout: 5000 });

    const initialButtonText = await followButton.textContent();

    await followButton.click();

    // Wait for button to become enabled again (operation complete)
    await expect(followButton).toBeEnabled({ timeout: 10000 });

    // Dismiss any toasts
    await page
      .locator("[data-sonner-toast]")
      .first()
      .press("Escape")
      .catch(() => {});
    await page.keyboard.press("Escape");
    await debugWait(page, 300);

    const afterFirstClickText = await followButton.textContent();
    expect(afterFirstClickText).not.toBe(initialButtonText);

    const isButtonEnabled = await followButton.isEnabled();
    const hasBlockingToast = (await page.locator("[data-sonner-toast]").count()) > 0;

    if (isButtonEnabled && !hasBlockingToast) {
      await followButton.click({ timeout: 5000 });
      await expect(followButton).toBeEnabled({ timeout: 5000 });
    } else {
      console.log("Skipping second click - button disabled or toast blocking");
    }

    await debugWait(page, 300);
    const finalButtonText = await followButton.textContent();
    expect(finalButtonText).toBeTruthy();
    expect(finalButtonText).toMatch(/^(Follow|Following)$/);

    await takeDebugScreenshot(page, "follow-button-rapid-clicks.png");
  });
});
