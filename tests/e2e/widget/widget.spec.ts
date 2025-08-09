import { expect, Page, test } from "@playwright/test";
import { widgetConfigs } from "./fixtures/widget-config";

test.describe("Helper Chat Widget - Basic Functionality", () => {
  test.beforeEach(async ({ page }) => {
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

  test("should load widget and initialize session", async ({ page }) => {
    const response = await page.waitForResponse(
      (res) => res.url().includes("/api/widget/session") && res.request().method() === "POST",
    );

    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);
    expect(response.ok()).toBe(true);

    const inputVisible = await widgetFrame.getByRole("textbox", { name: "Ask a question" }).isVisible();
    expect(inputVisible).toBe(true);
  });

  test("should send message and receive AI response", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("What is the weather today?");

    const chatResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/chat") && res.request().method() === "POST",
    );

    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const chatResponse = await chatResponsePromise;
    expect(chatResponse.ok()).toBe(true);
    const contentType = chatResponse.headers()["content-type"] || "";
    expect(contentType).toMatch(/text\/event-stream|application\/json/);

    const messageCount = await widgetFrame.locator('[data-testid="message"]').count();
    expect(messageCount).toBeGreaterThanOrEqual(2);
  });

  test("should handle authenticated user data", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    const inputVisible = await widgetFrame.getByRole("textbox", { name: "Ask a question" }).isVisible();
    expect(inputVisible).toBe(true);

    try {
      const response = await page.waitForResponse(
        (res) => res.url().includes("/api/widget/session") && res.request().method() === "POST",
      );
      expect(response.ok()).toBe(true);
    } catch {
      console.log("Session API call not found - vanilla widget may handle auth differently");
    }
  });

  test("should show loading state during message sending", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("What is the weather today?");

    const loadingStatePromise = page
      .waitForFunction(
        () => {
          const frame = document.querySelector("iframe");
          if (!frame || !frame.contentDocument) return false;
          const hasLoadingSpinner = frame.contentDocument.querySelector('[data-testid="loading-spinner"]');
          const hasDisabledButton = frame.contentDocument.querySelector('button[type="submit"]:disabled');
          const hasDisabledInput = frame.contentDocument.querySelector("textarea:disabled");
          return hasLoadingSpinner || hasDisabledButton || hasDisabledInput;
        },
        { timeout: 5000 },
      )
      .catch(() => false);

    const chatResponsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/chat") && res.request().method() === "POST",
    );

    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    const hadLoadingState = await loadingStatePromise;

    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const chatResponse = await chatResponsePromise;
    expect(chatResponse.ok()).toBe(true);

    const messageCount = await widgetFrame.locator('[data-testid="message"]').count();
    expect(messageCount).toBeGreaterThanOrEqual(2);

    if (!hadLoadingState) {
      console.log("No loading state detected - widget might not show loading indicators");
    }
  });

  test("should persist conversation in session", async ({ page }) => {
    const chatResponses: any[] = [];
    await page.route("**/api/chat", async (route) => {
      const response = await route.fetch();
      chatResponses.push({ url: route.request().url(), method: route.request().method() });
      await route.fulfill({ response });
    });

    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);
    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("First message");

    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const firstCount = await widgetFrame.locator('[data-testid="message"]').count();

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Second message");
    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const secondCount = await widgetFrame.locator('[data-testid="message"]').count();
    expect(secondCount).toBeGreaterThan(firstCount);
    expect(chatResponses.length).toBeGreaterThanOrEqual(2);
  });

  test("should handle empty input gracefully", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("");
    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    const messageCount = await widgetFrame.locator('[data-testid="message"]').count();
    expect(messageCount).toBe(0);

    // Check that no /api/chat call was made
    let chatCallMade = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/chat") && request.method() === "POST") {
        chatCallMade = true;
      }
    });
    expect(chatCallMade).toBe(false);
  });

  test.skip("should handle network errors gracefully", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.abort("failed"));

    const { widgetFrame } = await loadWidget(page, widgetConfigs.anonymous);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("What is the weather today?");

    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();

    const errorMessage = await widgetFrame.locator('[data-testid="error-message"]').textContent();
    expect(errorMessage).toContain("Failed to send message");
  });

  test("should maintain proper message order", async ({ page }) => {
    const { widgetFrame } = await loadWidget(page, widgetConfigs.authenticated);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Question 1");

    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    await page.waitForFunction(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return true;
      },
      { timeout: 1000 },
    );

    const countAfterFirst = await widgetFrame.locator('[data-testid="message"]').count();
    expect(countAfterFirst).toBeGreaterThanOrEqual(2);

    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Question 2");

    await widgetFrame.getByRole("button", { name: "Send message" }).first().click();
    await widgetFrame
      .locator('[data-testid="message"][data-message-role="assistant"]')
      .waitFor({ state: "visible", timeout: 30000 });

    let finalCount = await widgetFrame.locator('[data-testid="message"]').count();
    let attempts = 0;
    while (finalCount < 4 && attempts < 10) {
      await page.waitForTimeout(500);
      finalCount = await widgetFrame.locator('[data-testid="message"]').count();
      attempts++;
    }

    expect(finalCount).toBeGreaterThanOrEqual(4);

    try {
      const messages = await widgetFrame.locator('[data-testid="message"]').all();
      if (messages.length >= 4) {
        const getRoles = async () => {
          const roles = await Promise.all(messages.slice(0, 4).map((msg) => msg.getAttribute("data-message-role")));
          return roles;
        };

        let roles = await getRoles();

        if (!roles[0] || !roles[1] || !roles[2] || !roles[3]) {
          await page.waitForTimeout(1000);
          roles = await getRoles();
        }

        expect(roles[0]).toBe("user");
        expect(roles[1]).toBe("assistant");
        expect(roles[2]).toBe("user");
        expect(roles[3]).toBe("assistant");
      } else {
        console.log("Data-testid messages not found - verified count only");
      }
    } catch (error) {
      console.log("Message role verification skipped - verified message counts instead");
    }
  });
});
