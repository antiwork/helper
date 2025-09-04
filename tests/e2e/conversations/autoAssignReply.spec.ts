import { expect, test } from "@playwright/test";
import {
  getConversationAssignedTo,
  getCurrentUserId,
  getExistingUnassignedConversation,
  getTestUser,
  getUserAutoAssignPreference,
  sendReplyMessage,
  setConversationAssignment,
  setUserAutoAssignPreference,
} from "../utils/conversationAssignmentHelpers";

test.use({ storageState: "tests/e2e/.auth/user.json" });

test.describe("Auto-Assign feature", () => {
  test.describe.configure({ mode: "serial" });

  let testConversation: { id: number; slug: string };
  let currentUserId: string;
  let originalAutoAssignPreference: boolean;

  test.beforeEach(async ({ page }) => {
    currentUserId = await getCurrentUserId();

    originalAutoAssignPreference = await getUserAutoAssignPreference(currentUserId);

    const foundConversation = await getExistingUnassignedConversation();
    if (!foundConversation) {
      throw new Error("No existing unassigned conversation found for testing");
    }
    testConversation = foundConversation;

    await page.goto(`/conversations?id=${testConversation.slug}`);
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async () => {
    await setUserAutoAssignPreference(currentUserId, originalAutoAssignPreference);
    await setConversationAssignment(testConversation.id, null);
  });

  test("should start unassigned when disabled, then auto-assign when enabled", async ({ page }) => {
    await setUserAutoAssignPreference(currentUserId, false);

    const initialAssignment = await getConversationAssignedTo(testConversation.id);
    expect(initialAssignment).toBeNull();

    const firstMessage =
      "Thank you for contacting support. I understand you're having trouble with your download. Let me help you with that.";
    await sendReplyMessage(page, firstMessage);

    const assignmentAfterFirstReply = await getConversationAssignedTo(testConversation.id);
    expect(assignmentAfterFirstReply).toBeNull();

    await setUserAutoAssignPreference(currentUserId, true);
    await page.reload();
    await page.waitForLoadState("networkidle");

    const secondMessage = "I've checked your account and can see the issue. I'm processing a refund for you now.";
    await sendReplyMessage(page, secondMessage);

    await expect(page.getByRole("button", { name: "support@gumroad.com" })).toBeVisible({ timeout: 10000 });

    const finalAssignment = await getConversationAssignedTo(testConversation.id);
    expect(finalAssignment).toBe(currentUserId);
  });

  test("should not reassign when conversation already belongs to someone else", async ({ page }) => {
    await setUserAutoAssignPreference(currentUserId, true);

    const testUser = await getTestUser();

    await setConversationAssignment(testConversation.id, testUser.id);
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "Test User" })).toBeVisible({ timeout: 5000 });

    const customerResponse =
      "I've tried the steps you suggested but I'm still experiencing the same issue. Could you please escalate this to your technical team?";
    await sendReplyMessage(page, customerResponse);

    await expect(page.getByRole("button", { name: "Test User" })).toBeVisible();
    await expect(page.getByRole("button", { name: "support@gumroad.com" })).not.toBeVisible();

    const finalAssignment = await getConversationAssignedTo(testConversation.id);
    expect(finalAssignment).toBe(testUser.id);
  });
});
