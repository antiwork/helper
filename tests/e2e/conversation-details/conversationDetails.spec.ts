import { expect, test } from "@playwright/test";
import { ConversationDetailsPage } from "../utils/page-objects/conversationDetailsPage";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Conversation Details", () => {
  const TEST_CONSTANTS = {
    MAX_MESSAGES_TO_TEST: 3,
    SCROLL_TEST_POSITION: 300,
    SCROLL_ANIMATION_DELAY: 300,
    SCROLL_VERIFICATION_DELAY: 200,
    MAX_WAIT_TIME: 15000,
    COUNTER_PATTERN: /^\d+ of \d+\+?$/,
    NOTE_PREFIX: "Internal note",
  } as const;

  let conversationDetailsPage: ConversationDetailsPage;

  test.beforeEach(async ({ page }) => {
    conversationDetailsPage = new ConversationDetailsPage(page);
  });

  const setupConversation = async (): Promise<void> => {
    await conversationDetailsPage.navigateToConversation();
    await conversationDetailsPage.waitForConversationLoad();

    await conversationDetailsPage.page.waitForFunction(
      () => {
        const header = document.querySelector('[data-testid="conversation-header"]');
        return header && !header.classList.contains("hidden");
      },
      { timeout: TEST_CONSTANTS.MAX_WAIT_TIME },
    );
  };

  const verifyBasicConversationStructure = async (): Promise<void> => {
    await conversationDetailsPage.expectConversationLoaded();
    await conversationDetailsPage.expectNavigationControls();
  };

  const testMessageStructure = async (maxMessages: number = TEST_CONSTANTS.MAX_MESSAGES_TO_TEST): Promise<void> => {
    const messages = conversationDetailsPage.page.getByTestId("message-item");
    const count = await messages.count();

    for (let i = 0; i < Math.min(count, maxMessages); i++) {
      const message = messages.nth(i);
      await expect(message).toBeVisible();
      await expect(message.getByTestId("message-header")).toBeVisible();
      await expect(message.getByTestId("message-content")).toBeVisible();
      await expect(message.getByTestId("message-footer")).toBeVisible();
    }
  };

  const performNavigationTest = async (): Promise<{
    changed: boolean;
    originalSubject: string;
    originalCounter: string;
  }> => {
    const originalSubject = await conversationDetailsPage.getConversationSubject();
    const originalCounter = await conversationDetailsPage.getConversationCounter();

    await conversationDetailsPage.goToNextConversation();
    await conversationDetailsPage.waitForConversationLoad();

    const nextSubject = await conversationDetailsPage.getConversationSubject();
    const nextCounter = await conversationDetailsPage.getConversationCounter();

    const changed = nextCounter !== originalCounter;
    if (changed) {
      expect(nextSubject).not.toBe(originalSubject);
    }

    return { changed, originalSubject, originalCounter };
  };

  const performScrollTest = async (): Promise<void> => {
    const messageCount = await conversationDetailsPage.getMessageCount();

    if (messageCount > 0) {
      const messageThreadPanel = conversationDetailsPage.page.getByTestId("message-thread-panel");

      await messageThreadPanel.evaluate((el, scrollPos) => {
        el.scrollTop = scrollPos;
      }, TEST_CONSTANTS.SCROLL_TEST_POSITION);

      await conversationDetailsPage.page.waitForTimeout(TEST_CONSTANTS.SCROLL_ANIMATION_DELAY);

      const scrollButton = conversationDetailsPage.page.locator("[aria-label='Scroll to top']");
      await expect(scrollButton).toBeAttached();

      if (await scrollButton.isVisible()) {
        await scrollButton.click();
        await conversationDetailsPage.page.waitForTimeout(TEST_CONSTANTS.SCROLL_VERIFICATION_DELAY);

        const newScrollTop = await messageThreadPanel.evaluate((el) => el.scrollTop);
        expect(newScrollTop).toBeLessThan(TEST_CONSTANTS.SCROLL_TEST_POSITION);
      }
    }
  };

  const validateCounterFormat = async (): Promise<void> => {
    const counter = await conversationDetailsPage.getConversationCounter();
    expect(counter).toMatch(TEST_CONSTANTS.COUNTER_PATTERN);

    const match = counter.match(/^(\d+) of (\d+)\+?$/);
    if (match) {
      const current = parseInt(match[1]);
      const total = parseInt(match[2]);
      expect(current).toBeGreaterThan(0);
      expect(current).toBeLessThanOrEqual(total);
    }
  };

  const attemptInternalNoteCreation = async (): Promise<void> => {
    const testNote = `${TEST_CONSTANTS.NOTE_PREFIX} ${generateRandomString(8)}`;
    const noteCreated = await conversationDetailsPage.createInternalNoteIfAvailable(testNote);

    if (noteCreated) {
      await conversationDetailsPage.expectMessageExists(testNote);
    }
  };

  test("should display conversation details page", async () => {
    await setupConversation();
    await verifyBasicConversationStructure();
  });

  test("should show conversation subject", async () => {
    await setupConversation();

    const subject = await conversationDetailsPage.getConversationSubject();
    expect(subject.length).toBeGreaterThan(0);
  });

  test("should display messages in conversation", async () => {
    await setupConversation();

    const messageCount = await conversationDetailsPage.getMessageCount();
    expect(messageCount).toBeGreaterThan(0);
  });

  test("should navigate between conversations", async () => {
    await setupConversation();
    await performNavigationTest();
  });

  test("should toggle sidebar", async () => {
    await setupConversation();

    await conversationDetailsPage.toggleSidebar();

    await expect(conversationDetailsPage.page.locator("button[aria-label='Toggle sidebar']")).toBeVisible();
  });

  test("should close conversation", async () => {
    await setupConversation();

    await conversationDetailsPage.closeConversation();

    expect(conversationDetailsPage.page.url()).toContain("/conversations");
  });

  test("should display conversation with multiple messages", async () => {
    await setupConversation();
    await verifyBasicConversationStructure();

    const messageCount = await conversationDetailsPage.getMessageCount();
    expect(messageCount).toBeGreaterThan(0);

    await testMessageStructure();
  });

  test("should handle conversation navigation properly", async () => {
    await setupConversation();

    const { changed, originalSubject } = await performNavigationTest();

    if (changed) {
      await conversationDetailsPage.goToPreviousConversation();
      await conversationDetailsPage.waitForConversationLoad();

      const backSubject = await conversationDetailsPage.getConversationSubject();
      expect(backSubject).toBe(originalSubject);
    }
  });

  test("should test scroll functionality in long conversations", async () => {
    await setupConversation();
    await performScrollTest();
  });

  test("should close conversation and return to list", async () => {
    await setupConversation();

    await conversationDetailsPage.closeConversation();

    await conversationDetailsPage.page.waitForLoadState("networkidle");
    await expect(conversationDetailsPage.page.url()).toContain("/conversations");

    await expect(conversationDetailsPage.page.getByTestId("conversation-list-item").first()).toBeVisible();
  });

  test("should handle conversation counter display correctly", async () => {
    await setupConversation();
    await validateCounterFormat();
  });

  test("should create and display internal note", async () => {
    await setupConversation();
    await attemptInternalNoteCreation();
  });
});
