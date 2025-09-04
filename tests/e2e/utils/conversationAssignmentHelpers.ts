import { expect, type Page } from "@playwright/test";
import { and, eq, isNull } from "drizzle-orm";
import { assertDefined } from "../../../components/utils/assert";
import { db } from "../../../db/client";
import { conversations, userProfiles } from "../../../db/schema";
import { authUsers } from "../../../db/supabaseSchema/auth";

export async function getCurrentUserId(): Promise<string> {
  const user = await db
    .select({
      id: userProfiles.id,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
    .where(eq(authUsers.email, "support@gumroad.com"))
    .limit(1);

  if (user.length === 0) {
    throw new Error("Could not find current user (support@gumroad.com)");
  }

  return user[0].id;
}

export async function getUserAutoAssignPreference(userId: string): Promise<boolean> {
  const userProfile = await db
    .select({ preferences: userProfiles.preferences })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  return userProfile[0]?.preferences?.autoAssignOnReply ?? false;
}

export async function setUserAutoAssignPreference(userId: string, enabled: boolean): Promise<void> {
  const currentProfile = await db
    .select({ preferences: userProfiles.preferences })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId))
    .limit(1);

  const updatedPreferences = {
    ...currentProfile[0]?.preferences,
    autoAssignOnReply: enabled,
  };

  await db.update(userProfiles).set({ preferences: updatedPreferences }).where(eq(userProfiles.id, userId));
}

export async function getExistingUnassignedConversation(): Promise<{ id: number; slug: string } | null> {
  const conversation = await db
    .select({
      id: conversations.id,
      slug: conversations.slug,
    })
    .from(conversations)
    .where(and(isNull(conversations.assignedToId), eq(conversations.status, "open")))
    .limit(1);

  return conversation.length > 0 ? conversation[0] : null;
}

export async function getConversationAssignedTo(conversationId: number): Promise<string | null> {
  const conversation = await db
    .select({ assignedToId: conversations.assignedToId })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  return conversation[0]?.assignedToId ?? null;
}

export async function setConversationAssignment(conversationId: number, assignedToId: string | null): Promise<void> {
  await db.update(conversations).set({ assignedToId }).where(eq(conversations.id, conversationId));
}

export async function getTestUser(): Promise<{ id: string; email: string; displayName: string }> {
  const testUserEmail = "testUser@gumroad.com";

  const userProfile = await db
    .select({
      id: userProfiles.id,
      displayName: userProfiles.displayName,
    })
    .from(userProfiles)
    .where(eq(userProfiles.displayName, "Test User"))
    .limit(1);

  if (userProfile.length === 0) {
    throw new Error(`Test user with display name "Test User" not found. Make sure the database is properly seeded.`);
  }

  return {
    id: userProfile[0].id,
    email: testUserEmail,
    displayName: assertDefined(userProfile[0].displayName),
  };
}

export async function sendReplyMessage(page: Page, message: string): Promise<void> {
  const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
  await expect(composer).toBeVisible();
  await composer.click({ force: true });
  await composer.focus();
  await composer.evaluate((el) => {
    el.innerHTML = "";
    el.textContent = "";
  });
  await composer.pressSequentially(message);

  const composerText = await composer.textContent();
  expect(composerText).toContain(message);

  const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
  await replyButton.click();

  await page.waitForLoadState("networkidle");
}
