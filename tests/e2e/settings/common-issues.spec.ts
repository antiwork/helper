import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversationMessages, conversations, issueGroups } from "../../../db/schema";

test.describe("Common Issues Settings", () => {
  test.beforeEach(async ({ page }) => {
    await db.delete(issueGroups);
    await db.delete(conversationMessages);
    await db.delete(conversations);
  });

  test("shows generate button in empty state", async ({ page }) => {
    await page.goto("/settings/common-issues");

    await expect(page.getByText("No common issues created yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate common issues" })).toBeVisible();
  });

  test("generate button is disabled when no conversations exist", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("No common issues could be generated")).toBeVisible();
  });

  test("shows approval dialog when issues are generated", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create \d+ issue/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("can edit generated issue titles and descriptions", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();

    const editButton = page.locator("button").filter({ hasText: "Edit" }).first();
    await editButton.click();

    const titleInput = page.getByPlaceholder("Issue title");
    await titleInput.fill("Custom Issue Title");

    const descriptionTextarea = page.getByPlaceholder("Issue description (optional)");
    await descriptionTextarea.fill("Custom description for this issue");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Custom Issue Title")).toBeVisible();
    await expect(page.getByText("Custom description for this issue")).toBeVisible();
  });

  test("can delete generated issues from approval dialog", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();

    const initialCreateButton = page.getByRole("button", { name: /Create \d+ issue/ });
    const initialText = await initialCreateButton.textContent();
    const initialCount = parseInt(initialText?.match(/\d+/)?.[0] || "0");

    const deleteButton = page.locator("button").filter({ hasText: "Delete" }).first();
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
    expect(issuesInDb.length).toBeGreaterThan(0);
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

  test("shows loading states correctly", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Generating...")).toBeVisible();

    await expect(page.getByText("Review generated common issues")).toBeVisible();

    const createButton = page.getByRole("button", { name: /Create \d+ issue/ });
    await createButton.click();

    await expect(page.getByText("Creating...")).toBeVisible();
  });

  test("hides generate button when issues exist", async ({ page }) => {
    await db.insert(issueGroups).values({
      title: "Existing Issue",
      description: "An existing issue",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await page.goto("/settings/common-issues");

    await expect(page.getByText("No common issues created yet.")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Generate common issues" })).not.toBeVisible();
    await expect(page.getByText("Existing Issue")).toBeVisible();
  });
});
