import { expect, Page } from "@playwright/test";
import { waitForToast } from "../toastHelpers";

interface TestWebsite {
  name: string;
  url: string;
}

export class WebsiteLearningPage {
  protected page: Page;
  private readonly websiteLearningTitle = 'h2:has-text("Website Learning")';
  private readonly websiteDescription =
    'text="Helper will learn about your product by reading your websites to provide better responses."';
  private readonly addWebsiteButton = 'button:has-text("Add website")';
  private readonly urlInput = "input#url";
  private readonly urlLabel = 'label[for="url"]';
  private readonly cancelButton = 'button:has-text("Cancel")';
  private readonly submitButton = 'form button[type="submit"]';
  private readonly websiteItems = '[data-testid="website-item"]';
  private readonly externalLinks = 'a[target="_blank"]';

  constructor(page: Page) {
    this.page = page;
  }

  async navigateToKnowledgeSettings() {
    await this.page.goto("/settings/knowledge");
    await this.page.waitForLoadState("networkidle");
  }

  async expectWebsiteLearningSection() {
    await expect(this.page.locator(this.websiteLearningTitle)).toBeVisible();
    await expect(this.page.locator(this.websiteDescription)).toBeVisible();
  }

  async expectAddWebsiteButton() {
    await expect(this.page.locator(this.addWebsiteButton)).toBeVisible();
  }

  async expectAddWebsiteForm() {
    await expect(this.page.locator(this.urlLabel)).toBeVisible();
    await expect(this.page.locator(this.urlInput)).toBeVisible();
    await expect(this.page.locator(this.cancelButton)).toBeVisible();
    await expect(this.page.locator(this.submitButton)).toBeVisible();
  }

  async expectFormHidden() {
    await expect(this.page.locator(this.urlInput)).not.toBeVisible();
  }

  async clickAddWebsite() {
    await this.page.locator(this.addWebsiteButton).click();
    await this.page.waitForTimeout(500);
  }

  async fillWebsiteUrl(url: string) {
    await this.page.locator(this.urlInput).fill(url);
  }

  async submitAddWebsiteForm() {
    await this.page.locator(this.submitButton).click();
    await this.page.waitForLoadState("networkidle");
  }

  async cancelAddWebsiteForm() {
    await this.page.locator(this.cancelButton).click();
  }

  async expectUrlValidationError(expectedError: string) {
    await expect(this.page.getByText(expectedError)).toBeVisible();
  }

  generateTestWebsite(): TestWebsite {
    const timestamp = Date.now();
    const url = `https://test-${timestamp}.example.com`;
    const name = `test-${timestamp}.example.com`;
    return { name, url };
  }

  async expectToastMessage(message: string) {
    await waitForToast(this.page, message);
  }

  async expectWebsiteInList(websiteName: string) {
    const websiteItem = this.page.locator(this.websiteItems).filter({
      has: this.page.locator(`text="${websiteName}"`),
    });

    await expect(websiteItem).toBeVisible({ timeout: 15000 });
  }
}
