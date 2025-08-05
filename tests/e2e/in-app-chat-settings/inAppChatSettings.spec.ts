import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("In-App Chat Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/in-app-chat");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "In-App Chat" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Documentation" })).toBeVisible();
  });

  test.describe("Widget Installation Documentation", () => {
    test("should display installation tabs and documentation link", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "In-App Chat" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Documentation" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "HTML/JavaScript" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "React/Next.js" })).toBeVisible();
    });

    test("should switch between vanilla JS and React tabs", async ({ page }) => {
      const vanillaJsTab = page.getByRole("tab", { name: "HTML/JavaScript" });
      const reactTab = page.getByRole("tab", { name: "React/Next.js" });

      await expect(vanillaJsTab).toHaveAttribute("data-state", "active");
      await expect(page.getByText("Copy and paste this code into your website:")).toBeVisible();

      await reactTab.click();
      await expect(reactTab).toHaveAttribute("data-state", "active");
      await expect(page.getByText("Install the React package:")).toBeVisible();
      await expect(page.getByText("npm install @helperai/react")).toBeVisible();

      await vanillaJsTab.click();
      await expect(vanillaJsTab).toHaveAttribute("data-state", "active");
      await expect(page.getByText("Copy and paste this code into your website:")).toBeVisible();
    });

    test("should copy AI agent prompt", async ({ page }) => {
      const copyButton = page.getByLabel("Copy AI Prompt Vanilla");
      await copyButton.click();
      await expect(copyButton).toContainText("Copied!", { timeout: 3000 });
    });

    test("should expand accordion sections", async ({ page }) => {
      const customizeWidgetAccordion = page.getByRole("button", { name: "Customize the widget" });
      await customizeWidgetAccordion.click();
      await expect(customizeWidgetAccordion).toHaveAttribute("data-state", "open");
      await expect(page.getByText("Customize the widget by adding")).toBeVisible();

      const contextualHelpAccordion = page.getByRole("button", { name: "Add contextual help buttons" });
      await contextualHelpAccordion.click();
      await expect(contextualHelpAccordion).toHaveAttribute("data-state", "open");
      await expect(page.getByText("Use the data-helper-prompt attribute").first()).toBeVisible();

      const authenticateUsersAccordion = page.getByRole("button", { name: "Authenticate your users" });
      await authenticateUsersAccordion.click();
      await expect(authenticateUsersAccordion).toHaveAttribute("data-state", "open");
      await expect(page.getByText("First, you'll need to generate an HMAC hash")).toBeVisible();
    });
  });

  test.describe("Chat Icon Visibility Settings", () => {
    test("should enable and disable chat icon visibility", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const widgetPreviewIndicator = page.getByText("Try it out →");

      const isChecked = await chatIconSwitch.isChecked();
      if (isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(1000);
      }

      await chatIconSwitch.click();
      await page.waitForTimeout(1000);
      await expect(chatIconSwitch).toBeChecked();
      await expect(widgetPreviewIndicator).toBeVisible();

      await chatIconSwitch.click();
      await page.waitForTimeout(1000);
      await expect(chatIconSwitch).not.toBeChecked();
      await expect(widgetPreviewIndicator).not.toBeVisible();
    });

    test("should configure visibility for all customers", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByLabel("chat-icon-visibility-select-trigger");
      const allCustomersOption = page.getByRole("option", { name: "All customers" });
      const minCustomerValueInput = page.getByLabel("min-customer-value-input");

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(500);
      }

      await expect(chatIconSelect).toBeVisible();
      await chatIconSelect.click();
      await allCustomersOption.click();
      await page.waitForTimeout(1000);

      await expect(minCustomerValueInput).not.toBeVisible();
    });

    test("should configure revenue-based visibility", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByLabel("chat-icon-visibility-select-trigger");
      const revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
      const minCustomerValueInput = page.getByLabel("min-customer-value-input");

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(500);
      }

      await expect(chatIconSelect).toBeVisible();
      await chatIconSelect.click();
      await revenueBasedOption.click();
      await page.waitForTimeout(500);

      await expect(minCustomerValueInput).toBeVisible();

      await minCustomerValueInput.fill("500");
      await page.waitForTimeout(1000);

      await expect(minCustomerValueInput).toHaveValue("500");
    });

    test("should persist visibility settings across page reloads", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByLabel("chat-icon-visibility-select-trigger");
      const revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
      const minCustomerValueInput = page.getByLabel("min-customer-value-input");

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(500);
      }

      await expect(chatIconSelect).toBeVisible();
      await chatIconSelect.click();
      await revenueBasedOption.click();
      await page.waitForTimeout(500);
      await minCustomerValueInput.fill("1000");
      await page.waitForTimeout(1000);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "In-App Chat" })).toBeVisible();

      await expect(chatIconSwitch).toBeChecked();
      await expect(minCustomerValueInput).toBeVisible();
      await expect(minCustomerValueInput).toHaveValue("1000");
    });
  });

  test.describe("Host URL Configuration", () => {
    test("should set and clear host URL", async ({ page }) => {
      const testUrl = "https://example.com";
      const hostUrlInput = page.getByLabel("Host URL");

      await hostUrlInput.fill(testUrl);
      await page.waitForTimeout(1000);

      await expect(hostUrlInput).toHaveValue(testUrl);

      await hostUrlInput.clear();
      await page.waitForTimeout(1000);

      await expect(hostUrlInput).toHaveValue("");
    });

    test("should persist host URL across page reloads", async ({ page }) => {
      const testUrl = "https://my-app.com";
      const hostUrlInput = page.getByLabel("Host URL");

      await hostUrlInput.fill(testUrl);
      await page.waitForTimeout(1000);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "In-App Chat" })).toBeVisible();

      await expect(hostUrlInput).toHaveValue(testUrl);
    });

    test("should validate URL format", async ({ page }) => {
      const hostUrlInput = page.getByLabel("Host URL");

      await hostUrlInput.fill("not-a-valid-url");
      await page.waitForTimeout(1000);

      await expect(hostUrlInput).toHaveValue("not-a-valid-url");
    });
  });

  test.describe("Email Response Settings", () => {
    test("should switch between email response modes", async ({ page }) => {
      const emailResponseTabs = page.getByLabel("email-response-tabs");
      const offTab = emailResponseTabs.getByRole("tab", { name: "Off" });
      const draftTab = emailResponseTabs.getByRole("tab", { name: "Draft" });
      const replyTab = emailResponseTabs.getByRole("tab", { name: "Reply" });

      await offTab.click();
      await expect(offTab).toHaveAttribute("data-state", "active");

      await draftTab.click();
      await expect(draftTab).toHaveAttribute("data-state", "active");

      await replyTab.click();
      await expect(replyTab).toHaveAttribute("data-state", "active");
    });

    test("should persist email response settings", async ({ page }) => {
      const emailResponseTabs = page.getByLabel("email-response-tabs");
      const draftTab = emailResponseTabs.getByRole("tab", { name: "Draft" });

      await draftTab.click();
      await page.waitForTimeout(1000);

      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "In-App Chat" })).toBeVisible();

      await expect(draftTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Widget Integration", () => {
    test("should show widget when enabled and hide when disabled", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const widgetPreviewIndicator = page.getByText("Try it out →");

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(1000);
      }

      await expect(widgetPreviewIndicator).toBeVisible();

      await chatIconSwitch.click();
      await page.waitForTimeout(1000);

      await expect(widgetPreviewIndicator).not.toBeVisible();
    });
  });

  test.describe("Form Validation and Error Handling", () => {
    test("should handle numeric validation for minimum customer value", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByLabel("chat-icon-visibility-select-trigger");
      const revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
      const minCustomerValueInput = page.getByLabel("min-customer-value-input");

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(500);
      }

      await expect(chatIconSelect).toBeVisible();
      await chatIconSelect.click();
      await revenueBasedOption.click();
      await page.waitForTimeout(500);

      await minCustomerValueInput.fill("100");
      await expect(minCustomerValueInput).toHaveValue("100");

      await minCustomerValueInput.fill("99.99");
      await page.waitForTimeout(1000);

      await minCustomerValueInput.fill("-50");
      await page.waitForTimeout(1000);
    });

    test("should show saving indicators", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const hostUrlInput = page.getByLabel("Host URL");
      const emailResponseTabs = page.getByLabel("email-response-tabs");
      const draftTab = emailResponseTabs.getByRole("tab", { name: "Draft" });

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(100);
      }

      await hostUrlInput.fill("https://test.com");
      await page.waitForTimeout(100);

      await draftTab.click();
      await page.waitForTimeout(1000);

      await expect(page.getByText("Saved")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Complete Workflow", () => {
    test("should configure all settings in a typical workflow", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByLabel("chat-icon-visibility-select-trigger");
      const revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
      const minCustomerValueInput = page.getByLabel("min-customer-value-input");
      const hostUrlInput = page.getByLabel("Host URL");
      const emailResponseTabs = page.getByLabel("email-response-tabs");
      const draftTab = emailResponseTabs.getByRole("tab", { name: "Draft" });
      const widgetPreviewIndicator = page.getByText("Try it out →");

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
        await page.waitForTimeout(500);
      }

      await expect(chatIconSelect).toBeVisible();
      await chatIconSelect.click();
      await revenueBasedOption.click();
      await page.waitForTimeout(500);
      await minCustomerValueInput.fill("250");

      await hostUrlInput.fill("https://mycompany.com");

      await draftTab.click();

      await page.waitForTimeout(1000);

      await expect(widgetPreviewIndicator).toBeVisible();

      await page.reload();
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "In-App Chat" })).toBeVisible();

      await expect(chatIconSwitch).toBeChecked();
      await expect(minCustomerValueInput).toHaveValue("250");
      await expect(hostUrlInput).toHaveValue("https://mycompany.com");
      await expect(draftTab).toHaveAttribute("data-state", "active");
    });
  });
});
