import { expect, type Page } from "@playwright/test";
import { waitForToast } from "./toastHelpers";

async function openCreateDialog(page: Page) {
  await page.waitForTimeout(500);

  const emptyState = page.locator('text="No saved replies yet"');
  const floatingAddButton = page.locator("button.fixed");
  const createOneButton = page.locator('button:has-text("Create one")');
  const emptyStateVisible = await emptyState.isVisible().catch(() => false);

  if (emptyStateVisible) {
    await createOneButton.click();
  } else {
    const fabVisible = await floatingAddButton.isVisible().catch(() => false);

    if (fabVisible) {
      await floatingAddButton.click();
    } else {
      try {
        await Promise.race([
          createOneButton.waitFor({ state: "visible", timeout: 5000 }).then(() => "createOne"),
          floatingAddButton.waitFor({ state: "visible", timeout: 5000 }).then(() => "floating"),
        ]).then(async (buttonType) => {
          if (buttonType === "createOne") {
            await createOneButton.click();
          } else {
            await floatingAddButton.click();
          }
        });
      } catch {
        throw new Error("Neither 'Create one' nor floating add button found");
      }
    }
  }

  await expect(page.locator('[role="dialog"]:has-text("New saved reply")')).toBeVisible();
}

async function fillSavedReplyForm(page: Page, name: string, content: string) {
  const nameInput = page.locator('input[placeholder*="Welcome Message"]');
  const contentEditor = page.locator('[role="textbox"][contenteditable="true"]');
  await nameInput.fill(name);
  await contentEditor.click();
  await contentEditor.fill(content);
}

async function clickSaveButton(page: Page) {
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

  // Wait for the first button to become visible and capture it
  const winningButton = await Promise.race(buttonPromises);

  if (!winningButton) {
    throw new Error("No save button (Add/Update/Save) found");
  }

  // Click the winning button directly
  await winningButton.scrollIntoViewIfNeeded();
  await winningButton.click();

  // Wait for either dialog to close
  await Promise.race([
    createDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => null),
    editDialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => null),
  ]);
}

export async function createSavedReply(page: Page, name: string, content: string) {
  await openCreateDialog(page);
  await fillSavedReplyForm(page, name, content);
  await clickSaveButton(page);
  await waitForToast(page, "Saved reply created successfully");
}
