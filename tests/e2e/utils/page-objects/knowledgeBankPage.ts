import { expect, Page } from "@playwright/test";

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
    await expect(this.page.getByTestId("knowledge-bank-page")).toBeVisible();
  }

  async searchKnowledge(query: string) {
    await this.page.getByTestId("knowledge-search-input").fill(query);
    await this.page.waitForTimeout(500); // Allow search to filter
  }

  async clearSearch() {
    await this.page.getByTestId("knowledge-search-input").clear();
    await this.page.waitForTimeout(500);
  }

  async clickAddKnowledge() {
    await this.page.getByTestId("add-knowledge-button").click();
    await expect(this.page.getByTestId("new-knowledge-form-container")).toBeVisible();
  }

  async addKnowledge(content: string) {
    await this.clickAddKnowledge();
    await this.page.getByTestId("knowledge-content-textarea").fill(content);
    await this.page.getByTestId("save-knowledge-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async editKnowledge(originalContent: string, newContent: string) {
    const knowledgeButton = this.page.getByTestId("knowledge-content-button").filter({ hasText: originalContent });
    await knowledgeButton.click();
    await expect(this.page.getByTestId("knowledge-edit-form")).toBeVisible();

    const textarea = this.page.getByTestId("knowledge-content-textarea");
    await textarea.click();
    await textarea.fill(newContent);
    await this.page.getByTestId("save-knowledge-button").click();
    
    // Wait for the edit form to disappear, indicating save completed
    await expect(this.page.getByTestId("knowledge-edit-form")).not.toBeVisible({ timeout: 10000 });
    await this.page.waitForLoadState("networkidle");
  }

  async toggleKnowledgeEnabled(content: string) {
    const knowledgeItem = this.page.getByTestId("knowledge-bank-item").filter({ hasText: content });
    const toggleSwitch = knowledgeItem.getByTestId("knowledge-toggle-switch");
    await toggleSwitch.click();
    await this.page.waitForLoadState("networkidle");
  }

  async deleteKnowledge(content: string) {
    const knowledgeItem = this.page.getByTestId("knowledge-bank-item").filter({ hasText: content });
    const deleteButton = knowledgeItem.getByTestId("delete-knowledge-button");
    await deleteButton.click();

    // Wait for confirmation dialog and confirm deletion
    await this.page.getByRole("button", { name: "Yes, delete" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectKnowledgeExists(content: string) {
    const knowledgeItem = this.page.getByTestId("knowledge-bank-item").filter({ hasText: content });
    await expect(knowledgeItem).toBeVisible({ timeout: 10000 });
  }

  async expectKnowledgeNotExists(content: string) {
    const knowledgeItem = this.page.getByTestId("knowledge-bank-item").filter({ hasText: content });
    await expect(knowledgeItem).not.toBeVisible({ timeout: 10000 });
  }

  async expectKnowledgeEnabled(content: string, enabled: boolean) {
    const knowledgeItem = this.page.getByTestId("knowledge-bank-item").filter({ hasText: content });
    const toggleSwitch = knowledgeItem.getByTestId("knowledge-toggle-switch");

    if (enabled) {
      await expect(toggleSwitch).toBeChecked();
    } else {
      await expect(toggleSwitch).not.toBeChecked();
    }
  }

  async expandSuggestedKnowledge() {
    const trigger = this.page.getByTestId("suggested-knowledge-trigger");
    if (await trigger.isVisible()) {
      await trigger.click();
      await expect(this.page.getByTestId("suggested-knowledge-content")).toBeVisible();
    }
  }

  async acceptSuggestedKnowledge(originalContent: string, newContent?: string) {
    await this.expandSuggestedKnowledge();

    const suggestedItem = this.page.getByTestId("suggested-knowledge-item").filter({ hasText: originalContent });

    if (newContent) {
      await suggestedItem.getByTestId("suggested-knowledge-textarea").clear();
      await suggestedItem.getByTestId("suggested-knowledge-textarea").fill(newContent);
    }

    await suggestedItem.getByTestId("accept-suggested-knowledge-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async rejectSuggestedKnowledge(content: string) {
    await this.expandSuggestedKnowledge();

    const suggestedItem = this.page.getByTestId("suggested-knowledge-item").filter({ hasText: content });

    await suggestedItem.getByTestId("reject-suggested-knowledge-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectSuggestedKnowledgeCount(count: number) {
    if (count > 0) {
      const badge = this.page.getByTestId("suggested-knowledge-badge");
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(count.toString());
    } else {
      const accordion = this.page.getByTestId("suggested-knowledge-accordion");
      await expect(accordion).not.toBeVisible();
    }
  }

  async getKnowledgeList() {
    return this.page.getByTestId("knowledge-list");
  }

  async expectEmptyState() {
    const knowledgeList = await this.getKnowledgeList();
    const knowledgeItems = knowledgeList.getByTestId("knowledge-bank-item");
    await expect(knowledgeItems).toHaveCount(0);
  }
}
