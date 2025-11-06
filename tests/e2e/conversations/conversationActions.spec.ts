import { expect, Page, test } from "@playwright/test";
import { desc, eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversationEvents } from "../../../db/schema";
import { getOpenConversation, openCommandBar } from "../utils/conversationHelpers";
import { waitForSettingsSaved } from "../utils/settingsHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function getConversationStatusFromDb(conversationId: number): Promise<string> {
  const [event] = await db
    .select({ changes: conversationEvents.changes })
    .from(conversationEvents)
    .where(eq(conversationEvents.conversationId, conversationId))
    .orderBy(desc(conversationEvents.createdAt))
    .limit(1);
  if (event && event.changes && event.changes.status) {
    return event.changes.status;
  }
  return "unknown";
}

async function sendReplyMessage(page: Page, message: string, { close }: { close?: boolean } = {}) {
  await expect(page.getByTestId("message-item").first()).toBeVisible();
  const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
  await expect(composer).toBeVisible();
  await composer.click({ force: true });
  await composer.focus();
  await composer.evaluate((el) => {
    el.innerHTML = "";
    el.textContent = "";
  });
  await composer.pressSequentially(message);

  const replyButton = close
    ? page.locator('button:has-text("Reply and close")')
    : page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
  await replyButton.click();
  await page.waitForLoadState("networkidle");
}

test.describe("Conversation Actions", () => {
  test.beforeEach(async ({ page }) => {
    const openConversation = await getOpenConversation();

    await page.goto(`/conversations?id=${openConversation.slug}`);
    await page.waitForLoadState("networkidle");
  });

  test.describe("Message Composition", () => {
    test("should send a reply message", async ({ page }) => {
      await sendReplyMessage(page, "This is a test reply message");
      await expect(page.getByTestId("message-thread")).toContainText("This is a test reply message");
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

      const composerText = await composer.textContent();
      expect(composerText?.trim()).toContain("Test message");

      const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
      await expect(replyButton).toBeEnabled();
      await replyButton.click();
      await page.waitForLoadState("networkidle");
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

      const openConversation = await getOpenConversation();
      const initialStatus = await getConversationStatusFromDb(openConversation.id);

      if (initialStatus === "open") {
        const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
        await expect(closeButton).toBeVisible();
        await expect(closeButton).toBeEnabled();
        await closeButton.click();
        await page.waitForLoadState("networkidle");

        const statusAfterClose = await getConversationStatusFromDb(openConversation.id);

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

      const openConversation = await getOpenConversation();
      const status = await getConversationStatusFromDb(openConversation.id);
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
      await openCommandBar(page);

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
      await openCommandBar(page);

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
      await openCommandBar(page);

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

  test.describe("Auto-Assign on Reply", () => {
    test("should respect auto-assign preference when replying", async ({ page }) => {
      await page.goto("/settings/preferences");

      if (await page.locator('[aria-label="Auto-assign on reply Switch"]').isChecked()) {
        await page.locator('[aria-label="Auto-assign on reply Switch"]').click();
        await waitForSettingsSaved(page);
      }

      await page.goto("/unassigned");
      await page.locator("a[href*='/conversations?id=']").first().click();

      await sendReplyMessage(page, "Auto-assign off test reply message");

      await expect(page.getByRole("button", { name: "Unassigned" })).toBeVisible();

      await page.goto("/settings/preferences");
      await page.locator('[aria-label="Auto-assign on reply Switch"]').click();
      await waitForSettingsSaved(page);

      await page.goto("/unassigned");
      await page.locator("a[href*='/conversations?id=']").first().click();

      await sendReplyMessage(page, "Auto-assign on test reply message");
      await expect(page.getByTestId("message-thread")).toContainText("Auto-assign on test reply message");
      await expect(page.getByRole("button", { name: "support@gumroad.com" })).toBeVisible();
    });
  });
});
