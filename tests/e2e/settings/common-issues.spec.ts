import { expect, test } from "@playwright/test";
import { db } from "../../../db/client";
import { issueGroups } from "../../../db/schema";

const MOCKED_COMMON_ISSUES_SUGGESTIONS = [
  {
    title: "Outdated/Irrelevant Suggestions",
    description: "Reports that AI code suggestions recommend deprecated APIs, incorrect patterns, or irrelevant code.",
    reasoning:
      "Suggestion quality directly impacts trust and productivity; issues like deprecated APIs are likely to recur across languages and versions.",
  },
  {
    title: "Autocomplete Intrusiveness",
    description:
      "Complaints that auto-completion triggers too often, completes prematurely, or interrupts typing flow.",
    reasoning:
      "Overly aggressive behavior is a common friction point with AI assistants and tends to generate repeated requests to tune sensitivity.",
  },
];

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Settings - Common Issues", () => {
  test.beforeEach(async ({ page }) => {
    await db.delete(issueGroups);

    await page.route("**/api/trpc/lambda/mailbox.issueGroups.generateSuggestions*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            data: {
              json: {
                issues: MOCKED_COMMON_ISSUES_SUGGESTIONS,
              },
            },
          },
        }),
      });
    });
  });

  test.afterAll(async () => {
    // Clean database state
    await db.delete(issueGroups);
  });

  test("generate issues dialog actions and submit", async ({ page }) => {
    await page.goto("/settings/common-issues");
    await expect(page.getByText("No common issues created yet.")).toBeVisible();
    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    // 1. Check UI visibility
    await expect(page.getByText("No common issues created yet.")).toBeVisible();

    await expect(page.getByText("Review generated common issues")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByText("AI reasoning:").first()).toBeVisible();
    await expect(page.getByText("Suggestion quality directly impacts trust")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create 2 issues" })).toBeVisible();

    // 2. Remove generated item from the dialog
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByRole("button", { name: "Create 1 issue" })).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Review generated common issues")).not.toBeVisible();

    await generateButton.click();

    // 3.  Edit item from the dialog
    await page.getByLabel("Edit").first().click();
    await page.getByPlaceholder("Issue title").fill("Custom Issue Title");
    await page.getByPlaceholder("Issue description (optional)").fill("Custom description for this issue");
    await page.getByRole("button", { name: "Save" }).click();

    await page.getByRole("button", { name: "Create 2 issues" }).click();

    await expect(page.getByText("Created 2 common issues from your conversations")).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByText("Custom description for this issue")).toBeVisible();
  });
});
