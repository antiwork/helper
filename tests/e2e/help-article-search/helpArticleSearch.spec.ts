import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Help Article Search", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mine", { timeout: 15000 });
    await page.waitForLoadState("networkidle", { timeout: 10000 });
    
    // Wait for conversations to load
    await page.waitForSelector('a[href*="/conversations?id="]', { timeout: 30000 });
    
    // Click on first conversation
    await page.click('a[href*="/conversations?id="]');
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("should trigger popover when typing @", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"][role="textbox"]').first();
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    
    await page.keyboard.type("@");
    
    // Wait for popover to appear in document body
    await page.waitForSelector(
      'body > div:has(span:has-text("Search help center articles"))',
      { timeout: 10000 }
    );
    
    const searchLabel = page.locator('body > div:has(span:has-text("Search help center articles"))');
    await expect(searchLabel).toBeVisible();
  });

  test("should show help articles in popover", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"][role="textbox"]').first();
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    
    await page.keyboard.type("@");
    
    // Wait for popover to appear
    await page.waitForSelector(
      'body > div:has(span:has-text("Search help center articles"))',
      { timeout: 10000 }
    );
    
    // Wait for articles to actually appear
    await page.waitForSelector('body > div li:has(span.font-medium)', { timeout: 5000 });
    
    // Check that articles are displayed
    const articleItems = page.locator('body > div li:has(span.font-medium)');
    const count = await articleItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should filter articles when typing search query", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"][role="textbox"]').first();
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    
    await page.keyboard.type("@");
    
    // Wait for popover to appear
    await page.waitForSelector(
      'body > div:has(span:has-text("Search help center articles"))',
      { timeout: 10000 }
    );
    
    // Wait for articles to actually appear
    await page.waitForSelector('body > div li:has(span.font-medium)', { timeout: 5000 });
    
    // Type search query
    await page.keyboard.type("account");
    
    // Check that filtered results are shown
    const articleItems = page.locator('body > div li:has(span.font-medium)');
    const count = await articleItems.count();
    expect(count).toBeGreaterThan(0);
    
    // Verify first article contains "account"
    const firstArticle = articleItems.first().locator('span.font-medium');
    const text = await firstArticle.textContent();
    expect(text?.toLowerCase()).toContain("account");
  });

  test("should insert article link when selected", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"][role="textbox"]').first();
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    
    await page.keyboard.type("@");
    
    // Wait for popover to appear
    await page.waitForSelector(
      'body > div:has(span:has-text("Search help center articles"))',
      { timeout: 10000 }
    );
    
    // Wait for articles to actually appear
    await page.waitForSelector('body > div li:has(span.font-medium)', { timeout: 5000 });
    
    // Select first article
    await page.keyboard.press("Enter");
    
    // Wait for popover to disappear
    await page.waitForSelector(
      'body > div:has(span:has-text("Search help center articles"))',
      { timeout: 5000, state: 'hidden' }
    );
    
    // Check that link was inserted
    const content = await editor.innerHTML();
    expect(content).toContain('href=');
    expect(content).toContain('target="_blank"');
  });

  test("should close popover with Escape key", async ({ page }) => {
    const editor = page.locator('[contenteditable="true"][role="textbox"]').first();
    await editor.waitFor({ timeout: 10000 });
    await editor.click();
    
    await page.keyboard.type("@");
    
    // Wait for popover to appear
    await page.waitForSelector(
      'body > div:has(span:has-text("Search help center articles"))',
      { timeout: 10000 }
    );
    
    await page.keyboard.press("Escape");
    
    // Wait for popover to disappear
    await page.waitForSelector(
      'body > div:has(span:has-text("Search help center articles"))',
      { timeout: 5000, state: 'hidden' }
    );
  });
}); 