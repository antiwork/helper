import { test, expect } from "@playwright/test";

test.describe("Installation marketing page", () => {
  test("loads and exposes CTAs", async ({ page }) => {
    await page.goto("http://localhost:3011/installation");

    await expect(page.getByRole("heading", { name: /White‑glove installation/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Contact sales/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Live chat/i })).toBeVisible();

    // Click contact sales should open a mailto link
    const [request] = await Promise.all([
      page.waitForEvent("request", (req) => req.url().startsWith("mailto:")),
      page.getByRole("button", { name: /Contact sales/i }).click(),
    ]);
    expect(request.url()).toContain("mailto:sales@helper.ai");
  });
});


