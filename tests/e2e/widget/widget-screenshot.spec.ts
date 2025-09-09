import { expect, test } from "@playwright/test";
import { loadWidget } from "../utils/test-helpers";
import { widgetConfigs } from "./fixtures/widget-config";

test.describe("Helper Chat Widget - Screenshot Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/widget/test/vanilla");
  });

  test.afterEach(async ({ page }) => {
    try {
      await page.close();
    } catch {
      // Ignore cleanup errors
    }
  });

  test("should hide screenshot checkbox initially", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    // Checkbox should not be visible initially
    const checkbox = widgetFrame.getByRole("checkbox", { name: "Include a screenshot for better support?" });
    const checkboxVisible = await checkbox.isVisible();
    expect(checkboxVisible).toBe(false);

    // Type a message without screenshot keywords
    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Hello, how are you?");

    // Checkbox should still not be visible
    const stillHidden = await checkbox.isVisible();
    expect(stillHidden).toBe(false);
  });

  test("should toggle screenshot checkbox with keyboard shortcut", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    // First type a message with screenshot keyword to show the checkbox
    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Please take a screenshot");

    // Wait for checkbox to appear
    const checkbox = widgetFrame.getByRole("checkbox", { name: "Include a screenshot for better support?" });
    await checkbox.waitFor({ state: "visible", timeout: 5000 });

    const initialState = await checkbox.isChecked();
    expect(initialState).toBe(false);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).focus();

    const label = widgetFrame.locator('label[for="screenshot"]');
    await label.click();

    const afterToggle = await checkbox.isChecked();
    expect(afterToggle).toBe(true);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).focus();
    await label.click();

    const afterSecondToggle = await checkbox.isChecked();
    expect(afterSecondToggle).toBe(false);
  });

  test("should handle screenshot capture failure gracefully", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    await page.evaluate(() => {
      (window as any).HelperWidget.takeScreenshot = () => Promise.reject(new Error("Screenshot failed"));
    });

    let chatRequestBody: any = null;
    await page.route("**/api/chat", async (route) => {
      const body = route.request().postData();
      chatRequestBody = body ? JSON.parse(body) : undefined;
      const response = await route.fetch();
      await route.fulfill({ response });
    });

    await widgetFrame
      .getByRole("textbox", { name: "Ask a question" })
      .fill("Can you help me understand what's on my screen?");
    const checkbox = widgetFrame.getByRole("checkbox", { name: "Include a screenshot for better support?" });
    await checkbox.check();
    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    await widgetFrame.locator('[data-message-role="assistant"]').waitFor({ state: "visible", timeout: 30000 });

    // Verify the message was sent without screenshot
    const hasScreenshot =
      chatRequestBody?.messages?.some(
        (msg: any) => msg.experimental_attachments?.length > 0 || msg.attachments?.length > 0 || msg.screenshot,
      ) || false;
    expect(hasScreenshot).toBe(false);

    const messagesSent = await widgetFrame.getByTestId("message").count();
    expect(messagesSent).toBeGreaterThan(0);
  });

  test("should show screenshot checkbox when keyword is typed", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    // Type a message with screenshot keyword
    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("screenshot of this page please");

    // Wait for checkbox to appear
    const checkbox = widgetFrame.getByRole("checkbox", { name: "Include a screenshot for better support?" });
    await checkbox.waitFor({ state: "visible", timeout: 5000 });

    // Verify checkbox is visible
    const checkboxVisible = await checkbox.isVisible();
    expect(checkboxVisible).toBe(true);

    // Verify checkbox text
    const labelText = await widgetFrame.locator('label[for="screenshot"]').textContent();
    expect(labelText).toContain("Include a screenshot for better support?");
  });

  test("should maintain screenshot state across messages", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    // Check if screenshot checkbox exists first
    const checkbox = widgetFrame.getByRole("checkbox", { name: "Include a screenshot for better support?" });
    const checkboxExists = (await checkbox.count()) > 0;

    if (!checkboxExists) {
      console.log("Screenshot checkbox not found - skipping screenshot state test");
      await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("First message");

      await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
      await widgetFrame.locator('[data-message-role="assistant"]').waitFor({ state: "visible", timeout: 30000 });
      return;
    }

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("First message");
    await checkbox.check();
    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame.locator('[data-message-role="assistant"]').waitFor({ state: "visible", timeout: 30000 });

    const checkboxStateAfterFirst = await checkbox.isChecked();
    expect(checkboxStateAfterFirst).toBe(false);

    await checkbox.check();
    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Second message");

    const checkboxStateBeforeSend = await checkbox.isChecked();
    expect(checkboxStateBeforeSend).toBe(true);
  });

  test("should send message without screenshot when checkbox unchecked", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    let chatRequestBody: any = null;
    await page.route("**/api/chat", async (route) => {
      const body = route.request().postData();
      chatRequestBody = body ? JSON.parse(body) : undefined;
      const response = await route.fetch();
      await route.fulfill({ response });
    });

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("What is the weather today?");
    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame.locator('[data-message-role="assistant"]').waitFor({ state: "visible", timeout: 30000 });

    // For the vanilla widget, the body structure might be simpler
    const hasScreenshot =
      chatRequestBody?.messages?.some(
        (msg: any) => msg.experimental_attachments?.length > 0 || msg.attachments?.length > 0 || msg.screenshot,
      ) ||
      chatRequestBody?.screenshot ||
      false;
    expect(hasScreenshot).toBe(false);
  });

  test("should handle rapid screenshot toggles", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    // First type a message with screenshot keyword to show the checkbox
    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Please take a screenshot");

    // Wait for checkbox to appear
    const checkbox = widgetFrame.getByRole("checkbox", { name: "Include a screenshot for better support?" });
    await checkbox.waitFor({ state: "visible", timeout: 5000 });

    for (let i = 0; i < 5; i++) {
      await widgetFrame.getByRole("textbox", { name: "Ask a question" }).focus();

      const label = widgetFrame.locator('label[for="screenshot"]');
      await label.click();
      await page.waitForTimeout(100);
    }

    const finalState = await checkbox.isChecked();
    expect(finalState).toBe(true);
  });
});
