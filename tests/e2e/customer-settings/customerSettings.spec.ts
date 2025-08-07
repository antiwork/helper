import { expect, test, Page } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/user.json" });

async function waitForSaved(page: Page) {
  const saving = page.getByText("Saving", { exact: true });
  const saved = page.getByText("Saved", { exact: true });
  const error = page.getByText("Error", { exact: true });

  try {
    await saving.waitFor({ state: "visible", timeout: 1000 });
  } catch {
    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }
    return;
  }

  try {
    await saved.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    if (await error.isVisible().catch(() => false)) {
      throw new Error("Save failed: Error indicator visible");
    }
    throw new Error("Save timeout: No 'Saved' confirmation received");
  }
}

async function toggleSwitch(page: Page, name: string, state: boolean, validation: string) {
  const element = page.getByRole("switch", { name, exact: true });
  if (await element.isChecked() !== state) {
    await element.click();
    const expectation = expect(page.getByText(validation, { exact: true }));
    if (state) {
      await expectation.toBeVisible();
    } else {
      await expectation.not.toBeVisible();
    }
  }
}

async function setInput(page: Page, name: string, value: string) {
  const input = page.getByRole("spinbutton", { name, exact: true });
  await expect(input).toBeVisible();
  await input.fill(value);
  await expect(input).toHaveValue(value);
  await waitForSaved(page);
}

const enableVip = (page: Page) => toggleSwitch(page, "VIP Customers Switch", true, "Customer Value Threshold");
const disableVip = (page: Page) => toggleSwitch(page, "VIP Customers Switch", false, "Customer Value Threshold");
const enableAutoClose = (page: Page) => toggleSwitch(page, "Enable auto-close", true, "Days of inactivity before auto-close");
const disableAutoClose = (page: Page) => toggleSwitch(page, "Enable auto-close", false, "Days of inactivity before auto-close");

test.describe("Customer Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/customers");
    await expect(page).toHaveURL("/settings/customers");
  });

  test("VIP customer toggle", async ({ page }) => {
    await enableVip(page);
    await expect(page.getByRole("switch", { name: "VIP Customers Switch", exact: true })).toBeChecked();
    
    await disableVip(page);
    await expect(page.getByRole("switch", { name: "VIP Customers Switch", exact: true })).not.toBeChecked();
  });

  test("VIP settings persistence", async ({ page }) => {
    await enableVip(page);
    
    await setInput(page, "Customer Value Threshold", "500");
    await setInput(page, "Response Time Target", "2");
    
    await page.goto("/settings/customers");
    await enableVip(page);
    await expect(page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true })).toHaveValue("500");
    await expect(page.getByRole("spinbutton", { name: "Response Time Target", exact: true })).toHaveValue("2");
  });

  test("input validation", async ({ page }) => {
    await enableVip(page);
    const input = page.getByRole("spinbutton", { name: "Customer Value Threshold", exact: true });
    await expect(input).toHaveAttribute("type", "number");
    await expect(input).toHaveAttribute("min", "0");
  });

  test("Slack integration alert", async ({ page }) => {
    await enableVip(page);
    await expect(page.getByRole("alert").filter({ hasText: "Slack integration is required" })).toBeVisible();
  });

  test("auto-close toggle", async ({ page }) => {
    await enableAutoClose(page);
    const toggle = page.getByRole("switch", { name: "Enable auto-close", exact: true });
    await expect(toggle).toBeChecked();
    
    await disableAutoClose(page);
    await expect(toggle).not.toBeChecked();
  });

  test("auto-close days persistence", async ({ page }) => {
    await enableAutoClose(page);
    
    await setInput(page, "Days of inactivity before auto-close", "15");
    await page.goto("/settings/customers");
    await enableAutoClose(page);
    await expect(page.getByRole("spinbutton", { name: "Days of inactivity before auto-close", exact: true })).toHaveValue("15");
  });

  test("button state management", async ({ page }) => {
    const button = page.getByRole("button", { name: "Run auto-close now", exact: true });
    
    await disableAutoClose(page);
    await expect(button).toBeDisabled();
    
    await enableAutoClose(page);
    await expect(button).toBeEnabled();
  });

  test("auto-close execution", async ({ page }) => {
    await enableAutoClose(page);
    await page.getByRole("button", { name: "Run auto-close now", exact: true }).click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Auto-close triggered" })).toBeVisible({ timeout: 5000 });
  });
});
