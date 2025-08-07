import { expect, test, type Page } from "@playwright/test";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function navigateToCommonIssues(page: Page) {
  await page.goto("/settings/common-issues");
  await expect(page.getByText("Common Issues").first()).toBeVisible();
}

async function searchCommonIssues(page: Page, query: string) {
  await page.getByPlaceholder("Search common issues...").fill(query);
}

async function openAddIssueForm(page: Page) {
  await page.getByRole("button", { name: "Add Common Issue" }).click();
}

async function fillIssueTitle(page: Page, title: string) {
  await page.getByPlaceholder("e.g., Login Issues").fill(title);
}

async function fillIssueDescription(page: Page, description: string) {
  await page.getByPlaceholder("Brief description of this issue group...").fill(description);
}

async function saveIssue(page: Page) {
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForLoadState("networkidle");
}

async function findIssueItem(page: Page, title: string) {
  return page.getByTestId("common-issue-item").filter({ hasText: title });
}

async function addCommonIssue(page: Page, title: string, description?: string) {
  await openAddIssueForm(page);
  await fillIssueTitle(page, title);
  if (description) {
    await fillIssueDescription(page, description);
  }
  await saveIssue(page);
}

async function editCommonIssue(page: Page, currentTitle: string, newTitle: string, newDescription?: string) {
  const issueItem = await findIssueItem(page, currentTitle);
  await issueItem.getByRole("button", { name: "Edit" }).click();
  
  await fillIssueTitle(page, newTitle);
  if (newDescription !== undefined) {
    await fillIssueDescription(page, newDescription);
  }
  await saveIssue(page);
}

async function deleteCommonIssue(page: Page, title: string) {
  const issueItem = await findIssueItem(page, title);
  await issueItem.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await page.waitForLoadState("networkidle");
}

async function expectCommonIssueVisible(page: Page, title: string) {
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10000 });
}

async function expectCommonIssueNotVisible(page: Page, title: string) {
  await expect(page.getByText(title, { exact: true })).not.toBeVisible({
    timeout: 10000,
  });
}

async function expectCommonIssueDescription(page: Page, title: string, description: string) {
  const issueItem = await findIssueItem(page, title);
  await expect(issueItem.getByText(description)).toBeVisible({ timeout: 10000 });
}

async function expectCommonIssueConversationCount(page: Page, title: string, count: number) {
  const issueItem = await findIssueItem(page, title);
  const expectedText = count === 1 ? "1 conversation" : `${count} conversations`;
  await expect(issueItem.getByText(expectedText)).toBeVisible({ timeout: 10000 });
}

async function expectSaveButtonDisabled(page: Page) {
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
}

async function expectSaveButtonEnabled(page: Page) {
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();
}

test.describe("Common Issues", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToCommonIssues(page);
  });

  test("should create new common issues with form validation", async ({ page }) => {
    const titleOnlyIssue = `Test Issue ${generateRandomString(8)}`;
    const titleDescriptionIssue = `Test Issue with Description ${generateRandomString(8)}`;
    const testDescription = `This is a test description ${generateRandomString(8)}`;

    await openAddIssueForm(page);
    await expectSaveButtonDisabled(page);

    await fillIssueTitle(page, titleOnlyIssue);
    await expectSaveButtonEnabled(page);
    
    await saveIssue(page);
    await expectCommonIssueVisible(page, titleOnlyIssue);
    await expectCommonIssueConversationCount(page, titleOnlyIssue, 0);

    await addCommonIssue(page, titleDescriptionIssue, testDescription);
    await expectCommonIssueVisible(page, titleDescriptionIssue);
    await expectCommonIssueDescription(page, titleDescriptionIssue, testDescription);
    await expectCommonIssueConversationCount(page, titleDescriptionIssue, 0);
  });

  test("should edit existing common issue title and description", async ({ page }) => {
    const originalTitle = `Original Issue ${generateRandomString(8)}`;
    const newTitle = `Updated Issue ${generateRandomString(8)}`;
    const originalDescription = `Original description ${generateRandomString(8)}`;
    const newDescription = `Updated description ${generateRandomString(8)}`;

    await addCommonIssue(page, originalTitle, originalDescription);
    await expectCommonIssueVisible(page, originalTitle);
    await expectCommonIssueDescription(page, originalTitle, originalDescription);

    await editCommonIssue(page, originalTitle, newTitle);
    await expectCommonIssueVisible(page, newTitle);
    await expectCommonIssueNotVisible(page, originalTitle);

    await editCommonIssue(page, newTitle, newTitle, newDescription);
    await expectCommonIssueVisible(page, newTitle);
    await expectCommonIssueDescription(page, newTitle, newDescription);
  });

  test("should delete common issue", async ({ page }) => {
    const testTitle = `Issue to Delete ${generateRandomString(8)}`;

    await addCommonIssue(page, testTitle);
    await expectCommonIssueVisible(page, testTitle);

    await deleteCommonIssue(page, testTitle);
    await expectCommonIssueNotVisible(page, testTitle);
  });

  test("should search common issues by title and description", async ({ page }) => {
    const searchableTitle = `Searchable Issue ${generateRandomString(8)}`;
    const nonSearchableTitle = `Different Issue ${generateRandomString(8)}`;
    const issueWithSearchableDescription = `Issue ${generateRandomString(8)}`;
    const searchableDescription = `Searchable description ${generateRandomString(8)}`;

    await addCommonIssue(page, searchableTitle);
    await addCommonIssue(page, nonSearchableTitle);
    await addCommonIssue(page, issueWithSearchableDescription, searchableDescription);

    await searchCommonIssues(page, "Searchable");
    await expectCommonIssueVisible(page, searchableTitle);
    await expectCommonIssueVisible(page, issueWithSearchableDescription);
    await expectCommonIssueNotVisible(page, nonSearchableTitle);

    await searchCommonIssues(page, "");
    await expectCommonIssueVisible(page, searchableTitle);
    await expectCommonIssueVisible(page, nonSearchableTitle);
    await expectCommonIssueVisible(page, issueWithSearchableDescription);
  });

});
