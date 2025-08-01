import { expect, test } from "@playwright/test";

// Use pre-authenticated storage state
test.use({ storageState: "tests/e2e/.auth/user.json" });

const CONVERSATION_LINK_SELECTOR = 'a[href*="/conversations?id="]';

test.describe("Conversation details", () => {
  test("should show conversation content and allow navigation", async ({ page }) => {
    // Navigate to the conversations inbox
    await page.goto("/mine", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    const conversationLinks = page.locator(CONVERSATION_LINK_SELECTOR);
    const linkCount = await conversationLinks.count();
    test.skip(linkCount === 0, "No conversations available to open");

    // Open the first conversation
    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify that the message thread renders
    await expect(page.locator("[data-message-item]").first()).toBeVisible();

    // Verify that the sidebar shows expected sections
    await expect(page.locator("h3:text-is(\"Conversation\")")).toBeVisible();
    await expect(page.locator("h3:text-is(\"Customer\")")).toBeVisible();

    // Test navigating to the next conversation if controls are available
    const previousButton = page.locator('button:has(svg.lucide-chevron-left)');
    const nextButton = page.locator('button:has(svg.lucide-chevron-right)');

    if (await nextButton.isVisible()) {
      const initialUrl = page.url();

      await nextButton.click();
      await expect(page).not.toHaveURL(initialUrl);
      const nextUrl = page.url();

      if (await previousButton.isVisible()) {
        await previousButton.click();
        await expect(page).toHaveURL(initialUrl);
      }

      // Navigate forward again to verify the next URL
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await expect(page).toHaveURL(nextUrl);
      }
    }
  });
});
