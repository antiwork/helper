import { expect, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class SettingsPreferencesPage extends BasePage {
  private readonly preferencesSection = 'main, [role="main"]';
  private readonly mailboxNameSetting = 'section:has(h2:text("Mailbox name"))';
  private readonly mailboxNameInput = 'input[placeholder="Enter mailbox name"]';
  private readonly confettiSetting = 'section:has(h2:text("Confetti"))';
  private readonly testConfettiButton = 'button:has-text("Test Confetti")';

  constructor(page: Page) {
    super(page);
  }

  async navigateToPreferences() {
    await this.goto("/settings/preferences");
    await this.waitForPageLoad();
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

  async waitForSavingComplete() {
    await this.page.waitForFunction(() => {
      const savingIndicator = document.querySelector('[data-testid="saving-indicator"]');
      return !savingIndicator || !savingIndicator.textContent?.includes('Saving');
    }, { timeout: 10000 });
  }

  async clickTestConfettiButton() {
    await this.page.locator(this.testConfettiButton).click();
  }

  async expectTestConfettiButtonVisible() {
    await expect(this.page.locator(this.testConfettiButton)).toBeVisible();
  }
}
