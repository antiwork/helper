import { expect, Locator, Page } from "@playwright/test";

type KnowledgeContent = string;
type KnowledgeAction = (knowledgeItem: Locator) => Promise<void>;

export class KnowledgeBankPage {
  readonly page: Page;

  private readonly TIMEOUTS = {
    SEARCH_DEBOUNCE: 500,
    ELEMENT_VISIBLE: 10000,
    NETWORK_IDLE: "networkidle" as const,
  } as const;

  private readonly SELECTORS = {
    KNOWLEDGE_ITEM: '[data-testid="knowledge-bank-item"]',
    KNOWLEDGE_TEXTAREA: "#knowledge-content-textarea",
  } as const;

  private readonly UI_ELEMENTS = {
    BUTTONS: {
      ADD_KNOWLEDGE: "Add Knowledge",
      SAVE: "Save",
      CANCEL: "Cancel",
      DELETE: "Delete",
      EDIT_KNOWLEDGE: "Edit knowledge",
      YES_DELETE: "Yes, delete",
      ACCEPT: "Accept",
      REJECT: "Reject",
    },
    HEADINGS: {
      KNOWLEDGE_BANK: "Knowledge Bank",
    },
    LABELS: {
      ENABLE_KNOWLEDGE: "Enable Knowledge",
    },
    REGIONS: {
      SUGGESTED_SECTION: '[role="region"]',
    },
    PLACEHOLDERS: {
      SEARCH_INPUT: "Search knowledge bank...",
    },
  } as const;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto("/settings/knowledge");
    await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);
  }

  async waitForPageLoad() {
    await expect(this.page.getByRole("heading", { name: this.UI_ELEMENTS.HEADINGS.KNOWLEDGE_BANK })).toBeVisible();
  }

  async searchKnowledge(query: KnowledgeContent) {
    await this.page.getByPlaceholder(this.UI_ELEMENTS.PLACEHOLDERS.SEARCH_INPUT).fill(query);
    await this.page.waitForTimeout(this.TIMEOUTS.SEARCH_DEBOUNCE);
  }

  async clearSearch() {
    await this.page.getByPlaceholder(this.UI_ELEMENTS.PLACEHOLDERS.SEARCH_INPUT).clear();
    await this.page.waitForTimeout(this.TIMEOUTS.SEARCH_DEBOUNCE);
  }

  async clickAddKnowledge() {
    await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.ADD_KNOWLEDGE }).click();
    await expect(this.page.locator(this.SELECTORS.KNOWLEDGE_TEXTAREA)).toBeVisible();
  }

  async addKnowledge(content: KnowledgeContent) {
    await this.clickAddKnowledge();
    await this.fillKnowledgeContent(content);
    await this.saveKnowledge();
  }

  async editKnowledge(originalContent: KnowledgeContent, newContent: KnowledgeContent) {
    await this.startEditingKnowledge(originalContent);
    await this.fillKnowledgeContent(newContent);
    await this.saveKnowledge();
    await expect(this.page.locator(this.SELECTORS.KNOWLEDGE_TEXTAREA)).not.toBeVisible({
      timeout: this.TIMEOUTS.ELEMENT_VISIBLE,
    });
  }

  async startEditingKnowledge(content: KnowledgeContent) {
    const editButton = this.getEditButtonForKnowledge(content);
    await expect(editButton).toBeVisible();
    await expect(editButton).toBeEnabled();
    await editButton.click();
    await expect(this.page.locator(this.SELECTORS.KNOWLEDGE_TEXTAREA)).toBeVisible({
      timeout: this.TIMEOUTS.ELEMENT_VISIBLE,
    });
  }

  async fillKnowledgeContent(content: KnowledgeContent) {
    const textarea = this.page.locator(this.SELECTORS.KNOWLEDGE_TEXTAREA);
    await textarea.click();
    await textarea.fill(content);
  }

  async cancelEdit() {
    await this.getCancelButtonInForm().click();
  }

  async toggleKnowledgeEnabled(content: KnowledgeContent) {
    await this.performKnowledgeAction(content, async (knowledgeItem) => {
      const toggleSwitch = knowledgeItem.getByRole("switch", { name: this.UI_ELEMENTS.LABELS.ENABLE_KNOWLEDGE });
      await toggleSwitch.click();
    });
  }

  async deleteKnowledge(content: KnowledgeContent) {
    await this.performKnowledgeAction(content, async (knowledgeItem) => {
      const deleteButton = knowledgeItem.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.DELETE });
      await deleteButton.click();
      await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.YES_DELETE }).click();
    });
  }

  async expectKnowledgeExists(content: KnowledgeContent) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await expect(knowledgeItem).toBeVisible({ timeout: this.TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectKnowledgeNotExists(content: KnowledgeContent) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await expect(knowledgeItem).not.toBeVisible({ timeout: this.TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectKnowledgeEnabled(content: KnowledgeContent, enabled: boolean) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    const toggleSwitch = knowledgeItem.getByRole("switch", { name: this.UI_ELEMENTS.LABELS.ENABLE_KNOWLEDGE });

    const expectation = expect(toggleSwitch);
    enabled ? await expectation.toBeChecked() : await expectation.not.toBeChecked();
  }

  async expandSuggestedKnowledge() {
    try {
      const trigger = this.page.locator("button").filter({ hasText: /suggested.*entries?/i });
      if (await trigger.isVisible()) {
        await trigger.click();
        await expect(this.page.locator(this.UI_ELEMENTS.REGIONS.SUGGESTED_SECTION)).toBeVisible();
      }
    } catch (error) {
      console.warn("Could not expand suggested knowledge section:", error);
    }
  }

  async acceptSuggestedKnowledge(originalContent: KnowledgeContent, newContent?: KnowledgeContent) {
    await this.expandSuggestedKnowledge();
    const suggestedItem = this.page.locator("div").filter({ hasText: originalContent }).first();

    if (newContent) {
      const textarea = suggestedItem.locator("textarea");
      await textarea.clear();
      await textarea.fill(newContent);
    }

    await suggestedItem.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.ACCEPT }).click();
    await this.waitForNetworkIdle();
  }

  async rejectSuggestedKnowledge(content: KnowledgeContent) {
    await this.expandSuggestedKnowledge();
    const suggestedItem = this.page.locator("div").filter({ hasText: content }).first();
    await suggestedItem.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.REJECT }).click();
    await this.waitForNetworkIdle();
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
    const knowledgeItems = this.page.locator(this.SELECTORS.KNOWLEDGE_ITEM);
    await expect(knowledgeItems).toHaveCount(0);
  }

  private getKnowledgeItemByContent(content: KnowledgeContent) {
    return this.page.locator(this.SELECTORS.KNOWLEDGE_ITEM).filter({ hasText: content }).first();
  }

  private getEditButtonForKnowledge(content: KnowledgeContent) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    return knowledgeItem.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.EDIT_KNOWLEDGE });
  }

  private getCancelButtonInForm() {
    return this.page.locator("form").getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.CANCEL });
  }

  private async saveKnowledge() {
    await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.SAVE }).click();
    await this.waitForNetworkIdle();
  }

  private async waitForNetworkIdle() {
    await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);
  }

  private async performKnowledgeAction(content: KnowledgeContent, action: KnowledgeAction) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await action(knowledgeItem);
    await this.waitForNetworkIdle();
  }
}
