import { expect, test } from "@playwright/test";
import { eq, or } from "drizzle-orm";
import { db } from "../../../db/client";
import { savedReplies } from "../../../db/schema";
import { createSavedReply } from "../utils/replyHelpers";
import { generateRandomString, takeDebugScreenshot } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("New Message with Saved Replies", () => {
  let firstTestReplyName: string;
  let secondTestReplyName: string;
  let createdSavedReplies: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Create a new page for setup
    const context = await browser.newContext({ storageState: "tests/e2e/.auth/user.json" });
    const page = await context.newPage();

    // Generate unique names for our test saved replies
    const uniqueId = generateRandomString();
    firstTestReplyName = `Test Reply Primary ${uniqueId}`;
    secondTestReplyName = `Test Reply Secondary ${uniqueId}`;
    createdSavedReplies = [firstTestReplyName, secondTestReplyName];

    try {
      // Navigate with retry logic for improved reliability
      try {
        await page.goto("/saved-replies");
        await page.waitForLoadState("networkidle", { timeout: 30000 });
      } catch (error) {
        console.log("Initial navigation failed, retrying...", error);
        await page.goto("/saved-replies");
        await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
      }

      await expect(page.locator('h1:has-text("Saved replies")')).toBeVisible();
      await page.waitForTimeout(1000);

      // Create first test saved reply
      const firstContent = `Hello! Thank you for contacting us. How can I help you today? - ${uniqueId}`;
      await createSavedReply(page, firstTestReplyName, firstContent);
      await page.waitForTimeout(1000);

      // Create second test saved reply
      const secondContent = `This is a different saved reply for testing search functionality - ${uniqueId}`;
      await createSavedReply(page, secondTestReplyName, secondContent);
      await page.waitForTimeout(1000);
    } catch (error) {
      console.error("Failed to create test saved replies:", error);
      // Take screenshot before closing context
      try {
        await takeDebugScreenshot(page, "failed-saved-replies-setup.png");
      } catch (screenshotError) {
        console.log("Could not take screenshot:", screenshotError);
      }
      throw error;
    } finally {
      await context.close();
    }
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to conversations page with improved error handling
    let navigationSuccessful = false;
    let retries = 0;
    const maxRetries = 3;

    while (!navigationSuccessful && retries < maxRetries) {
      try {
        await page.goto("/mine", {
          timeout: 30000,
          waitUntil: "domcontentloaded",
        });

        // Wait for any loading states to complete
        await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
          // Continue even if networkidle times out
        });

        // Wait for the new message button - use multiple possible selectors
        const buttonSelectors = [
          'button[aria-label="New message"]',
          "button:has(svg.lucide-send)",
          ".fixed.bottom-6.right-6 button",
        ];

        let buttonFound = false;
        for (const selector of buttonSelectors) {
          try {
            await page.waitForSelector(selector, {
              timeout: 5000,
              state: "visible",
            });
            buttonFound = true;
            break;
          } catch {
            // Try next selector
          }
        }

        if (buttonFound) {
          navigationSuccessful = true;
        } else {
          throw new Error("New message button not found with any selector");
        }
      } catch (error) {
        retries++;
        console.log(`Navigation attempt ${retries} failed:`, error);
        if (retries >= maxRetries) {
          throw new Error(`Failed to navigate after ${maxRetries} attempts: ${error}`);
        }
        await page.waitForTimeout(3000);
      }
    }
  });

  test.afterAll(async () => {
    // Cleanup only the test saved replies by their specific names
    try {
      if (createdSavedReplies.length > 0) {
        const nameConditions = createdSavedReplies.map((name) => eq(savedReplies.name, name));
        const result = await db.delete(savedReplies).where(or(...nameConditions));
        console.log(`✅ Test cleanup completed - deleted ${result.rowCount || 0} test saved replies`);
      }
    } catch (error) {
      console.warn("Failed during saved replies cleanup:", error);
      // Don't fail the test suite due to cleanup issues
    }
  });

  test("should show saved reply selector in new message modal and insert content", async ({ page }) => {
    // Use multiple selectors for the new message button
    const newMessageButton = page
      .locator('button[aria-label="New message"]')
      .or(page.locator(".fixed.bottom-6.right-6 button"));
    await expect(newMessageButton).toBeVisible({ timeout: 10000 });
    await newMessageButton.click();

    // Wait for modal to open
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify modal title
    const modalTitle = modal.locator('h2:has-text("New message")');
    await expect(modalTitle).toBeVisible();

    await expect(modal.locator('button[role="combobox"]')).toBeVisible({ timeout: 15000 });

    // Look for the saved reply selector button - it contains both icon and text
    const savedReplySelector = modal.locator('button[role="combobox"]');
    await expect(savedReplySelector).toBeVisible();

    await savedReplySelector.click();
    await expect(page.getByPlaceholder("Search saved replies...")).toBeVisible({ timeout: 5000 });

    // Wait for the popover content
    const searchInput = page.getByPlaceholder("Search saved replies...");

    // Look for command items instead of options
    const replyItems = page.locator('[role="option"]');
    await expect(replyItems.first()).toBeVisible({ timeout: 5000 });

    // Click the first saved reply
    await replyItems.first().click();

    const messageEditor = modal.locator('[role="textbox"][contenteditable="true"]');
    await expect(messageEditor).not.toHaveText("", { timeout: 5000 });

    // Check that the message editor has content
    const editorContent = await messageEditor.textContent();
    expect(editorContent?.length).toBeGreaterThan(0);

    await takeDebugScreenshot(page, "saved-reply-functionality-working.png");

    // Close the modal
    await page.keyboard.press("Escape");
  });

  test("should open saved reply selector using keyboard shortcut", async ({ page }) => {
    // Use multiple selectors for the new message button
    const newMessageButton = page
      .locator('button[aria-label="New message"]')
      .or(page.locator(".fixed.bottom-6.right-6 button"));
    await expect(newMessageButton).toBeVisible({ timeout: 10000 });
    await newMessageButton.click();

    // Wait for modal
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for saved reply button to be visible
    const savedReplyButton = modal.locator('button[role="combobox"]:has-text("Use saved reply")');
    await expect(savedReplyButton).toBeVisible({ timeout: 10000 });

    // Click on the message editor to focus it
    const messageEditor = modal.locator('[role="textbox"][contenteditable="true"]');
    await messageEditor.click();
    await messageEditor.focus();

    // Use the keyboard shortcut
    const modifierKey = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifierKey}+/`);

    // Check that the search input appears
    const searchInput = page.getByPlaceholder("Search saved replies...");
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test("should populate subject field when saved reply is selected", async ({ page }) => {
    // Use multiple selectors for the new message button
    const newMessageButton = page
      .locator('button[aria-label="New message"]')
      .or(page.locator(".fixed.bottom-6.right-6 button"));
    await expect(newMessageButton).toBeVisible({ timeout: 10000 });
    await newMessageButton.click();

    // Wait for modal
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Check subject input is initially empty
    const subjectInput = modal.locator('input[placeholder="Subject"]');
    await expect(subjectInput).toBeVisible();
    expect(await subjectInput.inputValue()).toBe("");

    await expect(modal.locator('button[role="combobox"]')).toBeVisible({ timeout: 15000 });

    // Click saved reply selector
    const savedReplySelector = modal.locator('button[role="combobox"]');
    await expect(savedReplySelector).toBeVisible({ timeout: 10000 });
    await savedReplySelector.click();

    await expect(page.getByPlaceholder("Search saved replies...")).toBeVisible({ timeout: 5000 });

    // Search for the specific test saved reply
    const searchInput = page.getByPlaceholder("Search saved replies...");
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill(firstTestReplyName);

    const replyOptions = page.locator('[role="option"]');
    await expect(replyOptions.filter({ hasText: firstTestReplyName }).first()).toBeVisible({ timeout: 5000 });

    // Select the first (and should be only) option

    // Verify we found the correct saved reply
    const firstOptionText = await replyOptions.first().textContent();
    expect(firstOptionText).toContain(firstTestReplyName);

    await replyOptions.first().click();

    await expect(subjectInput).toHaveValue(firstTestReplyName, { timeout: 5000 });

    // Check that subject is populated
    const subjectValue = await subjectInput.inputValue();
    expect(subjectValue).toBe(firstTestReplyName);

    // Check that message content is populated
    const messageEditor = modal.locator('[role="textbox"][contenteditable="true"]');
    const editorContent = await messageEditor.textContent();
    expect(editorContent?.length).toBeGreaterThan(0);

    await takeDebugScreenshot(page, "subject-population-working.png");

    // Close the modal
    await page.keyboard.press("Escape");
  });

  test("should work on mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to the page
    await page.goto("/mine", { waitUntil: "domcontentloaded" });

    // Wait for network to stabilize
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
      // Continue even if networkidle times out
    });

    // Wait for page to stabilize on mobile
    await page.waitForTimeout(2000);

    // Use multiple selectors for the new message button
    const newMessageButton = page
      .locator('button[aria-label="New message"]')
      .or(page.locator(".fixed.bottom-6.right-6 button"));
    await expect(newMessageButton).toBeVisible({ timeout: 15000 });
    await newMessageButton.click();

    // Wait for modal
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Wait for modal content to load on mobile
    await page.waitForTimeout(2000);

    // Look for saved reply selector
    const savedReplySelector = modal.locator('button[role="combobox"]:has-text("Use saved reply")');

    // Wait longer for mobile rendering
    await expect(savedReplySelector).toBeVisible({ timeout: 15000 });

    await savedReplySelector.click();
    await page.waitForTimeout(800);

    // Check search input appears
    const searchInput = page.getByPlaceholder("Search saved replies...");
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    await takeDebugScreenshot(page, "new-message-mobile-saved-replies.png");

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("should filter saved replies when searching", async ({ page, context }) => {
    // Set a longer default timeout for this test
    test.setTimeout(60000);

    // Create a new page to avoid navigation issues
    const newPage = await context.newPage();

    try {
      await newPage.goto("/mine", {
        timeout: 30000,
        waitUntil: "domcontentloaded",
      });

      // Wait for network to stabilize
      await newPage.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {
        // Continue even if networkidle times out
      });

      // Wait for the page to be fully loaded
      await newPage.waitForTimeout(2000);

      // Use multiple selectors for the new message button
      const newMessageButton = newPage
        .locator('button[aria-label="New message"]')
        .or(newPage.locator(".fixed.bottom-6.right-6 button"));
      await expect(newMessageButton).toBeVisible({ timeout: 15000 });
      await newMessageButton.click();

      // Wait for modal and content to load
      const modal = newPage.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });
      await newPage.waitForTimeout(1500);

      // Click saved reply selector
      const savedReplySelector = modal.locator('button[role="combobox"]:has-text("Use saved reply")');
      await expect(savedReplySelector).toBeVisible({ timeout: 10000 });
      await savedReplySelector.click();
      await newPage.waitForTimeout(500);

      // Check we have multiple options initially
      const replyOptions = newPage.locator('[role="option"]');
      await expect(replyOptions.first()).toBeVisible({ timeout: 5000 });
      const initialCount = await replyOptions.count();
      expect(initialCount).toBeGreaterThanOrEqual(2);

      // Search for "Test Reply" which should match both our pre-created saved replies
      const searchInput = newPage.getByPlaceholder("Search saved replies...");
      await searchInput.fill("Test Reply");
      await newPage.waitForTimeout(800);

      // Check filtered results - should find both our test saved replies
      const filteredOptions = newPage.locator('[role="option"]');
      await expect(filteredOptions.first()).toBeVisible();

      // Verify we have both saved replies in the results
      const filteredCount = await filteredOptions.count();
      expect(filteredCount).toBeGreaterThanOrEqual(2); // Should find both our test saved replies

      // Verify the options contain our test saved replies
      const optionTexts = await filteredOptions.allTextContents();
      const hasFirstReply = optionTexts.some((text) => text.includes("Test Reply Primary"));
      const hasSecondReply = optionTexts.some((text) => text.includes("Test Reply Secondary"));
      expect(hasFirstReply).toBe(true);
      expect(hasSecondReply).toBe(true);

      await takeDebugScreenshot(newPage, "saved-reply-search-filtering.png");

      // Close modal
      await newPage.keyboard.press("Escape");
    } finally {
      await newPage.close();
    }
  });
});
