import { expect, Locator, Page } from "@playwright/test";
import { waitForToast } from "../toastHelpers";

export class SavedRepliesPage {
  protected page: Page;
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly newReplyButton: Locator;
  readonly createOneButton: Locator;
  readonly savedReplyCards: Locator;
  readonly loadingSkeletons: Locator;
  readonly emptyState: Locator;
  readonly emptyStateText: Locator;
  readonly floatingAddButton: Locator;

  readonly createDialog: Locator;
  readonly editDialog: Locator;
  readonly deleteDialog: Locator;
  readonly dialogTitle: Locator;
  readonly nameInput: Locator;
  readonly contentEditor: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly addButton: Locator;
  readonly updateButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDeleteButton: Locator;

  // Card elements
  readonly cardTitle: Locator;
  readonly cardContent: Locator;
  readonly cardUsageCount: Locator;
  readonly copyButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageTitle = page.locator('h1:has-text("Saved replies")');
    this.searchInput = page.locator('input[placeholder="Search saved replies..."]').first();
    this.newReplyButton = page.locator('button:has-text("New saved reply")');
    this.createOneButton = page.locator('button:has-text("Create one")');
    this.savedReplyCards = page.locator('[data-testid="saved-reply-card"]');
    this.loadingSkeletons = page.locator(".animate-default-pulse");
    this.emptyState = page.locator('text="No saved replies yet"');
    this.emptyStateText = page.locator('text="No saved replies found matching your search"');

    this.floatingAddButton = page.locator("button.fixed");

    this.createDialog = page.locator('[role="dialog"]:has-text("New saved reply")');
    this.editDialog = page.locator('[role="dialog"]:has-text("Edit saved reply")');
    this.deleteDialog = page.locator('[role="dialog"]:has-text("Are you sure you want to delete")');
    this.dialogTitle = page.locator('[role="dialog"] h2');
    this.nameInput = page.locator('input[placeholder*="Welcome Message"]');
    this.contentEditor = page.locator('[role="textbox"][contenteditable="true"]');
    this.saveButton = page.locator('button:has-text("Saving...")');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.addButton = page.locator('button:has-text("Add")');
    this.updateButton = page.locator('button:has-text("Update")');
    this.deleteButton = page.locator('button:has-text("Delete"):not(:has-text("saved reply"))');
    this.confirmDeleteButton = page.locator('[role="dialog"] button:has-text("Yes")');

