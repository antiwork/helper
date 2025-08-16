import { expect, test, type Page } from "@playwright/test";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function addCommonIssue(page: Page, title: string, description?: string) {
  await page.getByRole("button", { name: "Add Common Issue" }).click();
  await page.getByPlaceholder("e.g., Login Issues").fill(title);
  if (description) {
    await page.getByPlaceholder("Brief description of this issue group...").fill(description);
  }
  await page.getByRole("button", { name: "Save" }).click();
}

async function editCommonIssue(page: Page, currentTitle: string, newTitle: string, newDescription?: string) {
  const issueItem = page.getByTestId("common-issue-item").filter({ hasText: currentTitle });
  await issueItem.getByRole("button", { name: "Edit" }).click();

  await page.getByPlaceholder("e.g., Login Issues").fill(newTitle);
  if (newDescription !== undefined) {
    await page.getByPlaceholder("Brief description of this issue group...").fill(newDescription);
  }
  await page.getByRole("button", { name: "Save" }).click();
}

async function deleteCommonIssue(page: Page, title: string) {
  const issueItem = page.getByTestId("common-issue-item").filter({ hasText: title });
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

async function expectCommonIssueConversationCount(page: Page, title: string, count: number) {
  const issueItem = page.getByTestId("common-issue-item").filter({ hasText: title });
  const expectedText = count === 1 ? "1 conversation" : `${count} conversations`;
  await expect(issueItem.getByText(expectedText)).toBeVisible();
}

test.describe("Common Issues", () => {
  test.beforeEach(async ({ page }) => {
    await expect(page.getByText("Common Issues").first()).toBeVisible();
  });

  test("should create new common issues with form validation", async ({ page }) => {
    const titleOnlyIssue = `Test Issue ${generateRandomString(8)}`;
    const titleDescriptionIssue = `Test Issue with Description ${generateRandomString(8)}`;
    const testDescription = `This is a test description ${generateRandomString(8)}`;

    await page.getByRole("button", { name: "Add Common Issue" }).click();
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

    await page.getByPlaceholder("e.g., Login Issues").fill(titleOnlyIssue);
    await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();

    await page.getByRole("button", { name: "Save" }).click();
    await expectCommonIssueVisible(page, titleOnlyIssue);
    await expectCommonIssueConversationCount(page, titleOnlyIssue, 0);

    await addCommonIssue(page, titleDescriptionIssue, testDescription);
    await expectCommonIssueVisible(page, titleDescriptionIssue);
    const issueItem = page.getByTestId("common-issue-item").filter({ hasText: titleDescriptionIssue });
    await expect(issueItem.getByText(testDescription)).toBeVisible();
    await expectCommonIssueConversationCount(page, titleDescriptionIssue, 0);
  });

  test("should edit existing common issue title and description", async ({ page }) => {
    const originalTitle = `Original Issue ${generateRandomString(8)}`;
    const newTitle = `Updated Issue ${generateRandomString(8)}`;
    const originalDescription = `Original description ${generateRandomString(8)}`;
    const newDescription = `Updated description ${generateRandomString(8)}`;

    await addCommonIssue(page, originalTitle, originalDescription);
    await expectCommonIssueVisible(page, originalTitle);
    const issueItem = page.getByTestId("common-issue-item").filter({ hasText: originalTitle });
    await expect(issueItem.getByText(originalDescription)).toBeVisible();

    await editCommonIssue(page, originalTitle, newTitle);
    await expectCommonIssueVisible(page, newTitle);
    await expectCommonIssueNotVisible(page, originalTitle);

    await editCommonIssue(page, newTitle, newTitle, newDescription);
    await expectCommonIssueVisible(page, newTitle);
    const issueItem2 = page.getByTestId("common-issue-item").filter({ hasText: newTitle });
    await expect(issueItem2.getByText(newDescription)).toBeVisible();
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

    await page.getByPlaceholder("Search common issues...").fill("Searchable");
    await expectCommonIssueVisible(page, searchableTitle);
    await expectCommonIssueVisible(page, issueWithSearchableDescription);
    await expectCommonIssueNotVisible(page, nonSearchableTitle);

    await page.getByPlaceholder("Search common issues...").fill("");
    await expectCommonIssueVisible(page, searchableTitle);
    await expectCommonIssueVisible(page, nonSearchableTitle);
    await expectCommonIssueVisible(page, issueWithSearchableDescription);
  });
});
