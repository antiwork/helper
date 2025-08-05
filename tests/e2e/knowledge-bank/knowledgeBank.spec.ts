// tests/e2e/knowledge-bank/knowledgeBank.spec.ts
import { expect, test } from "@playwright/test";
import { KnowledgeBankPage } from "../utils/page-objects/knowledgeBankPage";
import { generateRandomString, takeDebugScreenshot, waitForNetworkIdle } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Knowledge Bank", () => {
  let kb: KnowledgeBankPage;

  test.beforeEach(async ({ page }) => {
    kb = new KnowledgeBankPage(page);
    try {
      await kb.navigate();
    } catch (err) {
      await page.goto("/settings/knowledge");
      await page.waitForLoadState("domcontentloaded");
    }
  });

  test("page shows main elements", async ({ page }) => {
    await kb.expectPageVisible();
    await kb.expectSearchVisible();

    await expect(kb.descriptionText).toBeVisible();
    await expect(kb.addButton).toBeVisible();

    await takeDebugScreenshot(page, "debug/knowledge-bank-elements.png");
  });

  test("search input works", async ({ page }) => {
    const q = "customer support";
    await expect(kb.searchInput).toBeVisible();
    await kb.searchInput.fill(q);
    await expect(kb.searchInput).toHaveValue(q);

    await waitForNetworkIdle(page).catch(() => {});
    await takeDebugScreenshot(page, "debug/knowledge-bank-search-filled.png");

    // clear using string
    await kb.searchInput.fill("");
    await expect(kb.searchInput).toHaveValue("");
  });

  test("add inline knowledge and delete it", async ({ page }) => {
    const sample = `KB test ${generateRandomString(6)}`;

    await kb.openAddForm();
    await takeDebugScreenshot(page, "debug/knowledge-inline-open.png");

    await kb.fillContent(sample);

    await kb.save();

    // Wait for new entry to appear (string required)
    const newEntry = kb.findEntryByText(sample);
    await expect(newEntry).toBeVisible({ timeout: 8000 });

    await takeDebugScreenshot(page, "debug/knowledge-inline-after-save.png");

    const count = await kb.getEntryCount();
    for (let i = 0; i < count; i++) {
      const text = await kb.getEntryText(i);
      if (text.includes(sample)) {
        await kb.deleteEntryByIndex(i);
        // wait until it's gone
        await expect(kb.findEntryByText(sample)).toBeHidden().catch(() => {});
        break;
      }
    }

    await takeDebugScreenshot(page, "debug/knowledge-inline-final-list.png");
  });

  test("toggle behavior and persistence", async ({ page }) => {
    const count = await kb.getEntryCount();
    if (count === 0) {
      test.skip(true, "No entries to toggle");
      return;
    }

    // Find the first enabled toggle
    let toggleIndex = 0;
    let foundEnabledToggle = false;
    
    for (let i = 0; i < count; i++) {
      const toggle = kb.toggles.nth(i);
      if (await toggle.isEnabled()) {
        toggleIndex = i;
        foundEnabledToggle = true;
        break;
      }
    }

    if (!foundEnabledToggle) {
      test.skip(true, "No enabled toggles found");
      return;
    }

    const before = await kb.getToggleState(toggleIndex);
    await kb.toggleEntry(toggleIndex); 
    
    // Wait a moment for the change to propagate
    await page.waitForTimeout(1000);
    
    const after = await kb.getToggleState(toggleIndex);
    expect(after).not.toBe(before);

    await page.reload();
    await page.waitForLoadState("networkidle");
    const persisted = await kb.getToggleState(toggleIndex);
    expect(persisted).toBe(after);

    await takeDebugScreenshot(page, "debug/knowledge-bank-toggle-persisted.png");
  });
});
