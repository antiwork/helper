import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";

export const markSent = async (emailId: number) => {
  await db.update(conversationMessages).set({ status: "sent" }).where(eq(conversationMessages.id, emailId));
  return null;
};

export const markFailed = async (emailId: number, conversationId: number, error: string) => {
  await db.transaction(async (tx) => {
    await tx.update(conversationMessages).set({ status: "failed" }).where(eq(conversationMessages.id, emailId));
    await tx.update(conversations).set({ status: "open" }).where(eq(conversations.id, conversationId));
  });
  return error;
};
