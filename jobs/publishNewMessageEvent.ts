import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationAgentReadStatus, conversationMessages } from "@/db/schema";
import { serializeMessage, serializeMessageForWidget } from "@/lib/data/conversationMessage";
import { createMessageEventPayload } from "@/lib/data/dashboardEvent";
import { getMailbox } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import {
  conversationChannelId,
  conversationsListChannelId,
  dashboardChannelId,
  publicConversationChannelId,
} from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";

export const publishNewMessageEvent = async ({ messageId }: { messageId: number }) => {
  const message = await db.query.conversationMessages.findFirst({
    where: eq(conversationMessages.id, messageId),
    with: {
      conversation: {
        with: {
          platformCustomer: true,
        },
      },
      files: true,
    },
  });
  const published = [];
  const mailbox = await getMailbox();
  if (!mailbox) return `No mailbox found, cannot publish events.`;

  if (message && message.role !== "user") {
    await publishToRealtime({
      channel: publicConversationChannelId(message.conversation.slug),
      event: "agent-reply",
      data: await serializeMessageForWidget(message, message.files),
    });
  }
  if (message && message?.role !== "ai_assistant") {
    await publishToRealtime({
      channel: conversationChannelId(message.conversation.slug),
      event: "conversation.message",
      data: await serializeMessage(message, message.conversation.id, mailbox),
      trim: (data, amount) => ({
        ...data,
        body: data.body && amount < data.body.length ? data.body.slice(0, data.body.length - amount) : null,
      }),
    });
    published.push("conversation.message");
  }
  if (message?.role === "user" && message.conversation.status === "open") {
    const unreadData = message.conversation.assignedToId
      ? await db.transaction(async (tx) => {
          try {
            return await tx
              .select({
                hasUnreadReplies: sql<boolean>`
                  WITH read_status AS (
                    SELECT COALESCE(last_read_at, ${message.conversation.createdAt}) as effective_read_at
                    FROM (SELECT 1) dummy
                    LEFT JOIN ${conversationAgentReadStatus} 
                      ON conversation_id = ${message.conversation.id} 
                      AND agent_clerk_id = ${message.conversation.assignedToId}
                  )
                  SELECT COALESCE(${message.conversation.lastUserEmailCreatedAt} > effective_read_at, false)
                  FROM read_status
                `.as("has_unread_replies"),
                unreadCount: sql<number>`
                  WITH read_status AS (
                    SELECT COALESCE(last_read_at, ${message.conversation.createdAt}) as effective_read_at
                    FROM (SELECT 1) dummy
                    LEFT JOIN ${conversationAgentReadStatus} 
                      ON conversation_id = ${message.conversation.id} 
                      AND agent_clerk_id = ${message.conversation.assignedToId}
                  )
                  SELECT COUNT(*)::int 
                  FROM ${conversationMessages}, read_status
                  WHERE conversation_id = ${message.conversation.id}
                  AND created_at > effective_read_at
                  AND role = 'user'
                `.as("unread_count"),
              })
              .from(sql`(SELECT 1) as dummy`)
              .then((results) => results[0] ?? { hasUnreadReplies: false, unreadCount: 0 });
          } catch (error) {
            captureExceptionAndLog(error, "Failed to calculate unread status while computing unread status");
            return { hasUnreadReplies: false, unreadCount: 0 };
          }
        })
      : { hasUnreadReplies: false, unreadCount: 0 };

    await publishToRealtime({
      channel: conversationsListChannelId(),
      event: "conversation.new",
      data: {
        ...message.conversation,
        hasUnreadReplies: unreadData.hasUnreadReplies,
        unreadCount: unreadData.unreadCount,
      },
    });
    published.push("conversation.new");
  }
  if (message) {
    await publishToRealtime({
      channel: dashboardChannelId(),
      event: "event",
      data: createMessageEventPayload(message, mailbox),
    });
    published.push("realtime.event");
  }
  return `Events for message ${message?.id} published: ${published.join(", ") || "none"}`;
};
