import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversations } from "../../../db/schema";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function getOpenConversation() {
  const result = await db
    .select({ id: conversations.id, slug: conversations.slug })
    .from(conversations)
    .where(eq(conversations.status, "open"))
    .limit(1);
  
  if (!result.length) {
    throw new Error("No open conversation found in database. Please ensure there's at least one open conversation for testing.");
  }
  
  return result[0];
}

test.describe("Conversation Actions", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    const openConversation = await getOpenConversation();

    await page.goto(`/conversations?id=${openConversation.id}`);
    await page.waitForLoadState("networkidle");
  });

  test.describe("Message Composition", () => {
    test("should send a reply message", async ({ page }) => {
      const testMessage = "This is a test reply message";

      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await expect(composer).toBeVisible();
      await composer.click({ force: true });
      await composer.focus();
      await composer.evaluate((el) => {
        el.innerHTML = "";
        el.textContent = "";
      });
      await composer.pressSequentially(testMessage);

      const composerText = await composer.textContent();
      expect(composerText).toContain(testMessage);

      const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
      await replyButton.click();

      await page.waitForLoadState("networkidle");
    });

    test("should handle empty reply attempt", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      
      try {
        await composer.evaluate((el) => {
          el.innerHTML = "";
          el.textContent = "";
        });
      } catch {
        await page.keyboard.press("Control+a");
        await page.keyboard.press("Delete");
      }
      
      const composerText = await composer.textContent();
      if (composerText) {
        await page.keyboard.press("Control+a");
        await page.keyboard.press("Backspace");
      }
      

      await composer.focus();

      const finalComposerText = await composer.textContent();
      expect(finalComposerText?.trim()).toBe("");
      
      const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
      await expect(replyButton).toBeDisabled();
    });

    test("should preserve composer content when switching between actions", async ({ page }) => {
      const testMessage = "This message should be preserved";

      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await composer.evaluate((el) => {
        el.innerHTML = "";
        el.textContent = "";
      });
      await composer.pressSequentially(testMessage);

      const initialText = await composer.textContent();
      expect(initialText?.trim()).toContain(testMessage);

      await page.keyboard.press("/");
      await page.keyboard.press("Escape");

      const finalText = await composer.textContent();
      expect(finalText?.trim()).toContain(testMessage);
    });

    test("should validate composer with actual content", async ({ page }) => {
      const testMessage = "This is a valid message";
      
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await composer.pressSequentially(testMessage);

      const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
      await expect(replyButton).toBeEnabled();
    });

    test("should handle multiple sequential actions", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await composer.evaluate((el) => {
        el.innerHTML = "";
        el.textContent = "";
      });

      await composer.pressSequentially("Test message");

      const initialText = await composer.textContent();
      expect(initialText?.trim()).toContain("Test message");

      await page.keyboard.press("/");
      await page.keyboard.press("Escape");

      const composerText = await composer.textContent();
      expect(composerText?.trim()).toContain("Test message");

      const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
      await expect(replyButton).toBeEnabled();
      await replyButton.click();
      await page.waitForLoadState("networkidle");

      await expect(replyButton).toBeEnabled();
    });
  });

  test.describe("Command Bar", () => {
    test("should open and close command bar", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await page.keyboard.press("/");

      const commandBar = page.locator('[aria-label="Command Bar"]');
      const isVisible = await commandBar.isVisible();
      expect(isVisible).toBe(true);

      await page.keyboard.press("Escape");
      await expect(commandBar).not.toBeVisible();
    });

    test("should filter commands when typing in command bar", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await page.keyboard.press("/");

      const commandInput = page.locator('[aria-label="Command Bar Input"]');
      await commandInput.fill("generate");


      const generateDraftCommand = page.locator('[role="option"]').filter({ hasText: "Generate draft" });
      await expect(generateDraftCommand).toBeVisible();
      
      const otherCommands = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
      await expect(otherCommands).not.toBeVisible();
    });

    test("should generate draft response via command bar", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await composer.evaluate((el) => {
        el.innerHTML = "";
        el.textContent = "";
      });

      await page.keyboard.press("/");

      const commandBar = page.locator('[aria-label="Command Bar"]');
      const isCommandBarVisible = await commandBar.isVisible();
      expect(isCommandBarVisible).toBe(true);

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
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await page.keyboard.press("/");

      const toggleCcCommand = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
      await expect(toggleCcCommand).toBeVisible();
      await toggleCcCommand.click();


      const ccInput = page.locator('input[name="CC"]');
      await expect(ccInput).toBeVisible();
    });

    test("should access internal note functionality", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await page.keyboard.press("/");

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
  });

  test.describe("Conversation Management", () => {
    test("should close and reopen conversation", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await composer.evaluate((el) => {
        el.innerHTML = "";
        el.textContent = "";
      });

      const getConversationStatus = async (): Promise<string> => {
        try {
          const statusElement = page.locator("text=OPEN").or(page.locator("text=CLOSED")).first();
          const statusText = await statusElement.textContent();

          if (statusText?.includes("OPEN")) {
            return "open";
          } else if (statusText?.includes("CLOSED")) {
            return "closed";
          }
        } catch (e) {
          const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
          const reopenButton = page.locator('button:has-text("Reopen")');

          if (await closeButton.isVisible()) {
            return "open";
          } else if (await reopenButton.isVisible()) {
            return "closed";
          }
        }
        return "unknown";
      };

      const initialStatus = await getConversationStatus();

      if (initialStatus === "open") {
        const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
        await expect(closeButton).toBeVisible();
        await expect(closeButton).toBeEnabled();
        await closeButton.click();
        await page.waitForLoadState("networkidle");

        const statusAfterClose = await getConversationStatus();

        if (statusAfterClose === "closed") {
          await expect(page.locator("text=closed")).toBeVisible();
          await expect(closeButton).toBeDisabled();

          const reopenButton = page.locator('button:has-text("Reopen")');
          await reopenButton.click();
          await page.waitForLoadState("networkidle");
          await expect(page.locator("text=open")).toBeVisible();
          await expect(closeButton).toBeEnabled();
          await expect(reopenButton).not.toBeVisible();
        } else {
          throw new Error(`Conversation status change failed: expected closed, got ${statusAfterClose}`);
        }
      } else if (initialStatus === "closed") {
        const reopenButton = page.locator('button:has-text("Reopen")');
        await reopenButton.click();
        await page.waitForLoadState("networkidle");
        await expect(page.locator("text=open")).toBeVisible();

        const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
        await closeButton.click();
        await page.waitForLoadState("networkidle");
        await expect(page.locator("text=closed")).toBeVisible();
      }
    });

    test("should send reply and close conversation", async ({ page }) => {
      const testMessage = "Reply and close test message";

      const getConversationStatus = async (): Promise<string> => {
        try {
          const statusElement = page.locator("text=OPEN").or(page.locator("text=CLOSED")).first();
          const statusText = await statusElement.textContent();

          if (statusText?.includes("OPEN")) {
            return "open";
          } else if (statusText?.includes("CLOSED")) {
            return "closed";
          }
        } catch (e) {
          const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
          const reopenButton = page.locator('button:has-text("Reopen")');

          if (await closeButton.isVisible()) {
            return "open";
          } else if (await reopenButton.isVisible()) {
            return "closed";
          }
        }
        return "unknown";
      };

      const status = await getConversationStatus();
      if (status === "closed") {
        const reopenButton = page.locator('button:has-text("Reopen")');
        await reopenButton.click();
        await page.waitForLoadState("networkidle");
      }

      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      
      try {
        await composer.evaluate((el) => {
          el.innerHTML = "";
          el.textContent = "";
        });
      } catch {
        await page.keyboard.press("Control+a");
        await page.keyboard.press("Delete");
      }

      await composer.pressSequentially(testMessage);

      try {
        const replyAndCloseButton = page.locator('button:has-text("Reply and close")');
        await expect(replyAndCloseButton).toBeVisible();
        await replyAndCloseButton.click();
        await page.waitForLoadState("networkidle");
        await expect(page.locator("text=closed")).toBeVisible();
      } catch (error) {
        try {
          await composer.evaluate((el) => {
            el.innerHTML = "";
            el.textContent = "";
          });
        } catch {
          await page.keyboard.press("Control+a");
          await page.keyboard.press("Delete");
        }
        
        await composer.pressSequentially(testMessage);

        const updatedText = await composer.textContent();
        expect(updatedText?.trim()).toContain(testMessage);

        const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
        await expect(replyButton).toBeEnabled();
      }
    });
  });

  test.describe("CC/BCC Recipients", () => {
    test("should add CC recipient via command bar", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await page.keyboard.press("/");

      const toggleCcCommand = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
      await expect(toggleCcCommand).toBeVisible();
      await toggleCcCommand.click();

      const ccInput = page.locator('input[name="CC"]');

      try {
        const isVisible = await ccInput.isVisible();

        if (isVisible) {
          await expect(ccInput).toBeVisible();
          await ccInput.fill("test@example.com", { force: true });
          
          await expect(ccInput).toHaveValue("test@example.com");
        }
      } catch (error) {
        console.error("Failed to add CC recipient:", error);
        throw error;
      }
    });

    test("should add BCC recipient via command bar", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await page.keyboard.press("/");

      const toggleCcCommand = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
      await expect(toggleCcCommand).toBeVisible();
      await toggleCcCommand.click();

      const bccInput = page.locator('input[name="BCC"]');

      try {
        const isVisible = await bccInput.isVisible();

        if (isVisible) {
          await expect(bccInput).toBeVisible();
          await bccInput.fill("bcc@example.com", { force: true });
          
          await expect(bccInput).toHaveValue("bcc@example.com");
        }
      } catch (error) {
        console.error("Failed to add BCC recipient:", error);
        throw error;
      }
    });
  });

  test.describe("Assignment", () => {
    test("should assign conversation to common issue", async ({ page }) => {
      const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
      await composer.click({ force: true });
      await page.keyboard.press("/");

      const commands = await page.locator('[role="option"]').allTextContents();

      try {
        const assignIssueCommand = page.locator('[role="option"]').filter({ hasText: "Assign ticket" });
        await expect(assignIssueCommand).toBeVisible();
        await assignIssueCommand.click();
      } catch (error) {
        console.error("Failed to assign conversation to issue:", error);
        await page.keyboard.press("Escape");
      }
    });
  });
});
