import { expect, Page } from "@playwright/test";

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = "") {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { timeout });
  }

  async clickElement(selector: string) {
    await this.page.click(selector);
  }

  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async getText(selector: string): Promise<string> {
    return (await this.page.textContent(selector)) || "";
  }

  async isVisible(selector: string): Promise<boolean> {
    return await this.page.isVisible(selector);
  }

  async expectVisible(selector: string) {
    await expect(this.page.locator(selector)).toBeVisible();
  }

  async expectNotVisible(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async expectText(selector: string, text: string | RegExp) {
    await expect(this.page.locator(selector)).toContainText(text);
  }

  async takeScreenshot(name: string) {
    const { ensureDirectoryExists } = await import("../test-helpers");
    await ensureDirectoryExists("tests/e2e/screenshots");
    await this.page.screenshot({ path: `tests/e2e/screenshots/${name}.png` });
  }

  async selectFromDropdown(selector: string, value: string) {
    await this.page.selectOption(selector, value);
  }

  async uploadFile(selector: string, filePath: string) {
    await this.page.setInputFiles(selector, filePath);
  }

  async waitForNavigation(urlPattern?: RegExp) {
    if (urlPattern) {
      await this.page.waitForURL(urlPattern);
    } else {
      await this.page.waitForNavigation();
    }
  }

  async scrollToElement(selector: string) {
    await this.page.locator(selector).scrollIntoViewIfNeeded();
  }
}
