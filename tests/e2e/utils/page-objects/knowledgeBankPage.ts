import { expect, Locator, Page } from "@playwright/test";

type KnowledgeContent = string;
type KnowledgeAction = (knowledgeItem: Locator) => Promise<void>;

export class KnowledgeBankPage {
  readonly page: Page;

  private readonly searchDebounceTimeout = 500;
  private readonly elementVisibleTimeout = 10000;
  private readonly networkIdleTimeout = "networkidle" as const;

  private readonly knowledgeItemSelector = '[data-testid="knowledge-bank-item"]';
  private readonly knowledgeTextareaSelector = "#knowledge-content-textarea";

  private readonly addKnowledgeButton = "Add Knowledge";
  private readonly saveButton = "Save";
  private readonly cancelButton = "Cancel";
  private readonly deleteButton = "Delete";
  private readonly editKnowledgeButton = "Edit knowledge";
  private readonly yesDeleteButton = "Yes, delete";
  private readonly acceptButton = "Accept";
  private readonly rejectButton = "Reject";

  private readonly knowledgeBankHeading = "Knowledge Bank";
  private readonly enableKnowledgeLabel = "Enable Knowledge";
  private readonly suggestedSectionRegion = '[role="region"]';
  private readonly searchInputPlaceholder = "Search knowledge bank...";

  constructor(page: Page) {
    this.page = page;
  }

  async navigate() {
    await this.page.goto("/settings/knowledge");
    await this.page.waitForLoadState(this.networkIdleTimeout);
  }

  async waitForPageLoad() {
    await expect(this.page.getByRole("heading", { name: this.knowledgeBankHeading })).toBeVisible();
  }

  async searchKnowledge(query: KnowledgeContent) {
    await this.page.getByPlaceholder(this.searchInputPlaceholder).fill(query);
    await this.page.waitForTimeout(this.searchDebounceTimeout);
  }

  async clearSearch() {
    await this.page.getByPlaceholder(this.searchInputPlaceholder).clear();
    await this.page.waitForTimeout(this.searchDebounceTimeout);
  }

  async clickAddKnowledge() {
    await this.page.getByRole("button", { name: this.addKnowledgeButton }).click();
    await expect(this.page.locator(this.knowledgeTextareaSelector)).toBeVisible();
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
    await expect(this.page.locator(this.knowledgeTextareaSelector)).not.toBeVisible({
      timeout: this.elementVisibleTimeout,
    });
  }

  async startEditingKnowledge(content: KnowledgeContent) {
    const editButton = this.getEditButtonForKnowledge(content);
    await expect(editButton).toBeVisible();
    await expect(editButton).toBeEnabled();
    await editButton.click();
    await expect(this.page.locator(this.knowledgeTextareaSelector)).toBeVisible({
      timeout: this.elementVisibleTimeout,
    });
  }

  async fillKnowledgeContent(content: KnowledgeContent) {
    const textarea = this.page.locator(this.knowledgeTextareaSelector);
    await textarea.click();
    await textarea.fill(content);
  }

  async cancelEdit() {
    await this.getCancelButtonInForm().click();
  }

  async toggleKnowledgeEnabled(content: KnowledgeContent) {
    await this.performKnowledgeAction(content, async (knowledgeItem) => {
      const toggleSwitch = knowledgeItem.getByRole("switch", { name: this.enableKnowledgeLabel });
      await toggleSwitch.click();
    });
  }

  async deleteKnowledge(content: KnowledgeContent) {
    await this.performKnowledgeAction(content, async (knowledgeItem) => {
      const deleteButton = knowledgeItem.getByRole("button", { name: this.deleteButton });
      await deleteButton.click();
      await this.page.getByRole("button", { name: this.yesDeleteButton }).click();
    });
  }

  async expectKnowledgeExists(content: KnowledgeContent) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await expect(knowledgeItem).toBeVisible({ timeout: this.elementVisibleTimeout });
  }

  async expectKnowledgeNotExists(content: KnowledgeContent) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await expect(knowledgeItem).not.toBeVisible({ timeout: this.elementVisibleTimeout });
  }

  async expectKnowledgeEnabled(content: KnowledgeContent, enabled: boolean) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    const toggleSwitch = knowledgeItem.getByRole("switch", { name: this.enableKnowledgeLabel });

    const expectation = expect(toggleSwitch);
    enabled ? await expectation.toBeChecked() : await expectation.not.toBeChecked();
  }

  async expandSuggestedKnowledge() {
    try {
      const trigger = this.page.locator("button").filter({ hasText: /suggested.*entries?/i });
      if (await trigger.isVisible()) {
        await trigger.click();
        await expect(this.page.locator(this.suggestedSectionRegion)).toBeVisible();
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

    await suggestedItem.getByRole("button", { name: this.acceptButton }).click();
    await this.waitForNetworkIdle();
  }

  async rejectSuggestedKnowledge(content: KnowledgeContent) {
    await this.expandSuggestedKnowledge();
    const suggestedItem = this.page.locator("div").filter({ hasText: content }).first();
    await suggestedItem.getByRole("button", { name: this.rejectButton }).click();
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
    const knowledgeItems = this.page.locator(this.knowledgeItemSelector);
    await expect(knowledgeItems).toHaveCount(0);
  }

  private getKnowledgeItemByContent(content: KnowledgeContent) {
    return this.page.locator(this.knowledgeItemSelector).filter({ hasText: content }).first();
  }

  private getEditButtonForKnowledge(content: KnowledgeContent) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    return knowledgeItem.getByRole("button", { name: this.editKnowledgeButton });
  }

  private getCancelButtonInForm() {
    return this.page.locator("form").getByRole("button", { name: this.cancelButton });
  }

  private async saveKnowledge() {
    await this.page.getByRole("button", { name: this.saveButton }).click();
    await this.waitForNetworkIdle();
  }

  private async waitForNetworkIdle() {
    await this.page.waitForLoadState(this.networkIdleTimeout);
  }

  private async performKnowledgeAction(content: KnowledgeContent, action: KnowledgeAction) {
    const knowledgeItem = this.getKnowledgeItemByContent(content);
    await action(knowledgeItem);
    await this.waitForNetworkIdle();
  }
}
