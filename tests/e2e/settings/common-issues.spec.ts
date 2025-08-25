import { expect, test } from "@playwright/test";
import { takeUniqueOrThrow } from "../../../components/utils/arrays";
import { db } from "../../../db/client";
import { conversationMessages, conversations, issueGroups } from "../../../db/schema";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Common Issues Settings", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async () => {
    await db.delete(issueGroups);
    await db.delete(conversationMessages);
    await db.delete(conversations);

    for (let i = 1; i <= 5; i++) {
      const conversation = await db
        .insert(conversations)
        .values({
          subject: `Test Issue ${i}: ${i % 2 === 0 ? "Login problems" : "Payment issues"}`,
          status: (i % 2 === 0 ? "open" : "closed") as "open" | "closed" | "spam",
          emailFrom: `user${i}@example.com`,
          conversationProvider: "gmail" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      await db.insert(conversationMessages).values({
        conversationId: conversation.id,
        role: "user" as const,
        cleanedUpText: `I'm having trouble with ${i % 2 === 0 ? "logging into my account" : "payment processing"}. The error message says ${i % 2 === 0 ? "invalid credentials" : "payment failed"}.`,
        body: `<p>I'm having trouble with ${i % 2 === 0 ? "logging into my account" : "payment processing"}. The error message says ${i % 2 === 0 ? "invalid credentials" : "payment failed"}.</p>`,
        status: "sent" as const,
        isPerfect: false,
        isFlaggedAsBad: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (i <= 3) {
        await db.insert(conversationMessages).values({
          conversationId: conversation.id,
          role: "staff" as const,
          cleanedUpText: `Thank you for contacting support. Let me help you with your ${i % 2 === 0 ? "login issue" : "payment problem"}.`,
          body: `<p>Thank you for contacting support. Let me help you with your ${i % 2 === 0 ? "login issue" : "payment problem"}.</p>`,
          status: "sent" as const,
          isPerfect: false,
          isFlaggedAsBad: false,
          createdAt: new Date(Date.now() + 1000), // 1 second later
          updatedAt: new Date(),
        });
      }
    }
  });

  test("shows generate button in empty state", async ({ page }) => {
    await page.goto("/settings/common-issues");

    await expect(page.getByText("No common issues created yet.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate common issues" })).toBeVisible();
  });

  test("shows error when no conversations exist", async ({ page }) => {
    await db.delete(conversationMessages);
    await db.delete(conversations);

    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("No common issues could be generated from existing conversations")).toBeVisible();
  });

  test("generate button works with existing conversations", async ({ page }) => {
    await page.goto("/settings/common-issues");

    const generateButton = page.getByRole("button", { name: "Generate common issues" });
    await generateButton.click();

    await expect(page.getByText("Review generated common issues")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create 5 issues" })).toBeVisible();
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

    const editButton = page.getByRole("button", { name: "Edit" }).first();
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

    const deleteButton = page.getByRole("button", { name: "Delete" }).first();
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
    expect(issuesInDb.length).toBe(5);
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
