import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { serializeMessage, serializeMessageForWidget } from "@/lib/data/conversationMessage";
import { createMessageEventPayload } from "@/lib/data/dashboardEvent";
import { getMailbox } from "@/lib/data/mailbox";
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
    await publishToRealtime({
      channel: conversationsListChannelId(),
      event: "conversation.new",
      data: message.conversation,
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
