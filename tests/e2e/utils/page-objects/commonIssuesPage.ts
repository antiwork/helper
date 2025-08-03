import { expect, type Locator, type Page } from "@playwright/test";

export class CommonIssuesPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToCommonIssues() {
    await this.page.goto("/settings/common-issues");
    await expect(this.page.getByText("Common Issues").first()).toBeVisible();
  }

  async searchCommonIssues(query: string) {
    await this.page.getByPlaceholder("Search common issues...").fill(query);
  }

  async addCommonIssue(title: string, description?: string) {
    await this.page.getByRole("button", { name: "Add Common Issue" }).click();

    await this.page.getByPlaceholder("e.g., Login Issues").fill(title);
    if (description) {
      await this.page.getByPlaceholder("Brief description of this issue group...").fill(description);
    }

    await this.page.getByRole("button", { name: "Save" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async editCommonIssue(currentTitle: string, newTitle: string, newDescription?: string) {
    const issueItem = await this.findIssueItem(currentTitle);
    await issueItem.getByRole("button", { name: "Edit" }).click();

    await this.page.getByPlaceholder("e.g., Login Issues").fill(newTitle);

    if (newDescription !== undefined) {
      await this.page.getByPlaceholder("Brief description of this issue group...").fill(newDescription);
    }

    await this.page.getByRole("button", { name: "Save" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async deleteCommonIssue(title: string) {
    const issueItem = await this.findIssueItem(title);
    await issueItem.getByRole("button", { name: "Delete" }).click();
    await this.page.getByRole("button", { name: "Yes, delete" }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async cancelAddCommonIssue() {
    await this.page.getByRole("button", { name: "Add Common Issue" }).click();
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }

  async cancelEditCommonIssue(title: string) {
    const issueItem = await this.findIssueItem(title);
    await issueItem.getByRole("button", { name: "Edit" }).click();
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }

  async expectCommonIssueVisible(title: string) {
    await expect(this.page.getByText(title, { exact: true })).toBeVisible();
  }

  async expectCommonIssueNotVisible(title: string) {
    await expect(this.page.getByText(title, { exact: true })).not.toBeVisible();
  }

  async expectCommonIssueDescription(title: string, description: string) {
    const issueItem = await this.findIssueItem(title);
    await expect(issueItem.getByText(description)).toBeVisible();
  }

  async expectCommonIssueConversationCount(title: string, count: number) {
    const issueItem = await this.findIssueItem(title);
    const expectedText = count === 1 ? "1 conversation" : `${count} conversations`;
    await expect(issueItem.getByText(expectedText)).toBeVisible();
  }

  async expectEmptyState() {
    await expect(this.page.getByText("No common issues created yet.")).toBeVisible();
  }

  async expectSearchEmptyState() {
    await expect(this.page.getByText("No common issues found matching your search.")).toBeVisible();
  }

  async expectNoEmptyState() {
    await expect(this.page.getByText("No common issues created yet.")).not.toBeVisible();
  }

  async openAddIssueForm() {
    await this.page.getByRole("button", { name: "Add Common Issue" }).click();
  }

  async fillIssueTitle(title: string) {
    await this.page.getByPlaceholder("e.g., Login Issues").fill(title);
  }

  async expectSaveButtonDisabled() {
    await expect(this.page.getByRole("button", { name: "Save" })).toBeDisabled();
  }

  async expectSaveButtonEnabled() {
    await expect(this.page.getByRole("button", { name: "Save" })).toBeEnabled();
  }

  private async findIssueItem(title: string): Promise<Locator> {
    const titleElement = this.page.getByText(title, { exact: true });
    return titleElement.locator("xpath=ancestor::div[2]");
  }
}
