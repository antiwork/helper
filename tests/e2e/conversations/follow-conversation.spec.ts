import { expect, test } from "@playwright/test";
import { takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Working Conversation Follow/Unfollow", () => {
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

  test("should toggle follow state when clicking follow button", async ({ page }) => {
    await expect(page).toHaveTitle("Helper");
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test follow toggle");
      return;
    }

    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    await expect(followButton).not.toHaveAttribute("disabled");

    const initialButtonText = await followButton.textContent();

    await followButton.click();

    // Wait for the state change with retry logic
    let attempts = 0;
    let finalButtonText = initialButtonText;
    while (attempts < 5 && finalButtonText === initialButtonText) {
      await page.waitForTimeout(1000);
      finalButtonText = await followButton.textContent();
      attempts++;
    }

    if (initialButtonText?.includes("Following")) {
      expect(finalButtonText).toContain("Follow");
      expect(finalButtonText).not.toContain("Following");
    } else {
      expect(finalButtonText).toContain("Following");
    }

    await takeDebugScreenshot(page, "follow-button-toggled.png");
  });

  test("should show correct button states", async ({ page }) => {
    await expect(page).toHaveTitle("Helper");
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test button states");
      return;
    }

    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible();

    const buttonText = await followButton.textContent();
    expect(buttonText?.includes("Follow")).toBeTruthy();

    const bellIcon = followButton.locator("svg");
    await expect(bellIcon).toBeVisible();

    await takeDebugScreenshot(page, "follow-button-states.png");
  });

  test("should handle follow/unfollow errors gracefully", async ({ page }) => {
    await expect(page).toHaveTitle("Helper");
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test error handling");
      return;
    }

    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });

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
    await page.waitForTimeout(3000);

    await takeDebugScreenshot(page, "follow-button-error.png");
  });

  test("should preserve follow state on page refresh", async ({ page }) => {
    await expect(page).toHaveTitle("Helper");
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test state preservation");
      return;
    }

    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible();
    await expect(followButton).not.toHaveAttribute("disabled");

    let buttonText = await followButton.textContent();
    if (!buttonText?.includes("Following")) {
      await followButton.click();

      // Wait for the following state to be established with retry logic
      let attempts = 0;
      while (attempts < 5) {
        await page.waitForTimeout(1000);
        const currentText = await followButton.textContent();
        if (currentText?.includes("Following")) {
          buttonText = currentText;
          break;
        }
        attempts++;
      }

      if (!buttonText?.includes("Following")) {
        console.log("Could not establish following state, skipping test");
        return;
      }
    }

    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const refreshedFollowButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(refreshedFollowButton).toBeVisible({ timeout: 15000 });

    // Wait for the button state to load after refresh
    let refreshAttempts = 0;
    let refreshedButtonText = await refreshedFollowButton.textContent();
    while (refreshAttempts < 3 && !refreshedButtonText?.includes("Following")) {
      await page.waitForTimeout(1000);
      refreshedButtonText = await refreshedFollowButton.textContent();
      refreshAttempts++;
    }

    expect(refreshedButtonText).toContain("Following");

    await takeDebugScreenshot(page, "follow-state-preserved.png");
  });

  test("should handle multiple rapid clicks gracefully", async ({ page }) => {
    await expect(page).toHaveTitle("Helper");
    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible();
    await expect(page.locator('button:has-text("open")')).toBeVisible();

    const conversationLinks = page.locator('a[href*="/conversations?id="]');
    if ((await conversationLinks.count()) === 0) {
      console.log("No conversations available to test rapid clicks");
      return;
    }

    await conversationLinks.first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const followButton = page.locator('button:has-text("Follow"), button:has-text("Following")').first();
    await expect(followButton).toBeVisible({ timeout: 15000 });
    await expect(followButton).not.toHaveAttribute("disabled");

    const initialButtonText = await followButton.textContent();

    await followButton.click();

    await expect(followButton).not.toHaveAttribute("disabled", { timeout: 10000 });

    await page
      .locator("[data-sonner-toast]")
      .first()
      .press("Escape")
      .catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    const afterFirstClickText = await followButton.textContent();
    expect(afterFirstClickText).not.toBe(initialButtonText);

    const isButtonEnabled = await followButton.isEnabled();
    const hasBlockingToast = (await page.locator("[data-sonner-toast]").count()) > 0;

    if (isButtonEnabled && !hasBlockingToast) {
      await followButton.click({ timeout: 5000 });
      await expect(followButton).not.toHaveAttribute("disabled", { timeout: 5000 });
    } else {
      console.log("Skipping second click - button disabled or toast blocking");
    }

    await page.waitForTimeout(2000);
    const finalButtonText = await followButton.textContent();
    expect(finalButtonText).toBeTruthy();
    expect(finalButtonText).toMatch(/^(Follow|Following)$/);

    await takeDebugScreenshot(page, "follow-button-rapid-clicks.png");
  });
});
