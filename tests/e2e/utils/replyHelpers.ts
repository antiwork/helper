import { expect, type Page } from "@playwright/test";
import { waitForToast } from "./toastHelpers";

// Clicks the create one button in the saved replies page
export async function clickCreateOneButton(page: Page) {
  await page.locator('button:has-text("Create one")').click();
}

// Clicks the floating add button in the saved replies page
export async function clickFloatingAddButton(page: Page) {
  await page.locator("button.fixed").click();
}

// Opens the create dialog in the saved replies page
export async function openCreateDialog(page: Page) {
  await page.waitForTimeout(500);

  const emptyState = page.locator('text="No saved replies yet"');
  const floatingAddButton = page.locator("button.fixed");
  const createOneButton = page.locator('button:has-text("Create one")');
  const emptyStateVisible = await emptyState.isVisible().catch(() => false);

  if (emptyStateVisible) {
    await clickCreateOneButton(page);
  } else {
    const fabVisible = await floatingAddButton.isVisible().catch(() => false);

    if (fabVisible) {
      await clickFloatingAddButton(page);
    } else {
      // Fallback: try both buttons with a timeout
      try {
        await Promise.race([createOneButton.click({ timeout: 2000 }), floatingAddButton.click({ timeout: 2000 })]);
      } catch (error) {
        throw new Error(`Could not find any add button. EmptyState: ${emptyStateVisible}, FAB: ${fabVisible}`);
      }
    }
  }
  await page.waitForTimeout(200);
}

// Fills the saved reply form in the create or edit dialog
export async function fillSavedReplyForm(page: Page, name: string, content: string) {
  const nameInput = page.locator('input[placeholder*="Welcome Message"]');
  const contentEditor = page.locator('[role="textbox"][contenteditable="true"]');
  await nameInput.fill(name);
  await contentEditor.click();
  await contentEditor.fill(content);
}

// Clicks the save button in the create or edit dialog
export async function clickSaveButton(page: Page) {
  const createDialog = page.locator('[role="dialog"]:has-text("New saved reply")');
  const editDialog = page.locator('[role="dialog"]:has-text("Edit saved reply")');

  const [isCreateContext, isEditContext] = await Promise.all([
    createDialog.isVisible({ timeout: 500 }).catch(() => false),
    editDialog.isVisible({ timeout: 500 }).catch(() => false),
  ]);

  if (isCreateContext) {
    await createDialog.locator('button:has-text("Add")').click();
  } else if (isEditContext) {
    await editDialog.locator('button:has-text("Update")').click();
  }
}

// Creates a new saved reply by opening the create dialog, filling the form, and saving
export async function createSavedReply(page: Page, name: string, content: string) {
  await openCreateDialog(page);
  await fillSavedReplyForm(page, name, content);
  await clickSaveButton(page);
  await waitForToast(page, "Saved reply created successfully");
}
