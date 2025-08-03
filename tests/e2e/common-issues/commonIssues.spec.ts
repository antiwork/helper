import { test } from "@playwright/test";
import { CommonIssuesPage } from "../utils/page-objects/commonIssuesPage";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Common Issues", () => {
  let commonIssuesPage: CommonIssuesPage;

  test.beforeEach(async ({ page }) => {
    commonIssuesPage = new CommonIssuesPage(page);
    await commonIssuesPage.navigateToCommonIssues();
  });

  test("should create new common issue with title only", async () => {
    const testTitle = `Test Issue ${generateRandomString(8)}`;

    await commonIssuesPage.addCommonIssue(testTitle);
    await commonIssuesPage.expectCommonIssueVisible(testTitle);
    await commonIssuesPage.expectCommonIssueConversationCount(testTitle, 0);
  });

  test("should create new common issue with title and description", async () => {
    const testTitle = `Test Issue with Description ${generateRandomString(8)}`;
    const testDescription = `This is a test description ${generateRandomString(8)}`;

    await commonIssuesPage.addCommonIssue(testTitle, testDescription);
    await commonIssuesPage.expectCommonIssueVisible(testTitle);
    await commonIssuesPage.expectCommonIssueDescription(testTitle, testDescription);
    await commonIssuesPage.expectCommonIssueConversationCount(testTitle, 0);
  });

  test("should edit existing common issue title", async () => {
    const originalTitle = `Original Issue ${generateRandomString(8)}`;
    const newTitle = `Updated Issue ${generateRandomString(8)}`;

    await commonIssuesPage.addCommonIssue(originalTitle);
    await commonIssuesPage.expectCommonIssueVisible(originalTitle);

    await commonIssuesPage.editCommonIssue(originalTitle, newTitle);
    await commonIssuesPage.expectCommonIssueVisible(newTitle);
    await commonIssuesPage.expectCommonIssueNotVisible(originalTitle);
  });

  test("should edit existing common issue description", async () => {
    const testTitle = `Issue for Description Edit ${generateRandomString(8)}`;
    const originalDescription = `Original description ${generateRandomString(8)}`;
    const newDescription = `Updated description ${generateRandomString(8)}`;

    await commonIssuesPage.addCommonIssue(testTitle, originalDescription);
    await commonIssuesPage.expectCommonIssueVisible(testTitle);

    await commonIssuesPage.editCommonIssue(testTitle, testTitle, newDescription);
    await commonIssuesPage.expectCommonIssueVisible(testTitle);
    await commonIssuesPage.expectCommonIssueDescription(testTitle, newDescription);
  });

  test("should delete common issue", async () => {
    const testTitle = `Issue to Delete ${generateRandomString(8)}`;

    await commonIssuesPage.addCommonIssue(testTitle);
    await commonIssuesPage.expectCommonIssueVisible(testTitle);

    await commonIssuesPage.deleteCommonIssue(testTitle);
    await commonIssuesPage.expectCommonIssueNotVisible(testTitle);
  });

  test("should search common issues", async () => {
    const searchableTitle = `Searchable Issue ${generateRandomString(8)}`;
    const nonSearchableTitle = `Different Issue ${generateRandomString(8)}`;

    await commonIssuesPage.addCommonIssue(searchableTitle);
    await commonIssuesPage.addCommonIssue(nonSearchableTitle);

    await commonIssuesPage.searchCommonIssues("Searchable");
    await commonIssuesPage.expectCommonIssueVisible(searchableTitle);
    await commonIssuesPage.expectCommonIssueNotVisible(nonSearchableTitle);

    await commonIssuesPage.searchCommonIssues("");
    await commonIssuesPage.expectCommonIssueVisible(searchableTitle);
    await commonIssuesPage.expectCommonIssueVisible(nonSearchableTitle);
  });

  test("should search common issues by description", async () => {
    const testTitle = `Issue ${generateRandomString(8)}`;
    const searchableDescription = `Searchable description ${generateRandomString(8)}`;

    await commonIssuesPage.addCommonIssue(testTitle, searchableDescription);

    await commonIssuesPage.searchCommonIssues("Searchable");
    await commonIssuesPage.expectCommonIssueVisible(testTitle);
  });

  test("should disable save button when title is empty", async () => {
    await commonIssuesPage.openAddIssueForm();
    await commonIssuesPage.expectSaveButtonDisabled();

    await commonIssuesPage.fillIssueTitle("Test Title");
    await commonIssuesPage.expectSaveButtonEnabled();
  });
});
