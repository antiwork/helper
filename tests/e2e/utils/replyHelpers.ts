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
  const addBtn = page.locator('button:has-text("Add")');
  const updateBtn = page.locator('button:has-text("Update")');
  const saveBtn = page.locator('button:has-text("Save")');
  const createDialog = page.locator('[role="dialog"]:has-text("New saved reply")');
  const editDialog = page.locator('[role="dialog"]:has-text("Edit saved reply")');

  // Map each button to its waitFor promise, returning the button when visible
  const buttonPromises = [
    updateBtn
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => updateBtn)
      .catch(() => null),
    addBtn
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => addBtn)
      .catch(() => null),
    saveBtn
      .waitFor({ state: "visible", timeout: 5000 })
      .then(() => saveBtn)
      .catch(() => null),
  ];

  // Wait for any button to become visible
  const buttons = await Promise.all(buttonPromises);
  const visibleButton = buttons.find((btn) => btn !== null);

  if (visibleButton) {
    await visibleButton.click();
  } else {
    // Fallback logic for context-specific buttons
    const isCreateContext = await createDialog.isVisible().catch(() => false);
    const isEditContext = await editDialog.isVisible().catch(() => false);

    if (isCreateContext) {
      const fallbackAddBtn = createDialog.locator('button:has-text("Add")');
      await expect(fallbackAddBtn).toBeVisible({ timeout: 5000 });
      await fallbackAddBtn.click();
    } else if (isEditContext) {
      const fallbackUpdateBtn = editDialog.locator('button:has-text("Update")');
      await expect(fallbackUpdateBtn).toBeVisible({ timeout: 5000 });
      await fallbackUpdateBtn.click();
    } else {
      throw new Error("No save button found in current context");
    }
  }
}

// Creates a new saved reply by opening the create dialog, filling the form, and saving
export async function createSavedReply(page: Page, name: string, content: string) {
  await openCreateDialog(page);
  await fillSavedReplyForm(page, name, content);
  await clickSaveButton(page);
  await waitForToast(page, "Saved reply created successfully");
}
