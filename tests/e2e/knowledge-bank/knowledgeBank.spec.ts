import { test } from "@playwright/test";
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

    await knowledgeBankPage.addKnowledge(originalContent);
    await knowledgeBankPage.expectKnowledgeExists(originalContent);

    await knowledgeBankPage.editKnowledge(originalContent, updatedContent);

    await knowledgeBankPage.expectKnowledgeExists(updatedContent);
    await knowledgeBankPage.expectKnowledgeNotExists(originalContent);

    await knowledgeBankPage.deleteKnowledge(updatedContent);
  });

  test("should toggle knowledge enabled state", async () => {
    const testContent = `Knowledge toggle test ${generateRandomString(8)}`;

    await knowledgeBankPage.addKnowledge(testContent);
    await knowledgeBankPage.expectKnowledgeEnabled(testContent, true);

    await knowledgeBankPage.toggleKnowledgeEnabled(testContent);
    await knowledgeBankPage.expectKnowledgeEnabled(testContent, false);

    await knowledgeBankPage.toggleKnowledgeEnabled(testContent);
    await knowledgeBankPage.expectKnowledgeEnabled(testContent, true);

    await knowledgeBankPage.deleteKnowledge(testContent);
  });

  test("should delete knowledge", async () => {
    const testContent = `Knowledge deletion test ${generateRandomString(8)}`;

    await knowledgeBankPage.addKnowledge(testContent);
    await knowledgeBankPage.expectKnowledgeExists(testContent);

    await knowledgeBankPage.deleteKnowledge(testContent);
    await knowledgeBankPage.expectKnowledgeNotExists(testContent);
  });

  test("should search knowledge entries", async () => {
    const uniqueId = generateRandomString(6);
    const testContent1 = `First knowledge ${uniqueId} about refunds`;
    const testContent2 = `Second knowledge ${uniqueId} about shipping`;

    await knowledgeBankPage.addKnowledge(testContent1);
    await knowledgeBankPage.addKnowledge(testContent2);

    await knowledgeBankPage.searchKnowledge("refunds");
    await knowledgeBankPage.expectKnowledgeExists(testContent1);
    await knowledgeBankPage.expectKnowledgeNotExists(testContent2);

    await knowledgeBankPage.searchKnowledge("shipping");
    await knowledgeBankPage.expectKnowledgeExists(testContent2);
    await knowledgeBankPage.expectKnowledgeNotExists(testContent1);

    await knowledgeBankPage.clearSearch();
    await knowledgeBankPage.expectKnowledgeExists(testContent1);
    await knowledgeBankPage.expectKnowledgeExists(testContent2);

    await knowledgeBankPage.deleteKnowledge(testContent1);
    await knowledgeBankPage.deleteKnowledge(testContent2);
  });

  test("should cancel knowledge editing", async () => {
    const originalContent = `Original cancel test ${generateRandomString(8)}`;
    const changedContent = `Changed cancel test ${generateRandomString(8)}`;

    await knowledgeBankPage.addKnowledge(originalContent);
    await knowledgeBankPage.startEditingKnowledge(originalContent);
    await knowledgeBankPage.fillKnowledgeContent(changedContent);
    await knowledgeBankPage.cancelEdit();

    await knowledgeBankPage.expectKnowledgeExists(originalContent);
    await knowledgeBankPage.expectKnowledgeNotExists(changedContent);

    await knowledgeBankPage.deleteKnowledge(originalContent);
  });
});
