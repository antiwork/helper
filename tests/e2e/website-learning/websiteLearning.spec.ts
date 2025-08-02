import { expect, test } from "@playwright/test";
import { WebsiteLearningPage } from "../utils/page-objects/websiteLearningPage";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Website Learning UI Smoke Tests", () => {
  let websiteLearningPage: WebsiteLearningPage;

  test.beforeEach(async ({ page }) => {
    websiteLearningPage = new WebsiteLearningPage(page);
    try {
      await websiteLearningPage.navigateToKnowledgeSettings();
      await page.waitForLoadState("networkidle", { timeout: 10000 });
    } catch (error) {
      console.log("Navigation failed, retrying...", error);
      await websiteLearningPage.navigateToKnowledgeSettings();
      await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
    }
  });

  test("displays main website learning interface", async () => {
    await websiteLearningPage.expectWebsiteLearningSection();
    await websiteLearningPage.expectAddWebsiteButton();
  });

  test("shows add website form on button click", async () => {
    await websiteLearningPage.clickAddWebsite();
    await websiteLearningPage.expectAddWebsiteForm();
  });

  test("hides form when cancelled", async () => {
    await websiteLearningPage.clickAddWebsite();
    await websiteLearningPage.cancelAddWebsiteForm();
    await websiteLearningPage.expectFormHidden();
  });

  test("validates invalid URL format", async () => {
    await websiteLearningPage.clickAddWebsite();
    await websiteLearningPage.fillWebsiteUrl("invalid url");
    await websiteLearningPage.submitAddWebsiteForm();
    await websiteLearningPage.expectUrlValidationError("Failed to add website. Please try again.");
  });

  test("adds website with valid URL", async () => {
    const testSite = websiteLearningPage.generateTestWebsite();
    
    await websiteLearningPage.clickAddWebsite();
    await websiteLearningPage.fillWebsiteUrl(testSite.url);
    await websiteLearningPage.submitAddWebsiteForm();
    
    await websiteLearningPage.expectToastMessage("Website added!");
    await websiteLearningPage.expectWebsiteInList(testSite.name);
  });
});