import { expect, type Locator, type Page } from "@playwright/test";

type IssueTitle = string;
type IssueDescription = string;

export class CommonIssuesPage {
  readonly page: Page;

  private readonly elementVisibleTimeout = 10000;
  private readonly networkIdleTimeout = "networkidle" as const;

  private readonly addCommonIssueButton = "Add Common Issue";
  private readonly saveButton = "Save";
  private readonly cancelButton = "Cancel";
  private readonly editButton = "Edit";
  private readonly deleteButton = "Delete";
  private readonly yesDeleteButton = "Yes, delete";

  private readonly commonIssuesHeading = "Common Issues";

  private readonly searchPlaceholder = "Search common issues...";
  private readonly titlePlaceholder = "e.g., Login Issues";
  private readonly descriptionPlaceholder = "Brief description of this issue group...";

  private readonly emptyStateMessage = "No common issues created yet.";
  private readonly searchEmptyStateMessage = "No common issues found matching your search.";
  private readonly singleConversationMessage = "1 conversation";
  private readonly multipleConversationsMessage = "conversations";

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToCommonIssues() {
    await this.page.goto("/settings/common-issues");
    await expect(this.page.getByText(this.commonIssuesHeading).first()).toBeVisible();
  }

  async searchCommonIssues(query: string) {
    await this.page.getByPlaceholder(this.searchPlaceholder).fill(query);
  }

  async addCommonIssue(title: IssueTitle, description?: IssueDescription) {
    await this.openAddIssueForm();
    await this.fillIssueTitle(title);
    if (description) {
      await this.fillIssueDescription(description);
    }
    await this.saveIssue();
  }

  async editCommonIssue(currentTitle: IssueTitle, newTitle: IssueTitle, newDescription?: IssueDescription) {
    const issueItem = await this.findIssueItem(currentTitle);
    await issueItem.getByRole("button", { name: this.editButton }).click();

    await this.fillIssueTitle(newTitle);
    if (newDescription !== undefined) {
      await this.fillIssueDescription(newDescription);
    }
    await this.saveIssue();
  }

  async deleteCommonIssue(title: IssueTitle) {
    const issueItem = await this.findIssueItem(title);
    await issueItem.getByRole("button", { name: this.deleteButton }).click();
    await this.page.getByRole("button", { name: this.yesDeleteButton }).click();
    await this.waitForNetworkIdle();
  }

  async cancelAddCommonIssue() {
    await this.openAddIssueForm();
    await this.page.getByRole("button", { name: this.cancelButton }).click();
  }

  async cancelEditCommonIssue(title: IssueTitle) {
    const issueItem = await this.findIssueItem(title);
    await issueItem.getByRole("button", { name: this.editButton }).click();
    await this.page.getByRole("button", { name: this.cancelButton }).click();
  }

  async expectCommonIssueVisible(title: IssueTitle) {
    await expect(this.page.getByText(title, { exact: true })).toBeVisible({ timeout: this.elementVisibleTimeout });
  }

  async expectCommonIssueNotVisible(title: IssueTitle) {
    await expect(this.page.getByText(title, { exact: true })).not.toBeVisible({
      timeout: this.elementVisibleTimeout,
    });
  }

  async expectCommonIssueDescription(title: IssueTitle, description: IssueDescription) {
    const issueItem = await this.findIssueItem(title);
    await expect(issueItem.getByText(description)).toBeVisible({ timeout: this.elementVisibleTimeout });
  }

  async expectCommonIssueConversationCount(title: IssueTitle, count: number) {
    const issueItem = await this.findIssueItem(title);
    const expectedText = count === 1 ? this.singleConversationMessage : `${count} ${this.multipleConversationsMessage}`;
    await expect(issueItem.getByText(expectedText)).toBeVisible({ timeout: this.elementVisibleTimeout });
  }

  async expectEmptyState() {
    await expect(this.page.getByText(this.emptyStateMessage)).toBeVisible({
      timeout: this.elementVisibleTimeout,
    });
  }

  async expectSearchEmptyState() {
    await expect(this.page.getByText(this.searchEmptyStateMessage)).toBeVisible({
      timeout: this.elementVisibleTimeout,
    });
  }

  async expectNoEmptyState() {
    await expect(this.page.getByText(this.emptyStateMessage)).not.toBeVisible({
      timeout: this.elementVisibleTimeout,
    });
  }

  async openAddIssueForm() {
    await this.page.getByRole("button", { name: this.addCommonIssueButton }).click();
  }

  async fillIssueTitle(title: IssueTitle) {
    await this.page.getByPlaceholder(this.titlePlaceholder).fill(title);
  }

  async expectSaveButtonDisabled() {
    await expect(this.page.getByRole("button", { name: this.saveButton })).toBeDisabled();
  }

  async expectSaveButtonEnabled() {
    await expect(this.page.getByRole("button", { name: this.saveButton })).toBeEnabled();
  }

  async fillIssueDescription(description: IssueDescription) {
    await this.page.getByPlaceholder(this.descriptionPlaceholder).fill(description);
  }

  private async saveIssue() {
    await this.page.getByRole("button", { name: this.saveButton }).click();
    await this.waitForNetworkIdle();
  }

  private async waitForNetworkIdle() {
    await this.page.waitForLoadState(this.networkIdleTimeout);
  }

  private async findIssueItem(title: string): Promise<Locator> {
    return this.page.getByTestId("common-issue-item").filter({ hasText: title });
  }
}
