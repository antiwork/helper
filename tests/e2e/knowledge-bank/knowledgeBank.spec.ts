import { expect, test } from "@playwright/test";
import { KnowledgeBankPage } from "../utils/page-objects/knowledgeBankPage";
import { generateRandomString } from "../utils/test-helpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Knowledge Bank Settings", () => {
  let knowledgeBankPage: KnowledgeBankPage;

  test.beforeEach(async ({ page }) => {
    knowledgeBankPage = new KnowledgeBankPage(page);

    await knowledgeBankPage.navigate();
    await knowledgeBankPage.waitForPageLoad();
  });

  test("should add new knowledge", async () => {
    const testContent = `Test knowledge entry ${generateRandomString(8)}`;

    await knowledgeBankPage.addKnowledge(testContent);
    await knowledgeBankPage.expectKnowledgeExists(testContent);

    await knowledgeBankPage.deleteKnowledge(testContent);
  });

  test("should edit existing knowledge", async () => {
    const originalContent = `Original knowledge ${generateRandomString(8)}`;
    const updatedContent = `Updated knowledge ${generateRandomString(8)}`;

    // Add knowledge first
    await knowledgeBankPage.addKnowledge(originalContent);
    await knowledgeBankPage.expectKnowledgeExists(originalContent);

    // Edit the knowledge
    await knowledgeBankPage.editKnowledge(originalContent, updatedContent);

    // Wait for the updated content to appear first
    await knowledgeBankPage.expectKnowledgeExists(updatedContent);

    // Then verify the original content is gone
    await knowledgeBankPage.expectKnowledgeNotExists(originalContent);

    await knowledgeBankPage.deleteKnowledge(updatedContent);
  });

  test("should toggle knowledge enabled state", async () => {
    const testContent = `Knowledge toggle test ${generateRandomString(8)}`;

    // Add knowledge (should be enabled by default)
    await knowledgeBankPage.addKnowledge(testContent);
    await knowledgeBankPage.expectKnowledgeEnabled(testContent, true);

    // Toggle to disabled
    await knowledgeBankPage.toggleKnowledgeEnabled(testContent);
    await knowledgeBankPage.expectKnowledgeEnabled(testContent, false);

    // Toggle back to enabled
    await knowledgeBankPage.toggleKnowledgeEnabled(testContent);
    await knowledgeBankPage.expectKnowledgeEnabled(testContent, true);

    // Cleanup
    await knowledgeBankPage.deleteKnowledge(testContent);
  });

  test("should delete knowledge", async () => {
    const testContent = `Knowledge deletion test ${generateRandomString(8)}`;

    // Add knowledge first
    await knowledgeBankPage.addKnowledge(testContent);
    await knowledgeBankPage.expectKnowledgeExists(testContent);

    // Delete the knowledge
    await knowledgeBankPage.deleteKnowledge(testContent);
    await knowledgeBankPage.expectKnowledgeNotExists(testContent);
  });

  test("should search knowledge entries", async () => {
    const uniqueId = generateRandomString(6);
    const testContent1 = `First knowledge ${uniqueId} about refunds`;
    const testContent2 = `Second knowledge ${uniqueId} about shipping`;

    // Add two knowledge entries
    await knowledgeBankPage.addKnowledge(testContent1);
    await knowledgeBankPage.addKnowledge(testContent2);

    // Search for "refunds" - should show only first entry
    await knowledgeBankPage.searchKnowledge("refunds");
    await knowledgeBankPage.expectKnowledgeExists(testContent1);
    await knowledgeBankPage.expectKnowledgeNotExists(testContent2);

    // Search for "shipping" - should show only second entry
    await knowledgeBankPage.searchKnowledge("shipping");
    await knowledgeBankPage.expectKnowledgeExists(testContent2);
    await knowledgeBankPage.expectKnowledgeNotExists(testContent1);

    // Clear search - should show both entries
    await knowledgeBankPage.clearSearch();
    await knowledgeBankPage.expectKnowledgeExists(testContent1);
    await knowledgeBankPage.expectKnowledgeExists(testContent2);

    await knowledgeBankPage.deleteKnowledge(testContent1);
    await knowledgeBankPage.deleteKnowledge(testContent2);
  });

  test("should cancel knowledge editing", async () => {
    const originalContent = `Original cancel test ${generateRandomString(8)}`;
    const changedContent = `Changed cancel test ${generateRandomString(8)}`;

    // Add knowledge first
    await knowledgeBankPage.addKnowledge(originalContent);

    // Start editing but cancel
    const knowledgeButton = knowledgeBankPage.page
      .getByTestId("knowledge-content-button")
      .filter({ hasText: originalContent });
    await knowledgeButton.click();

    await knowledgeBankPage.page.getByTestId("knowledge-content-textarea").click();
    await knowledgeBankPage.page.getByTestId("knowledge-content-textarea").fill(changedContent);
    await knowledgeBankPage.page.getByTestId("cancel-knowledge-button").click();

    // Should still show original content
    await knowledgeBankPage.expectKnowledgeExists(originalContent);
    await knowledgeBankPage.expectKnowledgeNotExists(changedContent);

    await knowledgeBankPage.deleteKnowledge(originalContent);
  });
});
