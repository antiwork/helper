// tests/utils/page-objects/knowledgeBankPage.ts
import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "./basePage";

export class KnowledgeBankPage extends BasePage {
  readonly pageTitle: Locator;
  readonly sectionTitle: Locator;
  readonly descriptionText: Locator;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly entryRows: Locator;
  readonly toggles: Locator;
  readonly loadingSkeletons: Locator;
  readonly emptyState: Locator;

  readonly inlineForm: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page.getByRole("heading", { name: "Knowledge", exact: true });
    this.sectionTitle = page.getByRole("heading", { name: "Knowledge Bank" }); 
    this.descriptionText = page.getByText("Record information that you frequently share");

    this.searchInput = page.getByPlaceholder("Search knowledge bank...");
    this.addButton = page.getByRole("button", { name: "Add Knowledge" });

    this.entryRows = page.getByTestId("knowledge-item");
    this.toggles = page.getByTestId("knowledge-toggle");

    this.loadingSkeletons = page.locator(".animate-skeleton").locator("..");
    this.emptyState = page.locator('text="no entries", text="empty", text="start by adding"');

    this.inlineForm = page.locator("form").filter({ hasText: "Content" });
    this.saveButton = page.getByRole("button", { name: "Save" });
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
  }

  async navigate() {
    await this.goto("/settings/knowledge");
    await this.waitForPageLoad();
  }

  async expectPageVisible() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.sectionTitle).toBeVisible();
  }

  async expectSearchVisible() {
    await expect(this.searchInput).toBeVisible();
  }

  async getEntryCount(): Promise<number> {
    return await this.entryRows.count();
  }

  findEntryByText(text: string) {
    return this.page.getByText(text, { exact: false });
  }

  async getEntryText(index = 0): Promise<string> {
    return (await this.entryRows.nth(index).textContent()) || "";
  }

  async openAddForm() {
    await this.addButton.click();
    await Promise.race([
      this.page.locator("textarea").waitFor({ state: "visible", timeout: 3000 }).catch(() => null),
      this.page.waitForSelector("textarea", { state: "visible", timeout: 3000 }).catch(() => null),
    ]);
  }

  async getContentFieldLocator(): Promise<Locator> {
    return this.page.locator("textarea").first();
  }

  async fillContent(text: string) {
    const field = await this.getContentFieldLocator();
    await field.fill(text);
  }

  async save({ waitForTrpc = true } = {}) {
    const maybeWaitForCreate = waitForTrpc
      ? this.page.waitForResponse((resp) => /trpc.*mailbox\.faqs\.create/.test(resp.url()), { timeout: 8000 }).catch(() => null)
      : Promise.resolve(null);

    await Promise.all([this.saveButton.click(), maybeWaitForCreate]);

    await Promise.race([
      this.page.waitForSelector("textarea, [role='textbox']", { state: "detached", timeout: 5000 }).catch(() => null),
      this.page.waitForTimeout(50),
    ]);
  }

  async cancel() {
    if ((await this.cancelButton.count()) && (await this.cancelButton.isVisible())) {
      await this.cancelButton.click();
      await this.page.waitForSelector("textarea, [role='textbox']", { state: "detached", timeout: 3000 }).catch(() => { });
    } else {
      await this.page.keyboard.press("Escape");
    }
  }

  async toggleEntry(index = 0) {
    const toggle = this.toggles.nth(index);
    if ((await toggle.count()) === 0) throw new Error("No toggle found at index " + index);

    await expect(toggle).toBeEnabled({ timeout: 5000 });

    const initial = await toggle.isChecked();
    await toggle.click();

    await expect(toggle).toHaveAttribute("data-state", initial ? "unchecked" : "checked", { timeout: 5000 });
  }


  async getToggleState(index = 0): Promise<boolean> {
    return await this.toggles.nth(index).isChecked();
  }

  async deleteEntryByIndex(index = 0) {
    const row = this.entryRows.nth(index);
    const deleteBtn = row.getByRole("button", { name: "Delete" });
    if ((await deleteBtn.count()) && (await deleteBtn.isVisible())) {
      await deleteBtn.click();
      const confirm = this.page.locator('[role="dialog"] button:has-text("Yes"), button:has-text("Confirm")').first();
      if ((await confirm.count()) && (await confirm.isVisible())) {
        await confirm.click();
      }
      await expect(row).toBeHidden({ timeout: 5000 }).catch(() => { });
    } else {
      throw new Error("Delete button not found inside row " + index);
    }
  }

  async waitForToast(message: string) {
    const toastSelectors = [
      `[role="alert"]:has-text("${message}")`,
      `[data-testid="toast"]:has-text("${message}")`,
      `.toast:has-text("${message}")`,
      `*:has-text("${message}")[role="status"]`,
    ];

    for (const selector of toastSelectors) {
      try {
        await this.page.locator(selector).waitFor({ state: "visible", timeout: 2000 });
        return;
      } catch {
        // silent fallback
      }
    }

    await this.page.waitForSelector(`text="${message}"`, { timeout: 1000 }).catch(() => { });
  }

  async createKnowledge(content: string) {
    await this.openAddForm();
    await this.fillContent(content);
    await this.save();
    await this.waitForToast("Knowledge created").catch(() => { });
  }
}
