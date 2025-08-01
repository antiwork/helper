import { expect, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class SettingsPreferencesPage extends BasePage {
  private readonly preferencesSection = '[data-testid="preferences-section"]';
  private readonly mailboxNameSetting = '[data-testid="mailbox-name-setting"]';
  private readonly mailboxNameInput = '[data-testid="mailbox-name-input"]';
  private readonly confettiSetting = '[data-testid="confetti-setting"]';
  private readonly testConfettiButton = '[data-testid="test-confetti-button"]';

  constructor(page: Page) {
    super(page);
  }

  async navigateToPreferences() {
    await this.goto("/settings/preferences");
    await this.waitForPageLoad();
  }

  async waitForPreferencesLoad() {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForSelector(this.preferencesSection, { timeout: 10000 });
  }

  async expectPreferencesPageVisible() {
    await expect(this.page).toHaveURL(/\/settings\/preferences/);
    await expect(this.page.locator("body")).toBeVisible();
  }

  async expectPreferencesSection() {
    await expect(this.page.locator(this.preferencesSection)).toBeVisible();
  }

  async expectMailboxNameSetting() {
    await expect(this.page.locator(this.mailboxNameSetting)).toBeVisible();
  }

  async expectConfettiSetting() {
    await expect(this.page.locator(this.confettiSetting)).toBeVisible();
  }

  async fillMailboxName(name: string) {
    await this.page.locator(this.mailboxNameInput).fill(name);
  }

  async getMailboxNameValue() {
    return await this.page.locator(this.mailboxNameInput).inputValue();
  }

  async clickTestConfettiButton() {
    await this.page.locator(this.testConfettiButton).click();
  }

  async expectTestConfettiButtonVisible() {
    await expect(this.page.locator(this.testConfettiButton)).toBeVisible();
  }
}
