import { expect } from "@playwright/test";
import { debugWait } from "../test-helpers";
import { BasePage } from "./basePage";

export class ConversationsPage extends BasePage {
  private readonly searchInput = 'input[placeholder="Search conversations"]';
  private readonly openFilter = 'button:has-text("open")';
  private readonly gumroadButton = 'button:has-text("Gumroad")';
  private readonly supportEmailButton = 'button:has-text("support@gumroad.com")';
  private readonly selectAllButton = 'button:has-text("Select all")';
  private readonly deselectButton = 'button:has-text("Deselect")';

  private readonly conversationLinks = 'a[href*="/conversations?id="]';

  async navigateToConversations() {
    await this.goto("/mine");
    await this.waitForPageLoad();
  }

  async waitForConversationsLoad() {
    await this.page.waitForLoadState("networkidle");
    await expect(this.page.locator(this.searchInput)).toBeVisible();
  }

  async expectConversationsVisible() {
    await expect(this.page).toHaveTitle("Helper");
    await expect(this.page.locator(this.searchInput)).toBeVisible();
    await expect(this.page.locator(this.openFilter)).toBeVisible();
  }

  async searchConversations(query: string) {
    const searchBox = this.page.locator(this.searchInput);
    await expect(searchBox).toBeVisible();
    await searchBox.fill(query);
    await this.page.keyboard.press("Enter");
  }

  async clearSearch() {
    const searchBox = this.page.locator(this.searchInput);
    await searchBox.clear();
    await expect(searchBox).toHaveValue("");
  }

  async expectSearchValue(value: string) {
    await expect(this.page.locator(this.searchInput)).toHaveValue(value);
  }

  async clickOpenFilter() {
    await this.page.locator(this.openFilter).click();
    await debugWait(this.page, 1000);
  }

  async expectAccountInfo() {
    await expect(this.page.locator(this.gumroadButton).first()).toBeVisible();
    await expect(this.page.locator(this.supportEmailButton).first()).toBeVisible();
  }

  async clickGumroadButton() {
    await this.page.locator(this.gumroadButton).first().click();
    await debugWait(this.page, 2000);
  }

  async handleSelectAll() {
    const conversationLinks = this.page.locator(this.conversationLinks);
    const conversationCount = await conversationLinks.count();

    if (conversationCount === 0) {
      return false;
    }

    const selectAllCount = await this.page.locator(this.selectAllButton).count();

    if (selectAllCount > 0) {
      await this.page.locator(this.selectAllButton).click();
      await debugWait(this.page, 1000);
      return true;
    }
    return false;
  }

  async expectSelectAllButtonExists(): Promise<boolean> {
    const conversationLinks = this.page.locator(this.conversationLinks);
    const conversationCount = await conversationLinks.count();

    if (conversationCount === 0) {
      return false;
    }

    const count = await this.page.locator(this.selectAllButton).count();
    return count > 0;
  }

  async expectDeselectButtonExists(): Promise<boolean> {
    const count = await this.page.locator(this.deselectButton).count();
    return count > 0;
  }

  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 });
  }

  async setDesktopViewport() {
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }

  async refreshAndWaitForAuth() {
    await this.page.reload();
    await this.page.waitForLoadState("networkidle");
    await expect(this.page).toHaveURL(/.*mine.*/);
    await this.waitForConversationsLoad();
  }

  async focusSearchInput() {
    const searchBox = this.page.locator(this.searchInput);
    await searchBox.focus();

    const focusedPlaceholder = await this.page.evaluate(() => document.activeElement?.getAttribute("placeholder"));

    return focusedPlaceholder === "Search conversations";
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  expectUrlContains(fragment: string) {
    expect(this.page.url()).toContain(fragment);
  }

  getConversationCount(): number {
    return 0;
  }

  selectConversation(index = 0) {
  }
}
