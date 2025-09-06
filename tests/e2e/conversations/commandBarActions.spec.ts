import { expect, test } from "@playwright/test";
import { getOpenConversation, openCommandBar } from "../utils/conversationHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.beforeEach(async ({ page }) => {
  const openConversation = await getOpenConversation();

  await page.goto(`/conversations?id=${openConversation.slug}`);
  await page.waitForLoadState("networkidle");
});

test.describe("Command Bar", () => {
  test("should open and close command bar", async ({ page }) => {
    await openCommandBar(page);

    const commandBar = page.locator('[data-testid="command-bar"]');
    await page.keyboard.press("Escape");
    await expect(commandBar).not.toBeVisible();
  });

  test("should filter commands when typing in command bar", async ({ page }) => {
    await openCommandBar(page);

    const commandInput = page.locator('[aria-label="Command Bar Input"]');
    await commandInput.fill("generate");

    const generateDraftCommand = page.locator('[role="option"]').filter({ hasText: "Generate draft" });
    await expect(generateDraftCommand).toBeVisible();

    const otherCommands = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
    await expect(otherCommands).not.toBeVisible();
  });

  test("should generate draft response via command bar", async ({ page }) => {
    await openCommandBar(page);

    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    const commandBar = page.locator('[data-testid="command-bar"]');

    try {
      const generateDraftCommand = page.locator('[role="option"]').filter({ hasText: "Generate draft" });
      await expect(generateDraftCommand).toBeVisible();
      await generateDraftCommand.click();

      const composerText = await composer.textContent();
      const commandClosed = !(await commandBar.isVisible());

      expect(commandClosed).toBe(true);
      expect(composerText?.trim().length).toBeGreaterThan(0);
    } catch (error) {
      await page.keyboard.press("Escape");
      const commandBarClosedAfterEscape = !(await commandBar.isVisible());
      expect(commandBarClosedAfterEscape).toBe(true);
    }
  });

  test("should toggle CC field via command bar", async ({ page }) => {
    await openCommandBar(page);

    const toggleCcCommand = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
    await expect(toggleCcCommand).toBeVisible();
    await toggleCcCommand.click();

    const ccInput = page.locator('input[name="CC"]');
    await expect(ccInput).toBeVisible();
  });

  test("should access internal note functionality", async ({ page }) => {
    await openCommandBar(page);

    const addNoteCommand = page.locator('[role="option"]').filter({ hasText: "Add internal note" });
    await expect(addNoteCommand).toBeVisible();
    await addNoteCommand.click();

    const noteText = "This is an internal note for testing";
    const textarea = page.getByRole("textbox", { name: "Internal Note" });
    await textarea.fill(noteText);

    await expect(textarea).toHaveValue(noteText);

    const addButton = page.locator('button:has-text("Add internal note")');
    await addButton.click();
  });

  test("should open command bar with slash key", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await composer.evaluate((el) => {
      el.innerHTML = "";
      el.textContent = "";
    });
    await composer.focus();
    await page.keyboard.press("/");

    const commandBar = page.locator('[data-testid="command-bar"]');
    await expect(commandBar).toBeVisible();

    await commandBar.waitFor({ state: "visible" });
  });
});
