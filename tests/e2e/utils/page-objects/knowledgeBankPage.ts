import { expect, Page } from "@playwright/test";

const TIMEOUTS = {
  SEARCH_DEBOUNCE: 500,
  ELEMENT_VISIBLE: 10000,
  NETWORK_IDLE: "networkidle" as const,
} as const;

const SELECTORS = {
  KNOWLEDGE_ITEM: "knowledge-bank-item",
  KNOWLEDGE_TEXTAREA: "#knowledge-content-textarea",
  SEARCH_INPUT: "Search knowledge bank...",
} as const;

export class KnowledgeBankPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto("/settings/knowledge");
    await this.page.waitForLoadState("networkidle");
  }

  async waitForPageLoad() {
    await expect(this.page.getByRole("heading", { name: "Knowledge Bank" })).toBeVisible();
  }

  async searchKnowledge(query: string) {
    await this.page.getByPlaceholder(SELECTORS.SEARCH_INPUT).fill(query);
    await this.page.waitForTimeout(TIMEOUTS.SEARCH_DEBOUNCE);
  }

  async clearSearch() {
    await this.page.getByPlaceholder(SELECTORS.SEARCH_INPUT).clear();
    await this.page.waitForTimeout(TIMEOUTS.SEARCH_DEBOUNCE);
  }

  async clickAddKnowledge() {
    await this.page.getByRole("button", { name: "Add Knowledge" }).click();
    await expect(this.page.locator(SELECTORS.KNOWLEDGE_TEXTAREA)).toBeVisible();
  }

  async addKnowledge(content: string) {
    await this.clickAddKnowledge();
    await this.page.locator(SELECTORS.KNOWLEDGE_TEXTAREA).fill(content);
    await this.page.getByRole("button", { name: "Save" }).click();
    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
  }

  async editKnowledge(originalContent: string, newContent: string) {
    await this.startEditingKnowledge(originalContent);
    await this.fillKnowledgeContent(newContent);
    await this.page.getByRole("button", { name: "Save" }).click();
    await expect(this.page.locator(SELECTORS.KNOWLEDGE_TEXTAREA)).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
  }

  async startEditingKnowledge(content: string) {
    const editButton = this.getEditButtonForKnowledge(content);
    await expect(editButton).toBeVisible();
    await expect(editButton).toBeEnabled();
    await editButton.click();
    await expect(this.page.locator(SELECTORS.KNOWLEDGE_TEXTAREA)).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }

  async fillKnowledgeContent(content: string) {
    const textarea = this.page.locator(SELECTORS.KNOWLEDGE_TEXTAREA);
    await textarea.click();
    await textarea.fill(content);
  }

  async cancelEdit() {
    await this.getCancelButtonInForm().click();
  }

  async toggleKnowledgeEnabled(content: string) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    const toggleSwitch = knowledgeItem.getByRole("switch", { name: "Enable Knowledge" });
    await toggleSwitch.click();
    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
  }

  async deleteKnowledge(content: string) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    const deleteButton = knowledgeItem.getByRole("button", { name: "Delete" });
    await deleteButton.click();
    await this.page.getByRole("button", { name: "Yes, delete" }).click();
    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
  }

  async expectKnowledgeExists(content: string) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await expect(knowledgeItem).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectKnowledgeNotExists(content: string) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await expect(knowledgeItem).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectKnowledgeEnabled(content: string, enabled: boolean) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    const toggleSwitch = knowledgeItem.getByRole("switch", { name: "Enable Knowledge" });
    
    const expectation = expect(toggleSwitch);
    enabled ? await expectation.toBeChecked() : await expectation.not.toBeChecked();
  }

  async expandSuggestedKnowledge() {
    const trigger = this.page.locator("button").filter({ hasText: /suggested.*entries?/i });
    if (await trigger.isVisible()) {
      await trigger.click();
      await expect(this.page.locator('[role="region"]')).toBeVisible();
    }
  }

  async acceptSuggestedKnowledge(originalContent: string, newContent?: string) {
    await this.expandSuggestedKnowledge();
    const suggestedItem = this.page.locator("div").filter({ hasText: originalContent }).first();

    if (newContent) {
      const textarea = suggestedItem.locator("textarea");
      await textarea.clear();
      await textarea.fill(newContent);
    }

    await suggestedItem.getByRole("button", { name: "Accept" }).click();
    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
  }

  async rejectSuggestedKnowledge(content: string) {
    await this.expandSuggestedKnowledge();
    const suggestedItem = this.page.locator("div").filter({ hasText: content }).first();
    await suggestedItem.getByRole("button", { name: "Reject" }).click();
    await this.page.waitForLoadState(TIMEOUTS.NETWORK_IDLE);
  }

  async expectSuggestedKnowledgeCount(count: number) {
    const badge = this.page.locator("button").filter({ hasText: /suggested.*entries?/i });
    
    if (count > 0) {
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(count.toString());
    } else {
      await expect(badge).not.toBeVisible();
    }
  }

  async expectEmptyState() {
    const knowledgeItems = this.page.getByTestId(SELECTORS.KNOWLEDGE_ITEM);
    await expect(knowledgeItems).toHaveCount(0);
  }

  private getKnowledgeItemByContent(content: string) {
    return this.page.getByTestId(SELECTORS.KNOWLEDGE_ITEM).filter({ hasText: content }).first();
  }

  private getEditButtonForKnowledge(content: string) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    return knowledgeItem.locator("button").filter({ hasText: content.substring(0, 125) });
  }

  private getCancelButtonInForm() {
    return this.page.locator("form").getByRole("button", { name: "Cancel" });
  }
}
