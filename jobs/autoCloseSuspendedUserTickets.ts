import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { env } from "@/lib/env";

const SUSPENSION_KEYWORDS = [
  "suspended", "suspension", "delete account", "delete my account", 
  "data deletion", "remove my data", "personal information", "gdpr"
];

type SuspendedUserReport = {
  totalProcessed: number;
  conversationsClosed: number;
  status: string;
};

export async function closeSuspendedUserTickets(): Promise<SuspendedUserReport> {
  const report: SuspendedUserReport = {
    totalProcessed: 0,
    conversationsClosed: 0,
    status: "",
  };

  const openConversations = await db.query.conversations.findMany({
    where: and(
      eq(conversations.status, "open"),
      isNull(conversations.mergedIntoId)
    ),
    columns: {
      id: true,
      slug: true,
      emailFrom: true,
    },
  });

  if (openConversations.length === 0) {
    report.status = "No open conversations found";
    return report;
  }

  for (const conversation of openConversations) {
    if (!conversation.emailFrom) continue;

    const hasKeywords = await checkForSuspensionKeywords(conversation.id);
    if (!hasKeywords) continue;

    const isSuspended = await checkUserSuspensionStatus(conversation.emailFrom);
    if (!isSuspended) continue;

    await updateConversation(conversation.id, {
      set: {
        status: "closed",
        closedAt: new Date(),
        updatedAt: new Date(),
      },
      type: "auto_closed_due_to_inactivity",
      message: "Auto-closed: Suspended user requesting account deletion",
    });

    report.conversationsClosed++;
    report.totalProcessed++;
  }

  report.status = `Successfully processed ${report.totalProcessed} conversations, closed ${report.conversationsClosed}`;
  return report;
}

async function checkForSuspensionKeywords(conversationId: number): Promise<boolean> {
  const messages = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, conversationId),
      isNull(conversationMessages.deletedAt),
      or(
        eq(conversationMessages.role, "user"),
        eq(conversationMessages.role, "staff")
      )
    ),
  });

  for (const message of messages) {
    const text = await ensureCleanedUpText(message);
    const lowerText = text.toLowerCase();
    
    if (SUSPENSION_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return true;
    }
  }

  return false;
}

async function checkUserSuspensionStatus(email: string): Promise<boolean> {
  if (!env.GUMROAD_API_URL || !env.GUMROAD_API_TOKEN) {
    return false;
  }

  try {
    const response = await fetch(`${env.GUMROAD_API_URL}/api/internal/helper/user_suspension_info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GUMROAD_API_TOKEN}`,
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.success && data.status === "Suspended";
  } catch (error) {
    return false;
  }
}
