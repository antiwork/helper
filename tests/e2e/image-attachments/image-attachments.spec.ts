import { expect, test } from "@playwright/test";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Image Attachments E2E", () => {
  test("should upload and attach images in chat widget", async ({ page }) => {
    // Navigate to the in-app chat settings page where the widget is available
    await page.goto("/settings/in-app-chat");
    await page.waitForLoadState("networkidle");

    // Look for the widget icon
    const widgetIcon = page.locator(".helper-widget-icon");
    await expect(widgetIcon).toBeVisible({ timeout: 15000 });

    // Click to open the widget
    await widgetIcon.click();

    // Wait for the widget to open - it might be in an iframe or shadow DOM
    await page.waitForTimeout(2000);

    // Try to find the chat widget container first
    const widgetContainer = page.locator('[class*="helper-widget"]').first();
    await expect(widgetContainer).toBeVisible({ timeout: 10000 });

    // Wait for the widget iframe to load and grab its frame locator
    const widgetFrame = page.frameLocator("iframe.helper-widget-iframe");

    // Now find the chat input - it should be visible inside the iframe
    const chatInput = widgetFrame.locator('textarea[aria-label="Ask a question"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    // Find the attachment button (paperclip icon)
    const attachButton = widgetFrame.locator('label[aria-label="Attach images"]');
    await expect(attachButton).toBeVisible();

    // Create a small test image file
    const imageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64",
    );

    // Upload the image file via the hidden file input
    const fileInput = widgetFrame.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: "test-image.png",
      mimeType: "image/png",
      buffer: imageBuffer,
    });

    // Wait a moment for the file to be processed
    await page.waitForTimeout(1000);

    // Verify the attachment appears in the preview
    // Look for the filename in the attachment preview
    await expect(widgetFrame.getByText("test-image.png")).toBeVisible({ timeout: 5000 });

    // Type a message
    await chatInput.fill("Here is an image attachment for testing");

    // Submit the message
    const submitButton = widgetFrame.locator('button[type="submit"]');
    await submitButton.click();

    // Verify the message was sent - look for the message content in the conversation
    await expect(widgetFrame.getByText("Here is an image attachment for testing")).toBeVisible({ timeout: 15000 });

    console.log("✅ Image attachment uploaded and message sent successfully");
  });

  test("should support multiple image formats", async ({ page }) => {
    // Navigate to the in-app chat settings page where the widget is available
    await page.goto("/settings/in-app-chat");
    await page.waitForLoadState("networkidle");

    // Look for the widget icon
    const widgetIcon = page.locator(".helper-widget-icon");
    await expect(widgetIcon).toBeVisible({ timeout: 15000 });

    // Click to open the widget
    await widgetIcon.click();

    // Wait for the widget to open
    await page.waitForTimeout(2000);

    // Try to find the chat widget container first
    const widgetContainer = page.locator('[class*="helper-widget"]').first();
    await expect(widgetContainer).toBeVisible({ timeout: 10000 });

    // Wait for the widget iframe to load and grab its frame locator
    const widgetFrame = page.frameLocator("iframe.helper-widget-iframe");
    const chatInput = widgetFrame.locator('textarea[aria-label="Ask a question"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });

    // Test PNG format
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

    // Verify PNG appears
    await expect(widgetFrame.getByText("test.png")).toBeVisible({ timeout: 5000 });

    // Test JPEG format
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      "base64",
    );

    await fileInput.setInputFiles({
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: jpegBuffer,
    });

    // Verify JPEG appears
    await expect(widgetFrame.getByText("test.jpg")).toBeVisible({ timeout: 5000 });

    // Send message with multiple formats
    await chatInput.fill("Testing multiple image formats");
    await widgetFrame.locator('button[type="submit"]').click();

    await expect(widgetFrame.getByText("Testing multiple image formats")).toBeVisible({ timeout: 15000 });

    console.log("✅ Multiple image formats supported");
  });
});
