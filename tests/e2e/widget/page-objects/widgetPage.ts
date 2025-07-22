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
    this.widgetFrame = page.frameLocator("iframe").first();
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
    await this.page.goto("/widget/test/vanilla");

    if (config) {
      await this.page.evaluate((cfg) => {
        (window as any).helperWidgetConfig = { ...cfg };
      }, config);
    }

    await this.page.waitForSelector("[data-helper-toggle]", { timeout: 15000 });

    await this.page.click("[data-helper-toggle]");

    await this.page.waitForSelector("iframe", {
      state: "visible",
      timeout: 15000,
    });

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
        continue;
      }
    }

    if (!inputFound) {
      await this.page.waitForTimeout(3000);

      try {
        await this.widgetFrame.locator('button, input, textarea, [role="textbox"]').first().waitFor({
          state: "visible",
          timeout: 10000,
        });
      } catch {}
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
    try {
      await this.widgetFrame
        .locator('[data-testid="message"][data-message-role="assistant"]')
        .waitFor({ state: "visible", timeout: 30000 });
    } catch {
      const initialCount = await this.getMessageCount();
      let currentCount = initialCount;
      const startTime = Date.now();

      while (currentCount <= initialCount) {
        await this.page.waitForTimeout(500);
        try {
          currentCount = await this.getMessageCount();
        } catch {
          break;
        }

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
    await this.chatInput.focus();

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

        this.page.waitForFunction(
          () => {
            const iframe = document.querySelector("iframe");
            if (!iframe || !iframe.contentDocument) return false;
            const textarea = iframe.contentDocument.querySelector("textarea");
            return textarea && textarea.value === "";
          },
          { timeout: 5000 },
        ),
      ]);
    } catch (error) {
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
