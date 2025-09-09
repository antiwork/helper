import { expect, test } from "@playwright/test";
import { waitForSettingsSaved } from "../utils/settingsHelpers";
import { throttleNetworkRequest } from "../utils/test-helpers";

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
      const copyButton = page.getByRole("button", { name: "Copy AI agent prompt" }).first();
      await expect(copyButton).toBeVisible();
      await copyButton.click();
      await expect(page.getByText("Copied!").first()).toBeVisible();
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

  test.describe("Edge Cases and Validation", () => {
    test("should configure chat icon visibility settings", async ({ page }) => {
      await throttleNetworkRequest(page, "/api/trpc/lambda/mailbox.update");
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByText("Show chat icon for").locator("..").locator('[role="combobox"]');
      const allCustomersOption = page.getByRole("option", { name: "All customers" });
      const revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
      const minCustomerValueInput = page.locator("#min-value");
      const widgetPreviewIndicator = page.getByText("Try it out →");

      const isChecked = await chatIconSwitch.isChecked();
      if (isChecked) {
        await chatIconSwitch.click();
      }

      await chatIconSwitch.click();
      await expect(chatIconSwitch).toBeChecked();
      await expect(widgetPreviewIndicator).toBeVisible();

      await chatIconSwitch.click();
      await expect(chatIconSwitch).not.toBeChecked();
      await expect(widgetPreviewIndicator).not.toBeVisible();

      await chatIconSwitch.click();
      await expect(chatIconSwitch).toBeChecked();

      await expect(chatIconSelect).toBeVisible();
      await chatIconSelect.click();
      await allCustomersOption.click();
      await expect(minCustomerValueInput).not.toBeVisible();

      await chatIconSelect.click();
      await revenueBasedOption.click();
      await expect(minCustomerValueInput).toBeVisible();

      await minCustomerValueInput.fill("500");
      await expect(minCustomerValueInput).toHaveValue("500");

      await waitForSettingsSaved(page);
    });
    test("should validate URL format", async ({ page }) => {
      const hostUrlInput = page.getByLabel("Host URL");

      await hostUrlInput.fill("not-a-valid-url");
      await expect(hostUrlInput).toHaveValue("not-a-valid-url");

      await hostUrlInput.clear();
      await hostUrlInput.fill("https://valid-url.com");
      await expect(hostUrlInput).toHaveValue("https://valid-url.com");
    });

    test("should handle numeric validation for customer values", async ({ page }) => {
      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByText("Show chat icon for").locator("..").locator('[role="combobox"]');
      const revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
      const minCustomerValueInput = page.locator("#min-value");

      const isChecked = await chatIconSwitch.isChecked();
      if (!isChecked) {
        await chatIconSwitch.click();
      }

      await chatIconSelect.click();
      await revenueBasedOption.click();

      // Test decimal values
      await minCustomerValueInput.fill("99.99");
      await expect(minCustomerValueInput).toHaveValue("99.99");

      // Test negative values
      await minCustomerValueInput.fill("-50");
      await expect(minCustomerValueInput).toHaveValue("-50");

      // Test positive integer
      await minCustomerValueInput.fill("100");
      await expect(minCustomerValueInput).toHaveValue("100");
    });
  });

  test.describe("Complete Workflow", () => {
    test("should configure all settings and persist across reloads", async ({ page }) => {
      await throttleNetworkRequest(page, "/api/trpc/lambda/mailbox.update");

      const chatIconSwitch = page.locator('[role="switch"]').first();
      const chatIconSelect = page.getByText("Show chat icon for").locator("..").locator('[role="combobox"]');
      const revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
      const minCustomerValueInput = page.locator("#min-value");
      const hostUrlInput = page.getByLabel("Host URL");
      const emailResponseTabs = page
        .locator('[role="tablist"]')
        .filter({ has: page.getByRole("tab", { name: "Off" }) });
      const offTab = emailResponseTabs.getByRole("tab", { name: "Off" });
      const draftTab = emailResponseTabs.getByRole("tab", { name: "Draft" });
      const replyTab = emailResponseTabs.getByRole("tab", { name: "Reply" });

      // Step 1: Configure chat icon visibility
      const isChecked = await chatIconSwitch.isChecked();
      if (isChecked) {
        // Quick Reset
        await chatIconSwitch.click();
        await chatIconSwitch.click();
      }

      await chatIconSelect.click();
      await revenueBasedOption.click();
      await expect(minCustomerValueInput).toBeVisible();
      await minCustomerValueInput.fill("250");

      await waitForSettingsSaved(page);
      await expect(page.getByText("Saved")).not.toBeVisible();

      // Step 2: Configure host URL
      const hostURL = `https://mycompany.com-${Date.now()}`;
      await hostUrlInput.fill(hostURL);

      await waitForSettingsSaved(page);
      await expect(page.getByText("Saved")).not.toBeVisible();

      // Step 3: Configure email response settings
      await offTab.click();
      await expect(offTab).toHaveAttribute("data-state", "active");

      await draftTab.click();
      await expect(draftTab).toHaveAttribute("data-state", "active");

      await replyTab.click();
      await expect(replyTab).toHaveAttribute("data-state", "active");

      await draftTab.click();
      await expect(draftTab).toHaveAttribute("data-state", "active");

      await waitForSettingsSaved(page);

      // Step 4: Verify persistence across page reload
      await page.reload();
      await expect(page.getByRole("heading", { name: "In-App Chat" })).toBeVisible();

      await expect(chatIconSwitch).toBeChecked();
      await expect(minCustomerValueInput).toBeVisible();
      await expect(minCustomerValueInput).toHaveValue("250");
      await expect(hostUrlInput).toHaveValue(hostURL);
      await expect(draftTab).toHaveAttribute("data-state", "active");
    });
  });
});
