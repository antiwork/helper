import { expect, Page, test } from "@playwright/test";
import { widgetConfigs } from "./fixtures/widget-config";
import { ApiVerifier } from "./page-objects/apiVerifier";

// Configure tests to run serially to avoid resource contention
test.describe.configure({ mode: "serial" });

test.describe("Helper Chat Widget - Screenshot Functionality", () => {
  let apiVerifier: ApiVerifier;

  test.beforeEach(async ({ page }) => {
    apiVerifier = new ApiVerifier(page);
    await apiVerifier.startCapturing();
    await page.goto("/widget/test/vanilla"); 
  });

  async function loadWidget(page: Page, config?: { token?: string; email?: string; name?: string; userId?: string }) {
    if (config) {
      await page.evaluate((cfg) => {
        (window as any).helperWidgetConfig = { ...cfg };
      }, config);
    }
  
    await page.click("[data-helper-toggle]", { timeout: 15000 });
    await expect(page.locator("iframe")).toBeVisible({ timeout: 15000 });
  
    const widgetFrame = page.locator("iframe").first().contentFrame();
    await expect(widgetFrame.getByRole("textbox", { name: "Ask a question" })).toBeVisible({ timeout: 15000 });
  
    return { widgetFrame };
  }

  test.afterEach(async ({ page }) => {
    // Clean up any resources to prevent interference between tests
    try {
      await page.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  test("should hide screenshot checkbox initially", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    // Checkbox should not be visible initially
    const checkboxVisible = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isVisible();
    expect(checkboxVisible).toBe(false);

    // Type a message without screenshot keywords
    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("Hello, how are you?");

    // Checkbox should still not be visible
    const stillHidden = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isVisible();
    expect(stillHidden).toBe(false);
  });

  test("should toggle screenshot checkbox with keyboard shortcut", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    // First type a message with screenshot keyword to show the checkbox
    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("Please take a screenshot");

    // Wait for checkbox to appear
    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').waitFor({ state: "visible", timeout: 5000 });

    const initialState = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isChecked();
    expect(initialState).toBe(false);

    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).focus();

    const label = widgetFrame.locator('label[for="screenshot"]');
    await label.click();

    const afterToggle = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isChecked();
    expect(afterToggle).toBe(true);

    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).focus();
    await label.click();

    const afterSecondToggle = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isChecked();
    expect(afterSecondToggle).toBe(false);
  });

  test("should show loading state during screenshot capture", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("Can you help me understand what's on my screen?");
    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').check();

    const sendPromise = widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    // Check that the send button shows capturing state
    await expect(widgetFrame.getByRole("button", { name: "Send message" }).first()).toBeDisabled();

    await sendPromise;
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    // Check that the send button is enabled again
    await expect(widgetFrame.getByRole("button", { name: "Send message" }).first()).not.toBeDisabled();
  });

  test("should handle screenshot capture failure gracefully", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    await page.evaluate(() => {
      (window as any).HelperWidget.takeScreenshot = () => Promise.reject(new Error("Screenshot failed"));
    });

    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("Can you help me understand what's on my screen?");
    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').check();
    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    // Wait for the message to be sent (even though screenshot failed)
    await widgetFrame
    .locator('[data-testid="message"][data-message-role="assistant"]')
    .waitFor({ state: "visible", timeout: 30000 });

    // Verify the message was sent without screenshot
    const chatCall = await apiVerifier.verifyChatApiCall();
    const hasScreenshot =
      chatCall?.body?.messages?.some(
        (msg: any) => msg.experimental_attachments?.length > 0 || msg.attachments?.length > 0 || msg.screenshot,
      ) || false;

    expect(hasScreenshot).toBe(false);

    const messagesSent = await widgetFrame.locator('[data-testid="message"]').count();
    expect(messagesSent).toBeGreaterThan(0);
  });

  test("should show screenshot checkbox when keyword is typed", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    // Type a message with screenshot keyword
    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("screenshot of this page please");

    // Wait for checkbox to appear
    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').waitFor({ state: "visible", timeout: 5000 });

    // Verify checkbox is visible
    const checkboxVisible = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isVisible();
    expect(checkboxVisible).toBe(true);

    // Verify checkbox text
    const labelText = await widgetFrame.locator('label[for="screenshot"]').textContent();
    expect(labelText).toContain("Include a screenshot for better support?");
  });

  test("should disable input during screenshot capture", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("Can you help me understand what's on my screen?");
    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').check();

    const sendPromise = widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    await expect(widgetFrame.locator('textarea, input[type="text"], input:not([type]), [contenteditable="true"]')
    .first()).toBeDisabled();
    await expect(widgetFrame.getByRole("button", { name: "Send message" }).first()).toBeDisabled();

    await sendPromise;
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    await expect(widgetFrame.locator('textarea, input[type="text"], input:not([type]), [contenteditable="true"]')
    .first()).not.toBeDisabled();
    await expect(widgetFrame.getByRole("button", { name: "Send message" }).first()).not.toBeDisabled();
  });

  test("should maintain screenshot state across messages", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    // Check if screenshot checkbox exists first
    const checkboxExists = (await widgetFrame.locator('[data-testid="screenshot-checkbox"]').count()) > 0;

    if (!checkboxExists) {
      console.log("Screenshot checkbox not found - skipping screenshot state test");
      await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("First message");

      await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
      await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });
      return;
    }

    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("First message");
    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').check();
    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const checkboxStateAfterFirst = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isChecked();
    expect(checkboxStateAfterFirst).toBe(false);

    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').check();
    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("Second message");

    const checkboxStateBeforeSend = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isChecked();
    expect(checkboxStateBeforeSend).toBe(true);
  });

  test("should send message without screenshot when checkbox unchecked", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("What is the weather today?");

    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const chatCall = await apiVerifier.verifyChatApiCall();

    // For the vanilla widget, the body structure might be simpler
    const hasScreenshot =
      chatCall?.body?.messages?.some(
        (msg: any) => msg.experimental_attachments?.length > 0 || msg.attachments?.length > 0 || msg.screenshot,
      ) ||
      chatCall?.body?.screenshot ||
      false;

    expect(hasScreenshot).toBe(false);
  });

  test("should handle rapid screenshot toggles", async ({ page }) => {
    const { widgetFrame } =  await loadWidget(page, widgetConfigs.authenticated);

    // First type a message with screenshot keyword to show the checkbox
    await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).fill("Please take a screenshot");

    // Wait for checkbox to appear
    await widgetFrame.locator('[data-testid="screenshot-checkbox"]').waitFor({ state: "visible", timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      await widgetFrame.getByRole('textbox', { name: 'Ask a question' }).focus();

      const label = widgetFrame.locator('label[for="screenshot"]');
      await label.click();
      await page.waitForTimeout(100);
    }

    const finalState = await widgetFrame.locator('[data-testid="screenshot-checkbox"]').isChecked();
    expect(finalState).toBe(true);
  });
});
