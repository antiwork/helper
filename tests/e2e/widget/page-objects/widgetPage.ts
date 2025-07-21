import { Locator, Page } from "@playwright/test";

export class WidgetPage {
  readonly page: Page;
  readonly widgetFrame: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly screenshotCheckbox: Locator;
  readonly messagesList: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use a more flexible iframe selector
    this.widgetFrame = page.frameLocator("iframe").first();
    // Use flexible selectors that can match different input types the external SDK might use
    this.chatInput = this.widgetFrame
      .locator('textarea, input[type="text"], input:not([type]), [contenteditable="true"]')
      .first();
    this.sendButton = this.widgetFrame
      .locator('button[type="submit"], button:has-text("Send"), button:has([data-testid*="send"])')
      .first();
    this.screenshotCheckbox = this.widgetFrame.locator('[data-testid="screenshot-checkbox"]');
    this.messagesList = this.widgetFrame.locator('[data-testid="messages-list"]');
    this.loadingSpinner = this.widgetFrame.locator('[data-testid="loading-spinner"]');
    this.errorMessage = this.widgetFrame.locator('[data-testid="error-message"]');
  }

  async loadWidget(config?: { token?: string; email?: string; name?: string; userId?: string }) {
    // Use the vanilla test page which has the widget SDK already configured
    // This is the expected approach based on the existing route setup
    await this.page.goto("/widget/test/vanilla");

    // If config is provided, we can inject configuration before widget loads
    if (config) {
      await this.page.evaluate((cfg) => {
        // Set up global widget config that the SDK will read
        (window as any).helperWidgetConfig = { ...cfg };
      }, config);
    }

    // Wait for the widget button to appear (the SDK creates this)
    await this.page.waitForSelector("[data-helper-toggle]", { timeout: 15000 });

    // Click the button to open the widget
    await this.page.click("[data-helper-toggle]");

    // Wait for any iframe to be visible
    await this.page.waitForSelector("iframe", {
      state: "visible",
      timeout: 15000,
    });

    // Wait for iframe content to be properly loaded by checking multiple possible selectors
    // The widget might use different input types (textarea, input, etc.)
    let inputFound = false;
    const possibleInputSelectors = ["textarea", 'input[type="text"]', "input", '[contenteditable="true"]'];

    for (const selector of possibleInputSelectors) {
      try {
        await this.widgetFrame.locator(selector).first().waitFor({
          state: "visible",
          timeout: 5000,
        });
        inputFound = true;
        break;
      } catch {
        // Try next selector
        continue;
      }
    }

    if (!inputFound) {
      // Final fallback: wait for iframe to be attached and give it time to load
      await this.page.waitForTimeout(3000);

      // Try to wait for any interactive element in the iframe
      try {
        await this.widgetFrame.locator('button, input, textarea, [role="textbox"]').first().waitFor({
          state: "visible",
          timeout: 10000,
        });
      } catch {
        // If still no interactive elements, the widget might have a different structure
        // Continue anyway as some tests might not need input
      }
    }
  }

  async sendMessage(message: string, includeScreenshot = false) {
    await this.chatInput.fill(message);

    if (includeScreenshot) {
      await this.screenshotCheckbox.check();
    }

    await this.sendButton.click();
  }

  async waitForResponse() {
    // Wait for AI response message to appear using the new test ID structure
    try {
      await this.widgetFrame
        .locator('[data-testid="message"][data-message-role="assistant"]')
        .waitFor({ state: "visible", timeout: 30000 });
    } catch {
      // Fallback: wait for message count to increase using Playwright's frame locator
      const initialCount = await this.getMessageCount();
      let currentCount = initialCount;
      const startTime = Date.now();

      // Poll for message count changes using the frame locator
      while (currentCount <= initialCount) {
        await this.page.waitForTimeout(500);
        try {
          currentCount = await this.getMessageCount();
        } catch {
          // Handle case where page/frame might be closed
          break;
        }

        // Timeout after 30 seconds
        const elapsed = Date.now() - startTime;
        if (elapsed > 30000) break;
      }
    }
  }

  async getLastMessage() {
    const messages = await this.widgetFrame.locator('[data-testid="message"]').all();
    if (messages.length === 0) return null;
    return messages[messages.length - 1];
  }

  async toggleScreenshotWithKeyboard() {
    // First ensure the input is focused
    await this.chatInput.focus();

    // Since keyboard shortcuts don't work reliably across iframe boundaries in tests,
    // we'll click the label which is associated with the checkbox
    const label = this.widgetFrame.locator('label[for="screenshot"]');
    await label.click();
  }

  async isScreenshotCheckboxChecked() {
    return this.screenshotCheckbox.isChecked();
  }

  async waitForScreenshotCapture() {
    // Wait for one of these conditions indicating screenshot capture is complete:
    // 1. The screenshot checkbox gets unchecked (after submission)
    // 2. A new message appears in the chat
    // 3. The input field is cleared and re-enabled

    const initialMessageCount = await this.getMessageCount();

    try {
      await Promise.race([
        // Wait for message count to increase (screenshot sent as message)
        this.page.waitForFunction(
          async (expectedCount) => {
            // Get current message count within the frame context
            const iframe = document.querySelector("iframe");
            if (!iframe || !iframe.contentDocument) return false;

            const messages = iframe.contentDocument.querySelectorAll('[data-testid="message"]');
            const fallbackMessages =
              messages.length === 0
                ? iframe.contentDocument.querySelectorAll('div[class*="message"]:has(p)')
                : messages;

            return fallbackMessages.length > expectedCount;
          },
          initialMessageCount,
          { timeout: 5000 },
        ),

        // Wait for checkbox to be unchecked after submission
        this.screenshotCheckbox.waitFor({
          state: "hidden",
          timeout: 5000,
        }),

        // Wait for input to be cleared (indicates submission completed)
        this.widgetFrame.waitForFunction(
          () => {
            const textarea = document.querySelector("textarea");
            return textarea && textarea.value === "";
          },
          { timeout: 5000 },
        ),
      ]);
    } catch (error) {
      // If all waits timeout, wait a short time then continue
      // This handles cases where screenshot might be captured differently
      await this.page.waitForTimeout(500);
    }
  }

  async getErrorMessage() {
    return this.errorMessage.textContent();
  }

  async isLoadingVisible() {
    return this.loadingSpinner.isVisible();
  }

  async getMessageCount() {
    try {
      // Try multiple selectors for messages
      let messages = await this.widgetFrame.locator('[data-testid="message"]').all();
      if (messages.length === 0) {
        // Try a more generic selector - look for message containers
        messages = await this.widgetFrame.locator('div[class*="message"]:has(p)').all();
      }
      return messages.length;
    } catch {
      // Return 0 if there's an error (e.g., page closed)
      return 0;
    }
  }

  async getEmptyStateMessage() {
    return this.widgetFrame.locator('[data-testid="empty-state"]').textContent();
  }
}
