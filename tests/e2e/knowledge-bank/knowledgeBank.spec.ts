import { expect, test, type Page } from "@playwright/test";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function navigate(page: Page) {
  await page.goto("/settings/knowledge");
  await page.waitForLoadState("networkidle");
}

async function waitForPageLoad(page: Page) {
  await expect(page.getByRole("heading", { name: "Knowledge Bank" })).toBeVisible();
}

async function searchKnowledge(page: Page, query: string) {
  await page.getByPlaceholder("Search knowledge bank...").fill(query);
  await page.waitForTimeout(500);
}

async function clearSearch(page: Page) {
  await page.getByPlaceholder("Search knowledge bank...").clear();
  await page.waitForTimeout(500);
}

async function clickAddKnowledge(page: Page) {
  await page.getByRole("button", { name: "Add Knowledge" }).click();
  await expect(page.locator("#knowledge-content-textarea")).toBeVisible();
}

async function fillKnowledgeContent(page: Page, content: string) {
  const textarea = page.locator("#knowledge-content-textarea");
  await textarea.click();
  await textarea.fill(content);
}

async function saveKnowledge(page: Page) {
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForLoadState("networkidle");
}

async function addKnowledge(page: Page, content: string) {
  await clickAddKnowledge(page);
  await fillKnowledgeContent(page, content);
  await saveKnowledge(page);
}

async function getKnowledgeItemByContent(page: Page, content: string) {
  return page.locator('[data-testid="knowledge-bank-item"]').filter({ hasText: content }).first();
}

async function startEditingKnowledge(page: Page, content: string) {
  const knowledgeItem = await getKnowledgeItemByContent(page, content);
  const editButton = knowledgeItem.getByRole("button", { name: "Edit knowledge" });
  await expect(editButton).toBeVisible();
  await expect(editButton).toBeEnabled();
  await editButton.click();
  await expect(page.locator("#knowledge-content-textarea")).toBeVisible({ timeout: 10000 });
}

async function cancelEdit(page: Page) {
  await page.locator("form").getByRole("button", { name: "Cancel" }).click();
}

async function editKnowledge(page: Page, originalContent: string, newContent: string) {
  await startEditingKnowledge(page, originalContent);
  await fillKnowledgeContent(page, newContent);
  await saveKnowledge(page);
  await expect(page.locator("#knowledge-content-textarea")).not.toBeVisible({ timeout: 10000 });
}

async function toggleKnowledgeEnabled(page: Page, content: string) {
  const knowledgeItem = await getKnowledgeItemByContent(page, content);
  const toggleSwitch = knowledgeItem.getByRole("switch", { name: "Enable Knowledge" });
  await toggleSwitch.click();
  await page.waitForLoadState("networkidle");
}

async function deleteKnowledge(page: Page, content: string) {
  const knowledgeItem = await getKnowledgeItemByContent(page, content);
  const deleteButton = knowledgeItem.getByRole("button", { name: "Delete" });
  await deleteButton.click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForLoadState("networkidle");
}

async function expectKnowledgeExists(page: Page, content: string) {
  const knowledgeItem = await getKnowledgeItemByContent(page, content);
  await expect(knowledgeItem).toBeVisible({ timeout: 10000 });
}

async function expectKnowledgeNotExists(page: Page, content: string) {
  const knowledgeItem = await getKnowledgeItemByContent(page, content);
  await expect(knowledgeItem).not.toBeVisible({ timeout: 10000 });
}

async function expectKnowledgeEnabled(page: Page, content: string, enabled: boolean) {
  const knowledgeItem = await getKnowledgeItemByContent(page, content);
  const toggleSwitch = knowledgeItem.getByRole("switch", { name: "Enable Knowledge" });
  const expectation = expect(toggleSwitch);
  enabled ? await expectation.toBeChecked() : await expectation.not.toBeChecked();
}

test.describe("Knowledge Bank Settings", () => {
  test.beforeEach(async ({ page }) => {
    await navigate(page);
    await waitForPageLoad(page);
  });

  test("should add new knowledge", async ({ page }) => {
    const testContent = `Test knowledge entry ${generateRandomString(8)}`;

    await addKnowledge(page, testContent);
    await expectKnowledgeExists(page, testContent);

    await deleteKnowledge(page, testContent);
  });

  test("should edit existing knowledge", async ({ page }) => {
    const originalContent = `Original knowledge ${generateRandomString(8)}`;
    const updatedContent = `Updated knowledge ${generateRandomString(8)}`;

    await addKnowledge(page, originalContent);
    await expectKnowledgeExists(page, originalContent);

    await editKnowledge(page, originalContent, updatedContent);

    await expectKnowledgeExists(page, updatedContent);
    await expectKnowledgeNotExists(page, originalContent);

    await deleteKnowledge(page, updatedContent);
  });

  test("should toggle knowledge enabled state", async ({ page }) => {
    const testContent = `Knowledge toggle test ${generateRandomString(8)}`;

    await addKnowledge(page, testContent);
    await expectKnowledgeEnabled(page, testContent, true);

    await toggleKnowledgeEnabled(page, testContent);
    await expectKnowledgeEnabled(page, testContent, false);

    await toggleKnowledgeEnabled(page, testContent);
    await expectKnowledgeEnabled(page, testContent, true);

    await deleteKnowledge(page, testContent);
  });

  test("should delete knowledge", async ({ page }) => {
    const testContent = `Knowledge deletion test ${generateRandomString(8)}`;

    await addKnowledge(page, testContent);
    await expectKnowledgeExists(page, testContent);

    await deleteKnowledge(page, testContent);
    await expectKnowledgeNotExists(page, testContent);
  });

  test("should search knowledge entries", async ({ page }) => {
    const uniqueId = generateRandomString(6);
    const testContent1 = `First knowledge ${uniqueId} about refunds`;
    const testContent2 = `Second knowledge ${uniqueId} about shipping`;

    await addKnowledge(page, testContent1);
    await addKnowledge(page, testContent2);

    await searchKnowledge(page, "refunds");
    await expectKnowledgeExists(page, testContent1);
    await expectKnowledgeNotExists(page, testContent2);

    await searchKnowledge(page, "shipping");
    await expectKnowledgeExists(page, testContent2);
    await expectKnowledgeNotExists(page, testContent1);

    await clearSearch(page);
    await expectKnowledgeExists(page, testContent1);
    await expectKnowledgeExists(page, testContent2);

    await deleteKnowledge(page, testContent1);
    await deleteKnowledge(page, testContent2);
  });

  test("should cancel knowledge editing", async ({ page }) => {
    const originalContent = `Original cancel test ${generateRandomString(8)}`;
    const changedContent = `Changed cancel test ${generateRandomString(8)}`;

    await addKnowledge(page, originalContent);
    await startEditingKnowledge(page, originalContent);
    await fillKnowledgeContent(page, changedContent);
    await cancelEdit(page);

    await expectKnowledgeExists(page, originalContent);
    await expectKnowledgeNotExists(page, changedContent);

    await deleteKnowledge(page, originalContent);
  });
});
