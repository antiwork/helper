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

test.describe("Common Issues Settings", () => {
  test.describe.configure({ mode: "serial" });
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

  test("generate button works with existing conversations", async ({ page }) => {
    await page.goto("/settings/common-issues");

    await expect(page.getByText("No common issues created yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate common issues" })).toBeVisible();

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create 2 issues" })).toBeVisible();
  });

  test("shows approval dialog when issues are generated", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create \d+ issue/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    await expect(page.getByText("AI reasoning:").first()).toBeVisible();
    await expect(page.getByText(/Suggestion quality directly impacts trust/)).toBeVisible();
  });

  test("can edit generated issue titles and descriptions", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();

    const editButton = page.getByLabel("Edit").first();
    await editButton.click();

    const titleInput = page.getByPlaceholder("Issue title");
    await titleInput.fill("Custom Issue Title");

    const descriptionTextarea = page.getByPlaceholder("Issue description (optional)");
    await descriptionTextarea.fill("Custom description for this issue");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Custom Issue Title")).toBeVisible();
    await expect(page.getByText("Custom description for this issue")).toBeVisible();

    await expect(page.getByText(/Suggestion quality directly impacts trust/)).toBeVisible();
  });

  test("can delete generated issues from approval dialog", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();

    const initialCreateButton = page.getByRole("button", { name: /Create \d+ issue/ });
    const initialText = await initialCreateButton.textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || "0");

    const deleteButton = page.getByLabel("Delete").first();
    await deleteButton.click();

    const updatedCreateButton = page.getByRole("button", { name: /Create \d+ issue/ });
    const updatedText = await updatedCreateButton.textContent();
    const updatedCount = parseInt(updatedText?.match(/\d+/)?.[0] || "0");

    expect(updatedCount).toBe(initialCount - 1);
  });

  test("creates issues when approved", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();

    const createButton = page.getByRole("button", { name: /Create \d+ issue/ });
    await createButton.click();

    await expect(page.getByText(/Created \d+ common issues/)).toBeVisible();

    const issuesInDb = await db.select().from(issueGroups);
    expect(issuesInDb.length).toBe(2);
  });

  test("can cancel approval dialog", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("Review generated common issues")).not.toBeVisible();
    await expect(page.getByText("No common issues created yet.")).toBeVisible();
  });
});
