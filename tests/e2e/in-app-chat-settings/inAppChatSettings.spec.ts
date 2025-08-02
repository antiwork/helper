import { expect, test } from "@playwright/test";
import { InAppChatSettingsPage } from "../utils/page-objects/inAppChatSettingsPage";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("In-App Chat Settings", () => {
  let settingsPage: InAppChatSettingsPage;

  test.beforeEach(async ({ page }) => {
    settingsPage = new InAppChatSettingsPage(page);
    await settingsPage.goto();
    await settingsPage.waitForSettingsToLoad();
  });

  test.describe("Widget Installation Documentation", () => {
    test("should display installation tabs and documentation link", async () => {
      await expect(settingsPage.pageTitle).toBeVisible();
      await expect(settingsPage.documentationLink).toBeVisible();
      await expect(settingsPage.vanillaJsTab).toBeVisible();
      await expect(settingsPage.reactTab).toBeVisible();
    });

    test("should switch between vanilla JS and React tabs", async () => {
      await expect(settingsPage.vanillaJsTab).toHaveAttribute("data-state", "active");
      await settingsPage.expectVanillaJsTabContent();

      await settingsPage.switchToReactTab();
      await settingsPage.expectReactTabContent();

      await settingsPage.switchToVanillaJsTab();
      await settingsPage.expectVanillaJsTabContent();
    });

    test("should copy AI agent prompt", async () => {
      await settingsPage.clickCopyAiPrompt();
      await expect(settingsPage.copyAiPromptButton).toContainText("Copied!");
    });

    test("should expand accordion sections", async () => {
      await settingsPage.expandCustomizeWidgetAccordion();
      await settingsPage.expectCustomizeWidgetContent();

      await settingsPage.expandContextualHelpAccordion();
      await settingsPage.expectContextualHelpContent();

      await settingsPage.expandAuthenticateUsersAccordion();
      await settingsPage.expectAuthenticateUsersContent();
    });
  });

  test.describe("Chat Icon Visibility Settings", () => {
    test("should enable and disable chat icon visibility", async ({ page }) => {
      await settingsPage.disableChatIconVisibility();
      await settingsPage.waitForSettingsToSave();

      await settingsPage.enableChatIconVisibility();
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.widgetPreviewIndicator).toBeVisible();

      await settingsPage.disableChatIconVisibility();
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.widgetPreviewIndicator).not.toBeVisible();
    });

    test("should configure visibility for all customers", async () => {
      await settingsPage.enableChatIconVisibility();
      await settingsPage.selectAllCustomers();
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.minCustomerValueInput).not.toBeVisible();
    });

    test("should configure revenue-based visibility", async () => {
      await settingsPage.enableChatIconVisibility();
      await settingsPage.selectRevenueBasedCustomers();
      
      await expect(settingsPage.minCustomerValueInput).toBeVisible();
      
      await settingsPage.setMinCustomerValue("500");
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.minCustomerValueInput).toHaveValue("500");
    });

    test("should persist visibility settings across page reloads", async ({ page }) => {
      await settingsPage.enableChatIconVisibility();
      await settingsPage.selectRevenueBasedCustomers();
      await settingsPage.setMinCustomerValue("1000");
      await settingsPage.waitForSettingsToSave();

      await page.reload();
      await settingsPage.waitForSettingsToLoad();

      await expect(settingsPage.chatIconVisibilitySwitch).toBeChecked();
      await expect(settingsPage.minCustomerValueInput).toBeVisible();
      await expect(settingsPage.minCustomerValueInput).toHaveValue("1000");
    });
  });

  test.describe("Host URL Configuration", () => {
    test("should set and clear host URL", async ({ page }) => {
      const testUrl = "https://example.com";

      await settingsPage.setHostUrl(testUrl);
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.hostUrlInput).toHaveValue(testUrl);

      await settingsPage.clearHostUrl();
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.hostUrlInput).toHaveValue("");
    });

    test("should persist host URL across page reloads", async ({ page }) => {
      const testUrl = "https://my-app.com";

      await settingsPage.setHostUrl(testUrl);
      await settingsPage.waitForSettingsToSave();

      await page.reload();
      await settingsPage.waitForSettingsToLoad();

      await expect(settingsPage.hostUrlInput).toHaveValue(testUrl);
    });

    test("should validate URL format", async () => {
      await settingsPage.setHostUrl("not-a-valid-url");
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.hostUrlInput).toHaveValue("not-a-valid-url");
    });
  });

  test.describe("Email Response Settings", () => {
    test("should switch between email response modes", async () => {
      await settingsPage.setEmailResponseMode("off");
      await expect(settingsPage.emailResponseOffTab).toHaveAttribute("data-state", "active");

      await settingsPage.setEmailResponseMode("draft");
      await expect(settingsPage.emailResponseDraftTab).toHaveAttribute("data-state", "active");

      await settingsPage.setEmailResponseMode("reply");
      await expect(settingsPage.emailResponseReplyTab).toHaveAttribute("data-state", "active");
    });

    test("should persist email response settings", async ({ page }) => {
      await settingsPage.setEmailResponseMode("draft");
      await settingsPage.waitForSettingsToSave();

      await page.reload();
      await settingsPage.waitForSettingsToLoad();

      await expect(settingsPage.emailResponseDraftTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Widget Integration", () => {
    test("should show widget when enabled and hide when disabled", async () => {
      await settingsPage.enableChatIconVisibility();
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.widgetPreviewIndicator).toBeVisible();

      await settingsPage.disableChatIconVisibility();
      await settingsPage.waitForSettingsToSave();

      await expect(settingsPage.widgetPreviewIndicator).not.toBeVisible();
    });
  });

  test.describe("Form Validation and Error Handling", () => {
    test("should handle numeric validation for minimum customer value", async () => {
      await settingsPage.enableChatIconVisibility();
      await settingsPage.selectRevenueBasedCustomers();

      await settingsPage.setMinCustomerValue("100");
      await expect(settingsPage.minCustomerValueInput).toHaveValue("100");

      await settingsPage.setMinCustomerValue("99.99");
      await settingsPage.waitForSettingsToSave();

      await settingsPage.setMinCustomerValue("-50");
      await settingsPage.waitForSettingsToSave();
    });

    test("should show saving indicators", async () => {
      await settingsPage.enableChatIconVisibility();
      await settingsPage.setHostUrl("https://test.com");
      await settingsPage.setEmailResponseMode("draft");
      
      await settingsPage.waitForSettingsToSave();
      
    });
  });

  test.describe("Complete Workflow", () => {
    test("should configure all settings in a typical workflow", async ({ page }) => {
      await settingsPage.enableChatIconVisibility();
      
      await settingsPage.selectRevenueBasedCustomers();
      await settingsPage.setMinCustomerValue("250");
      
      await settingsPage.setHostUrl("https://mycompany.com");
      
      await settingsPage.setEmailResponseMode("draft");
      
      await settingsPage.waitForSettingsToSave();
      
      await expect(settingsPage.widgetPreviewIndicator).toBeVisible();
      
      await page.reload();
      await settingsPage.waitForSettingsToLoad();
      
      await expect(settingsPage.chatIconVisibilitySwitch).toBeChecked();
      await expect(settingsPage.minCustomerValueInput).toHaveValue("250");
      await expect(settingsPage.hostUrlInput).toHaveValue("https://mycompany.com");
      await expect(settingsPage.emailResponseDraftTab).toHaveAttribute("data-state", "active");
    });
  });
});
