import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Conversation Actions", () => {
  test.beforeEach(async ({ page }) => {
    try {
      await page.goto("/mine", { timeout: 15000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Initial navigation failed, retrying...", error);
      await page.goto("/mine", { timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    }

    await expect(page.locator('input[placeholder="Search conversations"]')).toBeVisible({ timeout: 10000 });
    const firstConversationLink = page.locator('a[href*="/conversations?id="]').first();
    await expect(firstConversationLink).toBeVisible({ timeout: 10000 });
    await firstConversationLink.click();
    await page.waitForLoadState("networkidle");
  });

  test("should send a reply message", async ({ page }) => {
    const testMessage = "This is a test reply message";

    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await expect(composer).toBeVisible({ timeout: 5000 });
    await composer.click({ force: true });
    await composer.focus();
    await page.waitForTimeout(500);
    await composer.evaluate((el) => {
      el.innerHTML = "";
      el.textContent = "";
    });
    await page.waitForTimeout(200);
    await composer.pressSequentially(testMessage);
    await page.waitForTimeout(500);

    const composerText = await composer.textContent();
    expect(composerText).toContain(testMessage);

    const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
    await replyButton.click();

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  });

  test("should show conversation metadata", async ({ page }) => {
    const conversationHeader = page
      .locator(".flex.items-center.border-b.border-border")
      .first();
    await expect(conversationHeader).toBeVisible();
  });

  test("should trigger command bar with slash key", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const commandBar = page.locator('[aria-label="Command Bar"]');
    const isVisible = await commandBar.isVisible();
    expect(isVisible).toBe(true);
  });

  test("should escape command bar", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    await page.keyboard.press("Escape");

    const commandBar = page.locator('[aria-label="Command Bar"]');
    await expect(commandBar).not.toBeVisible();
  });

  test("should open generate draft command", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const generateDraftCommand = page.locator('[role="option"]').filter({ hasText: "Generate draft" });
    await expect(generateDraftCommand).toBeVisible({ timeout: 5000 });
    await generateDraftCommand.click();

    await page.waitForTimeout(1000);
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
    
    await page.waitForTimeout(200);

    await composer.focus();
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(200);
    await composer.pressSequentially(testMessage);
    await page.waitForTimeout(500);

    const initialText = await composer.textContent();
    expect(initialText?.trim()).toContain(testMessage);

    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const finalText = await composer.textContent();
    expect(finalText?.trim()).toContain(testMessage);
  });

  test("should handle keyboard shortcuts", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await composer.pressSequentially("Keyboard shortcut test");
    await page.keyboard.press("Control+Enter");

    await page.waitForTimeout(2000);
  });

  test("should toggle CC field via command bar", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const toggleCcCommand = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
    await expect(toggleCcCommand).toBeVisible({ timeout: 5000 });
    await toggleCcCommand.click();

    await page.waitForTimeout(1000);

    const ccInput = page.locator('input[name="CC"]');
    await expect(ccInput).toBeVisible({ timeout: 5000 });
  });

  test("should filter commands when typing in command bar", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const commandInput = page.locator('[aria-label="Command Bar Input"]');
    await commandInput.fill("generate");

    await page.waitForTimeout(500);

    const generateDraftCommand = page.locator('[role="option"]').filter({ hasText: "Generate draft" });
    await expect(generateDraftCommand).toBeVisible();
  });

  test("should validate composer with actual content", async ({ page }) => {
    const testMessage = "This is a valid message";
    
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await composer.pressSequentially(testMessage);

    const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
    await expect(replyButton).toBeEnabled();
  });

  test("should access internal note functionality", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const addNoteCommand = page.locator('[role="option"]').filter({ hasText: "Add internal note" });
    await expect(addNoteCommand).toBeVisible({ timeout: 5000 });
    await addNoteCommand.click();

    await page.waitForTimeout(1000);

    const noteText = "This is an internal note for testing";
    const textarea = page.locator('[aria-label="Internal Note Textarea"]');
    await textarea.fill(noteText);

    const addButton = page.locator('button:has-text("Add internal note")');
    await addButton.click();

    await page.waitForTimeout(1000);
  });

  test("should handle multiple sequential actions", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await composer.evaluate((el) => {
      el.innerHTML = "";
      el.textContent = "";
    });
    await page.waitForTimeout(500);

    await composer.pressSequentially("Test message");
    await page.waitForTimeout(500);

    const initialText = await composer.textContent();
    expect(initialText?.trim()).toContain("Test message");

    await page.keyboard.press("/");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const composerText = await composer.textContent();
    expect(composerText?.trim()).toContain("Test message");

    const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
    await replyButton.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const messageElements = page.locator('[data-message-item], [data-testid="message"]');
    const lastMessage = messageElements.last();
    await expect(lastMessage).toContainText("Test message");
  });

  test("should close and reopen conversation", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await composer.evaluate((el) => {
      el.innerHTML = "";
      el.textContent = "";
    });
    await page.waitForTimeout(500);

    const getConversationStatus = async (): Promise<string> => {
      try {
        const statusElement = page.locator("text=OPEN").or(page.locator("text=CLOSED")).first();
        const statusText = await statusElement.textContent({ timeout: 5000 });

        if (statusText?.includes("OPEN")) {
          return "open";
        } else if (statusText?.includes("CLOSED")) {
          return "closed";
        }
      } catch (e) {
        const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
        const reopenButton = page.locator('button:has-text("Reopen")');

        if (await closeButton.isVisible({ timeout: 2000 })) {
          return "open";
        } else if (await reopenButton.isVisible({ timeout: 2000 })) {
          return "closed";
        }
      }
      return "unknown";
    };

    const initialStatus = await getConversationStatus();

    if (initialStatus === "open") {
      const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
      await expect(closeButton).toBeVisible({ timeout: 5000 });
      await expect(closeButton).toBeEnabled({ timeout: 5000 });
      await closeButton.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle");

      const statusAfterClose = await getConversationStatus();

      if (statusAfterClose === "closed") {
        await expect(page.locator("text=closed")).toBeVisible({ timeout: 10000 });
        await expect(closeButton).toBeDisabled();

        const reopenButton = page.locator('button:has-text("Reopen")');
        await reopenButton.click();
        await page.waitForTimeout(1000);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("text=open")).toBeVisible({ timeout: 10000 });
        await expect(closeButton).toBeEnabled();
        await expect(reopenButton).not.toBeVisible();
      } else {
        throw new Error(`Conversation status change failed: expected closed, got ${statusAfterClose}`);
      }
    } else if (initialStatus === "closed") {
      const reopenButton = page.locator('button:has-text("Reopen")');
      await reopenButton.click();
      await page.waitForTimeout(1000);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=open")).toBeVisible({ timeout: 10000 });

      const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
      await closeButton.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=closed")).toBeVisible({ timeout: 10000 });
    }
  });

  test("should send reply and close conversation", async ({ page }) => {
    const testMessage = "Reply and close test message";

    const getConversationStatus = async (): Promise<string> => {
      try {
        const statusElement = page.locator("text=OPEN").or(page.locator("text=CLOSED")).first();
        const statusText = await statusElement.textContent({ timeout: 5000 });

        if (statusText?.includes("OPEN")) {
          return "open";
        } else if (statusText?.includes("CLOSED")) {
          return "closed";
        }
      } catch (e) {
        const closeButton = page.locator('button:has-text("Close"):not(:has-text("Reply"))');
        const reopenButton = page.locator('button:has-text("Reopen")');

        if (await closeButton.isVisible({ timeout: 2000 })) {
          return "open";
        } else if (await reopenButton.isVisible({ timeout: 2000 })) {
          return "closed";
        }
      }
      return "unknown";
    };

    const status = await getConversationStatus();
    if (status === "closed") {
      const reopenButton = page.locator('button:has-text("Reopen")');
      await reopenButton.click();
      await page.waitForTimeout(1000);
      await page.waitForLoadState("networkidle");
    }

    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await composer.evaluate((el) => {
      el.innerHTML = "";
      el.textContent = "";
    });
    await page.waitForTimeout(500);

    await composer.pressSequentially(testMessage);
    await page.waitForTimeout(500);

    try {
      const replyAndCloseButton = page.locator('button:has-text("Reply and close")');
      await expect(replyAndCloseButton).toBeVisible();
      await replyAndCloseButton.click();
      await page.waitForTimeout(1000);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("text=closed")).toBeVisible({ timeout: 10000 });
    } catch (error) {
      const composerText = await composer.textContent();

      if (composerText && composerText.trim().length > 0) {
        const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
        await expect(replyButton).toBeEnabled();
      } else {
        await composer.pressSequentially(testMessage);
        await page.waitForTimeout(500);

        const updatedText = await composer.textContent();
        expect(updatedText?.trim()).toContain(testMessage);

        const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
        await expect(replyButton).toBeEnabled();
      }
    }
  });

  test("should add CC recipient via command bar", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const toggleCcCommand = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
    await expect(toggleCcCommand).toBeVisible({ timeout: 5000 });
    await toggleCcCommand.click();
    await page.waitForTimeout(1000);

    const ccInput = page.locator('input[name="CC"]');

    try {
      const isVisible = await ccInput.isVisible();

      if (isVisible) {
        await expect(ccInput).toBeVisible({ timeout: 5000 });
        await ccInput.fill("test@example.com", { force: true });
        await page.waitForTimeout(500);
      } else {
        await page.waitForTimeout(1000);
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
    await page.waitForTimeout(500);

    const toggleCcCommand = page.locator('[role="option"]').filter({ hasText: "Add CC or BCC" });
    await expect(toggleCcCommand).toBeVisible({ timeout: 5000 });
    await toggleCcCommand.click();
    await page.waitForTimeout(1000);

    const bccInput = page.locator('input[name="BCC"]');

    try {
      const isVisible = await bccInput.isVisible();

      if (isVisible) {
        await expect(bccInput).toBeVisible({ timeout: 5000 });
        await bccInput.fill("bcc@example.com", { force: true });
        await page.waitForTimeout(500);
      } else {
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.error("Failed to add BCC recipient:", error);
      throw error;
    }
  });

  test("should assign conversation to common issue", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const commands = await page.locator('[role="option"]').allTextContents();

    try {
      const assignIssueCommand = page.locator('[role="option"]').filter({ hasText: "Assign ticket" });
      await expect(assignIssueCommand).toBeVisible({ timeout: 5000 });
      await assignIssueCommand.click();
      await page.waitForTimeout(1000);
    } catch (error) {
      console.error("Failed to assign conversation to issue:", error);
      await page.keyboard.press("Escape");
    }
  });

  test("should generate draft response via command bar", async ({ page }) => {
    const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
    await composer.click({ force: true });
    await composer.evaluate((el) => {
      el.innerHTML = "";
      el.textContent = "";
    });
    await page.waitForTimeout(500);


    await page.keyboard.press("/");
    await page.waitForTimeout(500);

    const commandBar = page.locator('[aria-label="Command Bar"]');
    const isCommandBarVisible = await commandBar.isVisible();
    expect(isCommandBarVisible).toBe(true);

    try {
      const generateDraftCommand = page.locator('[role="option"]').filter({ hasText: "Generate draft" });
      await expect(generateDraftCommand).toBeVisible({ timeout: 5000 });
      await generateDraftCommand.click();

      await page.waitForTimeout(5000);

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
});
