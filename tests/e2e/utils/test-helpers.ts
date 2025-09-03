import { promises as fs } from "fs";
import { expect, Page } from "@playwright/test";
import { desc, eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { conversationEvents, conversations, userProfiles } from "../../../db/schema";

export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState("networkidle", { timeout });
}

export function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test-${timestamp}@example.com`;
}

export async function takeDebugScreenshot(page: Page, filename: string) {
  await ensureDirectoryExists("tests/e2e/debug");
  await page.screenshot({
    path: `tests/e2e/debug/${filename}`,
    fullPage: true,
  });
}

export async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export function generateRandomString(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function debugWait(page: Page, ms = 1000) {
  if (process.env.HEADED === "true" || process.env.DEBUG === "true") {
    await page.waitForTimeout(ms);
  }
}

export async function loadWidget(
  page: Page,
  config?: { token?: string; email?: string; name?: string; userId?: string },
) {
  if (config) {
    await page.evaluate((cfg) => {
      (window as any).helperWidgetConfig = { ...cfg };
    }, config);
  }

  await page.click("[data-helper-toggle]", { timeout: 15000 });
  await expect(page.locator("iframe")).toBeVisible({ timeout: 15000 });

  const widgetFrame = page.frameLocator("iframe.helper-widget-iframe");
  await expect(widgetFrame.getByRole("textbox", { name: "Ask a question" })).toBeVisible({ timeout: 15000 });

  return { widgetFrame };
}

export async function getConversationStatusFromDb(conversationId: number): Promise<string> {
  const [event] = await db
    .select({ changes: conversationEvents.changes })
    .from(conversationEvents)
    .where(eq(conversationEvents.conversationId, conversationId))
    .orderBy(desc(conversationEvents.createdAt))
    .limit(1);
  if (event && event.changes && event.changes.status) {
    return event.changes.status;
  }
  return "unknown";
}

export async function getOpenConversation(): Promise<{ id: number; slug: string }> {
  const result = await db
    .select({ id: conversations.id, slug: conversations.slug })
    .from(conversations)
    .where(eq(conversations.status, "open"))
    .limit(1);

  if (!result.length) {
    throw new Error(
      "No open conversation found in database. Please ensure there's at least one open conversation for testing.",
    );
  }

  return result[0];
}

export async function getCurrentUserId(): Promise<string> {
  const [userProfile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .limit(1);
  
  if (!userProfile) {
    throw new Error("No user profile found for testing");
  }
  
  return userProfile.id;
}

export async function getUserAutoAssignPreference(userId: string): Promise<boolean> {
  const [userProfile] = await db
    .select({ preferences: userProfiles.preferences })
    .from(userProfiles)
    .where(eq(userProfiles.id, userId));
    
  return userProfile?.preferences?.autoAssignOnReply ?? false;
}

export async function setUserAutoAssignPreference(userId: string, enabled: boolean): Promise<void> {
  await db
    .update(userProfiles)
    .set({
      preferences: { autoAssignOnReply: enabled },
      updatedAt: new Date()
    })
    .where(eq(userProfiles.id, userId));
}

export async function createUnassignedConversation(): Promise<{ id: number; slug: string }> {
  const [newConversation] = await db
    .insert(conversations)
    .values({
      subject: "Test Auto-Assign Conversation",
      status: "open",
      emailFrom: "test@example.com",
      emailFromName: "Test User",
      source: "email",
      assignedToId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: conversations.id, slug: conversations.slug });
    
  if (!newConversation) {
    throw new Error("Failed to create test conversation");
  }
  
  return newConversation;
}

export async function getConversationAssignedTo(conversationId: number): Promise<string | null> {
  const [conversation] = await db
    .select({ assignedToId: conversations.assignedToId })
    .from(conversations)
    .where(eq(conversations.id, conversationId));
    
  return conversation?.assignedToId ?? null;
}

export async function setConversationAssignment(conversationId: number, assignedToId: string | null): Promise<void> {
  await db
    .update(conversations)
    .set({ assignedToId, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function cleanupTestConversation(conversationId: number): Promise<void> {
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}

export async function waitForConversationAssignment(conversationId: number, expectedUserId: string | null): Promise<void> {
  await expect.poll(async () => {
    return await getConversationAssignedTo(conversationId);
  }, {
    message: `Expected conversation ${conversationId} to be assigned to ${expectedUserId}`,
    timeout: 10000
  }).toBe(expectedUserId);
}

export async function sendReplyMessage(page: Page, message: string): Promise<void> {
  const composer = page.locator('[aria-label="Conversation editor"] .tiptap.ProseMirror');
  await composer.click({ force: true });
  await composer.evaluate((el) => {
    el.innerHTML = "";
    el.textContent = "";
  });
  await composer.pressSequentially(message);
  
  const replyButton = page.locator('button:has-text("Reply"):not(:has-text("close")):not(:has-text("Close"))');
  await expect(replyButton).toBeEnabled();
  await replyButton.click();
  await page.waitForLoadState("networkidle");
}
