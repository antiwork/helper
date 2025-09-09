import { expect, test, type Page } from "@playwright/test";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Conversation Details", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/conversations");
    await page.waitForLoadState("networkidle");

    const firstConversation = page
      .locator("div")
      .filter({ has: page.locator("a[href*='/conversations?id=']") })
      .first();
    const conversationLink = firstConversation.locator("a[href*='/conversations?id=']").first();
    await conversationLink.click();

    await page.waitForLoadState("networkidle");

    await page.waitForFunction(
      () => {
        const url = new URL(window.location.href);
        return url.searchParams.has("id") || url.pathname.includes("/conversations");
      },
      { timeout: 10000 },
    );
  });

  async function setupConversation(page: Page) {
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("conversation-header")).toBeVisible({ timeout: 10000 });

    await page.waitForFunction(
      () => {
        const header = document.querySelector('[data-testid="conversation-header"]');
        return header && !header.classList.contains("hidden");
      },
      { timeout: 15000 },
    );
  }

  async function verifyBasicConversationStructure(page: Page) {
    await expect(page.getByTestId("conversation-header")).toBeVisible();
    await expect(page.locator("button[aria-label='Previous conversation']")).toBeVisible();
    await expect(page.locator("button[aria-label='Next conversation']")).toBeVisible();
    await expect(page.getByTestId("conversation-counter")).toBeVisible();
  }

  async function getConversationSubject(page: Page) {
    const subject = await page.getByTestId("conversation-subject").textContent();
    return subject?.trim() || "";
  }

  async function getConversationCounter(page: Page) {
    const counter = await page.getByTestId("conversation-counter").textContent();
    return counter?.trim() || "";
  }

  async function getMessageCount(page: Page) {
    return await page.locator("[data-message-item]").count();
  }

  async function goToNextConversation(page: Page) {
    await page.locator("button[aria-label='Next conversation']").click();
    await page.waitForLoadState("networkidle");
  }

  async function goToPreviousConversation(page: Page) {
    await page.locator("button[aria-label='Previous conversation']").click();
    await page.waitForLoadState("networkidle");
  }

  async function closeConversation(page: Page) {
    await page.locator("button[aria-label='Close View']").click();
  }

  async function testMessageStructure(page: Page, maxMessages: number = 3) {
    const messages = page.locator("[data-message-item]");
    const count = await messages.count();

    for (let i = 0; i < Math.min(count, maxMessages); i++) {
      const message = messages.nth(i);
      await expect(message).toBeVisible();
    }
  }

  async function performNavigationTest(page: Page): Promise<{
    changed: boolean;
    originalSubject: string;
    originalCounter: string;
  }> {
    const originalSubject = await getConversationSubject(page);
    const originalCounter = await getConversationCounter(page);

    await goToNextConversation(page);
    await setupConversation(page);

    const nextSubject = await getConversationSubject(page);
    const nextCounter = await getConversationCounter(page);

    const changed = nextCounter !== originalCounter;
    if (changed) {
      expect(nextSubject).not.toBe(originalSubject);
    }

    return { changed, originalSubject, originalCounter };
  }

  async function validateCounterFormat(page: Page) {
    const counter = await getConversationCounter(page);
    const counterPattern = /^\d+ of \d+\+?$/;
    expect(counter).toMatch(counterPattern);

    const match = counter.match(/^(\d+) of (\d+)\+?$/);
    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      expect(current).toBeGreaterThan(0);
      expect(current).toBeLessThanOrEqual(total);
    }
  }

  async function expectMessageExists(page: Page, messageContent: string) {
    const messageItem = page.locator("[data-message-item]").filter({ hasText: messageContent });
    await expect(messageItem).toBeVisible();
  }

  async function createInternalNoteIfAvailable(page: Page, testNote: string) {
    const addNoteButton = page.getByRole("button", { name: "Add internal note" });
    const addNoteExists = await addNoteButton.count();

    if (addNoteExists > 0 && (await addNoteButton.isVisible())) {
      await addNoteButton.click();

      const noteInput = page.locator("textarea, .ProseMirror").first();

      if (await noteInput.isVisible()) {
        await noteInput.fill(testNote);

        const submitButton = page.getByRole("button", { name: "Save" });
        await submitButton.click();

        await page.waitForLoadState("networkidle");
        await expectMessageExists(page, testNote);
        return true;
      }
    }
    return false;
  }

  async function attemptInternalNoteCreation(page: Page) {
    const notePrefix = "Internal note";
    const testNote = `${notePrefix} ${generateRandomString(8)}`;
    const noteCreated = await createInternalNoteIfAvailable(page, testNote);

    if (noteCreated) {
      await expectMessageExists(page, testNote);
    }
  }

  test("should show conversation subject, display messages, conversation counter and navigate between conversations", async ({
    page,
  }) => {
    await setupConversation(page);

    await validateCounterFormat(page);

    const subject = await getConversationSubject(page);
    expect(subject.length).toBeGreaterThan(0);

    await expect(page.getByTestId("conversation-subject")).toBeVisible();

    const messageCount = await getMessageCount(page);
    expect(messageCount).toBeGreaterThan(0);
    await performNavigationTest(page);
  });

  test("should display conversation with multiple messages and close conversation and return to list", async ({
    page,
  }) => {
    await setupConversation(page);
    await verifyBasicConversationStructure(page);

    const messageCount = await getMessageCount(page);
    expect(messageCount).toBeGreaterThan(0);

    await testMessageStructure(page);

    await closeConversation(page);

    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/conversations");

    await expect(page.locator("a[href*='/conversations?id=']").first()).toBeVisible();
  });

  test("should handle conversation navigation properly", async ({ page }) => {
    await setupConversation(page);

    const { changed, originalSubject } = await performNavigationTest(page);

    if (changed) {
      await goToPreviousConversation(page);
      await setupConversation(page);

      const backSubject = await getConversationSubject(page);
      expect(backSubject).toBe(originalSubject);
    }
  });

  test("should test scroll functionality in long conversations", async ({ page }) => {
    // Long conversation
    await page.goto("/all");
    await page.getByRole("textbox", { name: "Search conversations" }).fill("billing issue - double charge");
    const longConversationLink = page.getByRole("link", { name: "creative.pro55@example.com $" });
    await expect(longConversationLink).toBeVisible();
    await longConversationLink.click();
    await setupConversation(page);
    const messageThreadPanel = page.getByTestId("message-thread-panel");
    const scrollToTopButton = page.getByRole("button", { name: "Scroll to top" });

    await expect(scrollToTopButton).toHaveAttribute("tabindex", "0");
    await scrollToTopButton.click();

    await expect(messageThreadPanel).toHaveJSProperty("scrollTop", 0);
    await expect(scrollToTopButton).toHaveAttribute("tabindex", "-1");
  });

  test("should close conversation and return to list", async ({ page }) => {
    await setupConversation(page);

    await closeConversation(page);

    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/conversations");

    await expect(page.locator("a[href*='/conversations?id=']").first()).toBeVisible();
  });

  test("should handle conversation counter display correctly", async ({ page }) => {
    await setupConversation(page);
    await validateCounterFormat(page);
  });

  test("should create and display internal note", async ({ page }) => {
    await setupConversation(page);
    await attemptInternalNoteCreation(page);
  });

  test("should focus reply editor when opening conversation", async ({ page }) => {
    await setupConversation(page);

    const replyEditor = page.locator(".ProseMirror").first();
    await expect(replyEditor).toBeVisible();
    await expect(replyEditor).toBeFocused();

    await goToNextConversation(page);
    await setupConversation(page);

    const nextReplyEditor = page.locator(".ProseMirror").first();
    await expect(nextReplyEditor).toBeVisible();
    await expect(nextReplyEditor).toBeFocused();
  });

  test("should navigate to the next conversation when clicking the next conversation preview", async ({ page }) => {
    await setupConversation(page);

    const originalSubject = await getConversationSubject(page);
    const originalCounter = await getConversationCounter(page);

    const nextConversationPreview = page.getByTestId("conversation-list-item-content");
    await expect(nextConversationPreview.locator("text=Answer Next:")).toBeVisible();
    await expect(nextConversationPreview.locator(`text=${originalSubject}`)).not.toBeVisible();

    await nextConversationPreview.click();
    await page.waitForLoadState("networkidle");
    await setupConversation(page);

    const newSubject = await getConversationSubject(page);
    const newCounter = await getConversationCounter(page);
    expect(newCounter).not.toBe(originalCounter);
    expect(newSubject).not.toBe(originalSubject);
  });
});
