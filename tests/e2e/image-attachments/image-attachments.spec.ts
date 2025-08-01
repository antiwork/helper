import { expect, test } from "@playwright/test";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Image Attachments E2E", () => {
  test("should upload and attach images in chat widget", async ({ page }) => {

    await page.goto("/settings/in-app-chat");
    await page.waitForLoadState("networkidle");

    const widgetIcon = page.locator(".helper-widget-icon").first();
    await expect(widgetIcon).toBeVisible({ timeout: 15000 });

    await widgetIcon.click({ force: true });

    await page.waitForTimeout(2000);

    const widgetContainer = page.locator('[class*="helper-widget"]').first();
    await expect(widgetContainer).toBeVisible({ timeout: 10000 });

    const widgetFrame = page.frameLocator('iframe.helper-widget-iframe').first();

    const chatInput = widgetFrame.locator('textarea[aria-label="Ask a question"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    const attachButton = widgetFrame.locator('label[aria-label="Attach images"]');
    await expect(attachButton).toBeVisible();

    const imageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64",
    );

    const fileInput = widgetFrame.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: "test-image.png",
      mimeType: "image/png",
      buffer: imageBuffer,
    });

    await page.waitForTimeout(1000);

    await expect(widgetFrame.getByText("test-image.png")).toBeVisible({ timeout: 5000 });

    await chatInput.fill("Here is an image attachment for testing");

    const submitButton = widgetFrame.locator('button[type="submit"]');
    await submitButton.click();

    await expect(widgetFrame.getByText("Here is an image attachment for testing")).toBeVisible({ timeout: 15000 });

    console.log("✅ Image attachment uploaded and message sent successfully");
  });

  test("should support multiple image formats", async ({ page }) => {
    await page.goto("/settings/in-app-chat");
    await page.goto("/settings/in-app-chat");
    await page.waitForLoadState("networkidle");

    const widgetIcon = page.locator(".helper-widget-icon").first();
    await expect(widgetIcon).toBeVisible({ timeout: 15000 });

    await widgetIcon.click({ force: true });

    await page.waitForTimeout(2000);

    const widgetContainer = page.locator('[class*="helper-widget"]').first();
    await expect(widgetContainer).toBeVisible({ timeout: 10000 });

    const widgetFrame = page.frameLocator("iframe.helper-widget-iframe").first();
    const chatInput = widgetFrame.locator('textarea[aria-label="Ask a question"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64",
    );

    const fileInput = widgetFrame.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });

    await expect(widgetFrame.getByText("test.png")).toBeVisible({ timeout: 5000 });

    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      "base64",
    );

    await fileInput.setInputFiles({
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: jpegBuffer,
    });

    await expect(widgetFrame.getByText("test.jpg")).toBeVisible({ timeout: 5000 });

    await chatInput.fill("Testing multiple image formats");
    await widgetFrame.locator('button[type="submit"]').click();

    await expect(widgetFrame.getByText("Testing multiple image formats")).toBeVisible({ timeout: 15000 });

    console.log("✅ Multiple image formats supported");
  });
});
