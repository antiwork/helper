import { expect, type Page } from "@playwright/test";

export class CommonIssuesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToCommonIssues() {
    await this.page.goto("/settings/common-issues");
    await expect(this.page.getByTestId("common-issues-page")).toBeVisible();
  }

  async searchCommonIssues(query: string) {
    const searchInput = this.page.getByTestId("common-issues-search-input");
    await searchInput.click();
    await searchInput.fill(query);
  }

  async addCommonIssue(title: string, description?: string) {
    await this.page.getByTestId("add-common-issue-button").click();

    await this.page.getByTestId("issue-title-input").fill(title);
    if (description) {
      await this.page.getByTestId("issue-description-input").fill(description);
    }

    await this.page.getByTestId("save-issue-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async editCommonIssue(currentTitle: string, newTitle: string, newDescription?: string) {
    const issueItem = this.page.getByTestId("common-issue-item").filter({ hasText: currentTitle });
    await issueItem.getByTestId("edit-common-issue-button").click();

    const titleInput = this.page.getByTestId("issue-title-input");
    await titleInput.click();
    await titleInput.fill(newTitle);

    if (newDescription !== undefined) {
      const descriptionInput = this.page.getByTestId("issue-description-input");
      await descriptionInput.click();
      await descriptionInput.fill(newDescription);
    }

    await this.page.getByTestId("save-issue-button").click();
    await this.page.waitForLoadState("networkidle");
  }

  async deleteCommonIssue(title: string) {
    const issueItem = this.page.getByTestId("common-issue-item").filter({ hasText: title });
    await issueItem.getByTestId("delete-common-issue-button").click();

    // Handle confirmation dialog - look for the "Yes, delete" button
    await this.page.getByRole("button", { name: "Yes, delete" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async cancelAddCommonIssue() {
    await this.page.getByTestId("add-common-issue-button").click();
    await this.page.getByTestId("cancel-issue-button").click();
  }

  async cancelEditCommonIssue(title: string) {
    const issueItem = this.page.getByTestId("common-issue-item").filter({ hasText: title });
    await issueItem.getByTestId("edit-common-issue-button").click();
    await this.page.getByTestId("cancel-issue-button").click();
  }

  async expectCommonIssueVisible(title: string) {
    const issueItem = this.page.getByTestId("common-issue-item").filter({ hasText: title });
    await expect(issueItem).toBeVisible();
    await expect(issueItem.getByTestId("common-issue-title")).toContainText(title);
  }

  async expectCommonIssueNotVisible(title: string) {
    const issueItem = this.page.getByTestId("common-issue-item").filter({ hasText: title });
    await expect(issueItem).not.toBeVisible();
  }

  async expectCommonIssueDescription(title: string, description: string) {
    const issueItem = this.page.getByTestId("common-issue-item").filter({ hasText: title });
    await expect(issueItem.getByTestId("common-issue-description")).toContainText(description);
  }

  async expectCommonIssueConversationCount(title: string, count: number) {
    const issueItem = this.page.getByTestId("common-issue-item").filter({ hasText: title });
    const expectedText = count === 1 ? "1 conversation" : `${count} conversations`;
    await expect(issueItem.getByTestId("common-issue-conversation-count")).toContainText(expectedText);
  }

  async expectEmptyState() {
    await expect(this.page.getByTestId("common-issues-empty-state")).toBeVisible();
  }

  async expectSearchEmptyState() {
    await expect(this.page.getByTestId("common-issues-empty-state")).toContainText(
      "No common issues found matching your search.",
    );
  }

  async expectNoEmptyState() {
    await expect(this.page.getByTestId("common-issues-empty-state")).not.toBeVisible();
  }
}
