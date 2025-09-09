import { expect, test } from "@playwright/test";

// Use the working authentication
test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Image Attachments E2E", () => {
  test("should support multiple image formats", async ({ page }) => {
    await page.goto("/settings/in-app-chat");

    const widgetIcon = page.getByRole("button", { name: "Helper Widget Icon" }).first();
    await expect(widgetIcon).toBeVisible({ timeout: 15000 });
    await widgetIcon.click({ force: true });

    const widgetFrame = page.locator('iframe[name="helper-widget-iframe"]').first().contentFrame();
    await expect(widgetFrame.getByRole("textbox", { name: "Ask a question" })).toBeVisible({ timeout: 20000 });
    await widgetFrame.getByRole("textbox", { name: "Ask a question" }).fill("Testing multiple image formats");

    await widgetFrame.getByLabel("Attach images").click();

    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64",
    );
    await widgetFrame.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: pngBuffer,
    });
    await expect(widgetFrame.getByText("test.png")).toBeVisible();
    const jpegBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
      "base64",
    );
    await widgetFrame.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: "test.jpg",
      mimeType: "image/jpeg",
      buffer: jpegBuffer,
    });
    await expect(widgetFrame.getByText("test.jpg")).toBeVisible();

    await widgetFrame.getByRole("button", { name: "Send Message" }).click();
    await expect(widgetFrame.getByText("Testing multiple image formats")).toBeVisible();
  });
});
