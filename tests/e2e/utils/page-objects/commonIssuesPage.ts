import { expect, type Locator, type Page } from "@playwright/test";

type IssueTitle = string;
type IssueDescription = string;

export class CommonIssuesPage {
  readonly page: Page;

  private readonly TIMEOUTS = {
    ELEMENT_VISIBLE: 10000,
    NETWORK_IDLE: "networkidle" as const,
  } as const;

  private readonly UI_ELEMENTS = {
    BUTTONS: {
      ADD_COMMON_ISSUE: "Add Common Issue",
      SAVE: "Save",
      CANCEL: "Cancel",
      EDIT: "Edit",
      DELETE: "Delete",
      YES_DELETE: "Yes, delete",
    },
    HEADINGS: {
      COMMON_ISSUES: "Common Issues",
    },
    PLACEHOLDERS: {
      SEARCH: "Search common issues...",
      TITLE: "e.g., Login Issues",
      DESCRIPTION: "Brief description of this issue group...",
    },
    MESSAGES: {
      EMPTY_STATE: "No common issues created yet.",
      SEARCH_EMPTY_STATE: "No common issues found matching your search.",
      SINGLE_CONVERSATION: "1 conversation",
      MULTIPLE_CONVERSATIONS: "conversations",
    },
  } as const;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToCommonIssues() {
    await this.page.goto("/settings/common-issues");
    await expect(this.page.getByText(this.UI_ELEMENTS.HEADINGS.COMMON_ISSUES).first()).toBeVisible();
  }

  async searchCommonIssues(query: string) {
    await this.page.getByPlaceholder(this.UI_ELEMENTS.PLACEHOLDERS.SEARCH).fill(query);
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
    await issueItem.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.EDIT }).click();

    await this.fillIssueTitle(newTitle);
    if (newDescription !== undefined) {
      await this.fillIssueDescription(newDescription);
    }
    await this.saveIssue();
  }

  async deleteCommonIssue(title: IssueTitle) {
    const issueItem = await this.findIssueItem(title);
    await issueItem.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.DELETE }).click();
    await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.YES_DELETE }).click();
    await this.waitForNetworkIdle();
  }

  async cancelAddCommonIssue() {
    await this.openAddIssueForm();
    await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.CANCEL }).click();
  }

  async cancelEditCommonIssue(title: IssueTitle) {
    const issueItem = await this.findIssueItem(title);
    await issueItem.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.EDIT }).click();
    await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.CANCEL }).click();
  }

  async expectCommonIssueVisible(title: IssueTitle) {
    await expect(this.page.getByText(title, { exact: true })).toBeVisible({ timeout: this.TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectCommonIssueNotVisible(title: IssueTitle) {
    await expect(this.page.getByText(title, { exact: true })).not.toBeVisible({
      timeout: this.TIMEOUTS.ELEMENT_VISIBLE,
    });
  }

  async expectCommonIssueDescription(title: IssueTitle, description: IssueDescription) {
    const issueItem = await this.findIssueItem(title);
    await expect(issueItem.getByText(description)).toBeVisible({ timeout: this.TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectCommonIssueConversationCount(title: IssueTitle, count: number) {
    const issueItem = await this.findIssueItem(title);
    const expectedText =
      count === 1
        ? this.UI_ELEMENTS.MESSAGES.SINGLE_CONVERSATION
        : `${count} ${this.UI_ELEMENTS.MESSAGES.MULTIPLE_CONVERSATIONS}`;
    await expect(issueItem.getByText(expectedText)).toBeVisible({ timeout: this.TIMEOUTS.ELEMENT_VISIBLE });
  }

  async expectEmptyState() {
    await expect(this.page.getByText(this.UI_ELEMENTS.MESSAGES.EMPTY_STATE)).toBeVisible({
      timeout: this.TIMEOUTS.ELEMENT_VISIBLE,
    });
  }

  async expectSearchEmptyState() {
    await expect(this.page.getByText(this.UI_ELEMENTS.MESSAGES.SEARCH_EMPTY_STATE)).toBeVisible({
      timeout: this.TIMEOUTS.ELEMENT_VISIBLE,
    });
  }

  async expectNoEmptyState() {
    await expect(this.page.getByText(this.UI_ELEMENTS.MESSAGES.EMPTY_STATE)).not.toBeVisible({
      timeout: this.TIMEOUTS.ELEMENT_VISIBLE,
    });
  }

  async openAddIssueForm() {
    await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.ADD_COMMON_ISSUE }).click();
  }

  async fillIssueTitle(title: IssueTitle) {
    await this.page.getByPlaceholder(this.UI_ELEMENTS.PLACEHOLDERS.TITLE).fill(title);
  }

  async expectSaveButtonDisabled() {
    await expect(this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.SAVE })).toBeDisabled();
  }

  async expectSaveButtonEnabled() {
    await expect(this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.SAVE })).toBeEnabled();
  }

  async fillIssueDescription(description: IssueDescription) {
    await this.page.getByPlaceholder(this.UI_ELEMENTS.PLACEHOLDERS.DESCRIPTION).fill(description);
  }

  private async saveIssue() {
    await this.page.getByRole("button", { name: this.UI_ELEMENTS.BUTTONS.SAVE }).click();
    await this.waitForNetworkIdle();
  }

  private async waitForNetworkIdle() {
    await this.page.waitForLoadState(this.TIMEOUTS.NETWORK_IDLE);
  }

  private async findIssueItem(title: string): Promise<Locator> {
    const titleElement = this.page.getByText(title, { exact: true });
    return titleElement.locator("xpath=ancestor::div[2]");
  }
}
