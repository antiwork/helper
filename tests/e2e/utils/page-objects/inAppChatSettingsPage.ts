import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class InAppChatSettingsPage extends BasePage {
  private readonly switchSelector = '[role="switch"]';
  private readonly widgetIconSelector = '.helper-widget-icon';
  
  readonly pageTitle: Locator;
  readonly documentationLink: Locator;
  
  readonly installationTabs: Locator;
  readonly vanillaJsTab: Locator;
  readonly reactTab: Locator;
  
  readonly copyAiPromptButton: Locator;
  readonly customizeWidgetAccordion: Locator;
  readonly contextualHelpAccordion: Locator;
  readonly authenticateUsersAccordion: Locator;
  
  readonly chatIconVisibilitySwitch: Locator;
  readonly chatIconVisibilitySelect: Locator;
  readonly allCustomersOption: Locator;
  readonly revenueBasedOption: Locator;
  readonly minCustomerValueInput: Locator;
  
  readonly hostUrlInput: Locator;
  
  readonly emailResponseTabs: Locator;
  readonly emailResponseOffTab: Locator;
  readonly emailResponseDraftTab: Locator;
  readonly emailResponseReplyTab: Locator;
  
  readonly widgetPreviewIndicator: Locator;
  readonly helperWidgetIcon: Locator;

  constructor(page: Page) {
    super(page);
    
    this.pageTitle = page.getByRole("heading", { name: "In-App Chat" });
    this.documentationLink = page.getByRole("link", { name: "Documentation" });
    
    this.installationTabs = page.locator('[data-testid="widget-installation-tabs"]').first();
    this.vanillaJsTab = page.getByRole("tab", { name: "HTML/JavaScript" });
    this.reactTab = page.getByRole("tab", { name: "React/Next.js" });
    
    this.copyAiPromptButton = page.getByTestId("copy-ai-prompt-vanilla");
    this.customizeWidgetAccordion = page.getByRole("button", { name: "Customize the widget" });
    this.contextualHelpAccordion = page.getByRole("button", { name: "Add contextual help buttons" });
    this.authenticateUsersAccordion = page.getByRole("button", { name: "Authenticate your users" });
    
    this.chatIconVisibilitySwitch = page.locator(this.switchSelector).first();
    this.chatIconVisibilitySelect = page.getByTestId("chat-icon-visibility-select-trigger");
    this.allCustomersOption = page.getByRole("option", { name: "All customers" });
    this.revenueBasedOption = page.getByRole("option", { name: "Customers with value greater than" });
    this.minCustomerValueInput = page.getByTestId("min-customer-value-input");
    
    this.hostUrlInput = page.getByLabel("Host URL");
    
    this.emailResponseTabs = page.getByTestId("email-response-tabs");
    this.emailResponseOffTab = this.emailResponseTabs.getByRole("tab", { name: "Off" });
    this.emailResponseDraftTab = this.emailResponseTabs.getByRole("tab", { name: "Draft" });
    this.emailResponseReplyTab = this.emailResponseTabs.getByRole("tab", { name: "Reply" });
    
    this.widgetPreviewIndicator = page.getByText("Try it out →");
    this.helperWidgetIcon = page.locator(this.widgetIconSelector).last();
  }

  get currentPage() {
    return this.page;
  }

  async goto() {
    await this.page.goto("/settings/in-app-chat");
    await this.waitForPageLoad();
  }

  async waitForSettingsToLoad() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.documentationLink).toBeVisible();
  }

  async switchToReactTab() {
    await this.reactTab.click();
    await expect(this.reactTab).toHaveAttribute("data-state", "active");
  }

  async switchToVanillaJsTab() {
    await this.vanillaJsTab.click();
    await expect(this.vanillaJsTab).toHaveAttribute("data-state", "active");
  }

  async clickCopyAiPrompt() {
    await this.copyAiPromptButton.click();
    await expect(this.copyAiPromptButton).toContainText("Copied!", { timeout: 3000 });
  }

  async expandCustomizeWidgetAccordion() {
    await this.customizeWidgetAccordion.click();
    await expect(this.customizeWidgetAccordion).toHaveAttribute("data-state", "open");
  }

  async expandContextualHelpAccordion() {
    await this.contextualHelpAccordion.click();
    await expect(this.contextualHelpAccordion).toHaveAttribute("data-state", "open");
  }

  async expandAuthenticateUsersAccordion() {
    await this.authenticateUsersAccordion.click();
    await expect(this.authenticateUsersAccordion).toHaveAttribute("data-state", "open");
  }

  async enableChatIconVisibility() {
    const isChecked = await this.chatIconVisibilitySwitch.isChecked();
    if (!isChecked) {
      await this.chatIconVisibilitySwitch.click();
      await this.page.waitForTimeout(500);
    }
    await expect(this.chatIconVisibilitySwitch).toBeChecked();
    const previewExists = await this.widgetPreviewIndicator.count();
    if (previewExists > 0) {
      await expect(this.widgetPreviewIndicator).toBeVisible();
    }
  }

  async disableChatIconVisibility() {
    const isChecked = await this.chatIconVisibilitySwitch.isChecked();
    if (isChecked) {
      await this.chatIconVisibilitySwitch.click();
      await this.page.waitForTimeout(500);
    }
    await expect(this.chatIconVisibilitySwitch).not.toBeChecked();
    const previewExists = await this.widgetPreviewIndicator.count();
    if (previewExists > 0) {
      await expect(this.widgetPreviewIndicator).not.toBeVisible();
    }
  }

  async selectAllCustomers() {
    await this.enableChatIconVisibility();
    await expect(this.chatIconVisibilitySelect).toBeVisible();
    await this.chatIconVisibilitySelect.click();
    await this.allCustomersOption.click();
    await this.page.waitForTimeout(500);
    await expect(this.minCustomerValueInput).not.toBeVisible();
  }

  async selectRevenueBasedCustomers() {
    await this.enableChatIconVisibility();
    await expect(this.chatIconVisibilitySelect).toBeVisible();
    await this.chatIconVisibilitySelect.click();
    await this.revenueBasedOption.click();
    await this.page.waitForTimeout(500);
    await expect(this.minCustomerValueInput).toBeVisible();
  }

  async setMinCustomerValue(value: string) {
    await expect(this.minCustomerValueInput).toBeVisible();
    await this.minCustomerValueInput.fill(value);
  }

  async setHostUrl(url: string) {
    await this.hostUrlInput.fill(url);
  }

  async clearHostUrl() {
    await this.hostUrlInput.clear();
  }

  async setEmailResponseMode(mode: "off" | "draft" | "reply") {
    switch (mode) {
      case "off":
        await this.emailResponseOffTab.click();
        await expect(this.emailResponseOffTab).toHaveAttribute("data-state", "active");
        break;
      case "draft":
        await this.emailResponseDraftTab.click();
        await expect(this.emailResponseDraftTab).toHaveAttribute("data-state", "active");
        break;
      case "reply":
        await this.emailResponseReplyTab.click();
        await expect(this.emailResponseReplyTab).toHaveAttribute("data-state", "active");
        break;
    }
  }

  async expectWidgetToBeVisible() {
    await expect(this.helperWidgetIcon).toBeVisible();
  }

  async expectWidgetToBeHidden() {
    const widgetCount = await this.page.locator(this.widgetIconSelector).count();
    if (widgetCount > 0) {
      await expect(this.page.locator(this.widgetIconSelector).last()).not.toBeVisible();
    }
  }

  async expectSavingIndicator() {
    await expect(this.page.getByText("Saving...")).toBeVisible({ timeout: 1000 });
    await expect(this.page.getByText("Saved")).toBeVisible({ timeout: 5000 });
  }

  async waitForSettingsToSave() {
    await this.page.waitForTimeout(1000);
  }

  async expectReactTabContent() {
    await expect(this.page.getByText("Install the React package:")).toBeVisible();
    await expect(this.page.getByText("npm install @helperai/react")).toBeVisible();
  }

  async expectVanillaJsTabContent() {
    await expect(this.page.getByText("Copy and paste this code into your website:")).toBeVisible();
  }

  async expectCustomizeWidgetContent() {
    await expect(this.page.getByText("Customize the widget by adding")).toBeVisible();
  }

  async expectContextualHelpContent() {
    await expect(this.page.getByText("Use the data-helper-prompt attribute").first()).toBeVisible();
  }

  async expectAuthenticateUsersContent() {
    await expect(this.page.getByText("First, you'll need to generate an HMAC hash")).toBeVisible();
  }
}
