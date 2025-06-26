import { expect, Page } from "@playwright/test";
import { debugWait } from "../test-helpers";
import { BasePage } from "./basePage";

/**
 * ConversationsPage - Page object for Helper conversations interactions
 */
export class ConversationsPage extends BasePage {
  // Real selectors that actually exist in the application
  private readonly searchInput = 'input[placeholder="Search conversations"]';
  private readonly openFilter = 'button:has-text("open")';
  private readonly gumroadButton = 'button:has-text("Gumroad")';
  private readonly supportEmailButton = 'button:has-text("support@gumroad.com")';
  private readonly selectAllButton = 'button:has-text("Select all")';
  private readonly deselectButton = 'button:has-text("Deselect")';

  // Conversation list selectors (these need to be verified)
  private readonly conversationsList = "[data-conversation-list]"; // Fallback generic selector
  private readonly conversationItem = "[data-conversation-item]"; // Fallback generic selector

  async navigateToConversations() {
    await this.goto("/mailboxes/gumroad/mine");
    await this.waitForPageLoad();
  }

  async waitForConversationsLoad() {
    // Wait for network to settle with a reasonable timeout
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      // If networkidle fails, just wait for DOM content
      console.log("Network idle timeout in waitForConversationsLoad, continuing...");
    }

    // Ensure search input is visible (main indicator page is ready)
    await expect(this.page.locator(this.searchInput)).toBeVisible({ timeout: 15000 });
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
    // Enter key is optional - many search boxes auto-search
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
    await debugWait(this.page, 1000); // Allow for filter response
  }

  async expectAccountInfo() {
    // Use .first() to handle multiple matches as discovered in working tests
    await expect(this.page.locator(this.gumroadButton).first()).toBeVisible();
    await expect(this.page.locator(this.supportEmailButton).first()).toBeVisible();
  }

  async clickGumroadButton() {
    await this.page.locator(this.gumroadButton).first().click();
    await debugWait(this.page, 2000);
  }

  async handleSelectAll() {
    const selectAllCount = await this.page.locator(this.selectAllButton).count();

    if (selectAllCount > 0) {
      await this.page.locator(this.selectAllButton).click();
      await debugWait(this.page, 1000);
      return true;
    }
    return false;
  }

  async expectSelectAllButtonExists(): Promise<boolean> {
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
    // Use domcontentloaded instead of load to avoid waiting for all resources
    await this.page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for network activity to settle, but with a reasonable timeout
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 15000 });
    } catch (error) {
      // If networkidle times out, try domcontentloaded fallback
      console.log("Network idle timeout, falling back to domcontentloaded");
      await this.page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }

    // Verify URL and basic page elements are present
    await expect(this.page).toHaveURL(/.*mailboxes.*gumroad.*mine.*/);

    // Wait for conversations to load with more lenient timeout
    try {
      await this.waitForConversationsLoad();
    } catch (error) {
      // If full conversations load fails, at least verify basic authentication
      console.log("Full conversations load timeout, checking basic authentication");
      await expect(this.page.locator(this.searchInput)).toBeVisible({ timeout: 10000 });
    }
  }

  async focusSearchInput() {
    const searchBox = this.page.locator(this.searchInput);
    await searchBox.focus();

    // Verify focus landed correctly
    const focusedPlaceholder = await this.page.evaluate(() => document.activeElement?.getAttribute("placeholder"));

    return focusedPlaceholder === "Search conversations";
  }

  getCurrentUrl(): string {
    return this.page.url();
  }

  expectUrlContains(fragment: string) {
    expect(this.page.url()).toContain(fragment);
  }

  // Generic conversation list methods (these would need real selectors when we find them)
  getConversationCount(): number {
    // This would need real conversation item selectors
    return 0;
  }

  selectConversation(index = 0) {
    // This would need real conversation item selectors
  }
}