    this.cardTitle = page.locator('[data-testid="saved-reply-card"] .text-lg');
    this.cardContent = page.locator('[data-testid="saved-reply-card"] .text-muted-foreground');
    this.cardUsageCount = page.locator('[data-testid="saved-reply-card"] text*="Used"');
    this.copyButton = page.locator('[data-testid="copy-button"]');
  }

  async navigateToSavedReplies() {
    await this.page.goto(`/saved-replies`);
    await this.page.waitForLoadState("networkidle");
  }
  async expectPageVisible() {
    await expect(this.pageTitle).toBeVisible();
  }

  async expectSearchVisible() {
    await expect(this.searchInput).toBeVisible();
  }

  async expectNewReplyButtonVisible() {
    const hasReplies = (await this.savedReplyCards.count()) > 0;

    if (hasReplies) {
      await expect(this.floatingAddButton).toBeVisible();
    } else {
      await expect(this.createOneButton).toBeVisible();
    }
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
    await expect(this.createOneButton).toBeVisible();
  }

  async expectSavedRepliesVisible() {
    await expect(this.savedReplyCards.first()).toBeVisible();
  }

  async expectLoadingState() {
    await expect(this.loadingSkeletons.first()).toBeVisible();
  }

  async expectCreateDialogVisible() {
    await expect(this.createDialog).toBeVisible();
    await expect(this.dialogTitle).toContainText("New saved reply");
  }

  async expectEditDialogVisible() {
    await expect(this.editDialog).toBeVisible();
    await expect(this.dialogTitle).toContainText("Edit saved reply");
  }

  async expectDeleteDialogVisible() {
    await expect(this.deleteDialog).toBeVisible();
    await expect(this.deleteDialog).toContainText("Are you sure you want to delete");
  }

  async clickNewReplyButton() {
    await this.newReplyButton.click();
  }

  async clickCreateOneButton() {
    await this.createOneButton.click();
  }

  async clickFloatingAddButton() {
    await this.floatingAddButton.click();
  }

  async searchSavedReplies(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500);

    try {
      await this.page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch {
      // Continue if networkidle times out
    }

    await this.page.waitForTimeout(200);
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
    try {
      await this.page.waitForLoadState("networkidle", { timeout: 3000 });
    } catch {
      // Continue if networkidle times out
    }
    await this.page.waitForTimeout(200);
  }

  async fillSavedReplyForm(name: string, content: string) {
    await this.nameInput.fill(name);
    await this.contentEditor.click();
    await this.contentEditor.fill(content);
  }

  async clickSaveButton() {
    const addBtn = this.page.locator('button:has-text("Add")');
    const updateBtn = this.page.locator('button:has-text("Update")');

    await Promise.race([
      addBtn.waitFor({ state: "visible", timeout: 5000 }),
      updateBtn.waitFor({ state: "visible", timeout: 5000 }),
    ]);

    if (await addBtn.isVisible()) {
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click();
    } else if (await updateBtn.isVisible()) {
      await updateBtn.scrollIntoViewIfNeeded();
      await updateBtn.click();
    } else {
      throw new Error("Neither Add nor Update button found");
    }

    await this.createDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {
      return this.editDialog.waitFor({ state: "hidden", timeout: 5000 });
    });
  }

  async clickCancelButton() {
    await this.cancelButton.click();
  }

  async clickFirstSavedReply() {
    await this.savedReplyCards.first().click();
  }

  async clickCopyButton(index = 0) {
    await this.copyButton.nth(index).click();
  }

  async clickDeleteButtonInModal() {
    await this.deleteButton.click();
  }

  async confirmDelete() {
    await this.confirmDeleteButton.click();
  }

  async getSavedReplyCount(): Promise<number> {
    return await this.savedReplyCards.count();
  }

  async getSavedReplyTitle(index = 0): Promise<string> {
    return (await this.cardTitle.nth(index).textContent()) || "";
  }

  async getSavedReplyContent(index = 0): Promise<string> {
    return (await this.cardContent.nth(index).textContent()) || "";
  }

  async waitForToast(message: string) {
    await waitForToast(this.page, message);
  }

  async openCreateDialog() {
    await this.page.waitForTimeout(500);

    const emptyStateVisible = await this.emptyState.isVisible().catch(() => false);

    if (emptyStateVisible) {
      await this.clickCreateOneButton();
    } else {
      const fabVisible = await this.floatingAddButton.isVisible().catch(() => false);

      if (fabVisible) {
        await this.clickFloatingAddButton();
      } else {
        try {
          await Promise.race([
            this.createOneButton.waitFor({ state: "visible", timeout: 5000 }).then(() => "createOne"),
            this.floatingAddButton.waitFor({ state: "visible", timeout: 5000 }).then(() => "floating"),
          ]).then(async (buttonType) => {
            if (buttonType === "createOne") {
              await this.clickCreateOneButton();
            } else {
              await this.clickFloatingAddButton();
            }
          });
        } catch {
          throw new Error("Neither 'Create one' nor floating add button found");
        }
      }
    }

    await this.expectCreateDialogVisible();
  }

  async createSavedReply(name: string, content: string) {
    await this.openCreateDialog();
    await this.fillSavedReplyForm(name, content);
    await this.clickSaveButton();
    await this.waitForToast("Saved reply created successfully");
  }

  async editSavedReply(index: number, newName: string, newContent: string) {
    await this.savedReplyCards.nth(index).click();
    await this.expectEditDialogVisible();

    await this.nameInput.clear();
    await this.contentEditor.click();
    await this.contentEditor.clear();

    await this.fillSavedReplyForm(newName, newContent);
    await this.clickSaveButton();
    await this.waitForToast("Saved reply updated successfully");
  }

  async deleteSavedReply(index: number) {
    await this.savedReplyCards.nth(index).click();
    await this.expectEditDialogVisible();

    await this.clickDeleteButtonInModal();
    await this.expectDeleteDialogVisible();
    await this.confirmDelete();
    await this.waitForToast("Saved reply deleted successfully");
  }

  async expectSearchResults(expectedCount: number) {
    if (expectedCount === 0) {
      await expect(this.emptyStateText).toBeVisible();
    } else {
      await expect(this.savedReplyCards).toHaveCount(expectedCount);
    }
  }

  async expectClipboardContent() {
    await this.waitForToast("Saved reply copied to clipboard");
  }
}
