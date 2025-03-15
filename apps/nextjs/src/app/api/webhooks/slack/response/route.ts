import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { createReply } from "@/lib/data/conversationMessage";
import { findUserViaSlack } from "@/lib/data/user";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { postSlackMessage, verifySlackRequest } from "@/lib/slack/client";
import { handleSlackAction } from "@/lib/slack/shared";

export const POST = async (request: Request) => {
  const body = await request.text();
  const headers = request.headers;

  if (!(await verifySlackRequest(body, headers))) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 403 });
  }

  const payload = JSON.parse(new URLSearchParams(body).get("payload") || "{}");
  const messageTs = payload.view?.private_metadata || payload.container?.message_ts;
  const actionId = payload.actions?.[0]?.action_id;

  if (
    actionId &&
    (actionId === "bulk_close_confirm" ||
      actionId === "bulk_reply_confirm" ||
      actionId === "bulk_close_cancel" ||
      actionId === "bulk_reply_cancel")
  ) {
    return await handleBulkOperation(payload);
  }

  if (!messageTs) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const message = await db.query.conversationMessages.findFirst({
    where: eq(conversationMessages.slackMessageTs, messageTs),
    with: {
      conversation: {
        with: {
          mailbox: true,
        },
      },
    },
  });
  if (message?.conversation) {
    await handleSlackAction(
      {
        conversationId: message.conversation.id,
        slackChannel: message.slackChannel,
        slackMessageTs: message.slackMessageTs,
      },
      payload,
    );
    return new Response(null, { status: 200 });
  }

  return Response.json({ error: "Message not found" }, { status: 404 });
};

const handleBulkOperation = async (payload: any) => {
  try {
    const action = payload.actions[0];
    const actionId = action.action_id;

    if (actionId === "bulk_close_cancel" || actionId === "bulk_reply_cancel") {
      await sendSlackMessage(payload.response_url, {
        text: "Operation canceled.",
        replace_original: true,
      });
      return new Response(null, { status: 200 });
    }

    const value = JSON.parse(action.value);
    const { mailboxId, searchTerm, message, userId, channelId, messageTs, daysAgo } = value;

    const immediateResponse = new Response(null, { status: 200 });

    void (async () => {
      try {
        const mailbox = await db.query.mailboxes.findFirst({
          where: eq(mailboxes.id, mailboxId),
        });

        if (!mailbox?.slackBotToken) {
          await sendSlackMessage(payload.response_url, {
            text: "Mailbox not found or Slack not connected",
            replace_original: true,
          });
          return;
        }

        // If this is from a mention, we already have the user ID
        let user = { id: userId };

        // If this is from a slash command, we need to get the user from Slack
        if (!userId && payload.user?.id) {
          const slackUserId = payload.user.id;
          const userFromSlack = await findUserViaSlack(mailbox.clerkOrganizationId, mailbox.slackBotToken, slackUserId);

          if (!userFromSlack) {
            await sendSlackMessage(payload.response_url, {
              text: "User not found",
              replace_original: true,
            });
            return;
          }

          user = { id: userFromSlack.id };
        }

        await sendSlackMessage(payload.response_url, {
          text: "Processing your request...",
          replace_original: true,
        });

        const baseConditions = [eq(conversations.mailboxId, mailboxId), eq(conversations.status, "open")];

        if (daysAgo) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
          baseConditions.push(lt(conversations.createdAt, cutoffDate));
        }

        let matchingConversations: (typeof conversations.$inferSelect)[] = [];

        if (searchTerm) {
          const matches = await searchEmailsByKeywords(searchTerm, mailboxId);

          if (matches.length > 0) {
            matchingConversations = await db
              .select()
              .from(conversations)
              .where(
                and(
                  ...baseConditions,
                  inArray(
                    conversations.id,
                    matches.map((m) => m.conversationId),
                  ),
                ),
              );
          }
        } else {
          matchingConversations = await db
            .select()
            .from(conversations)
            .where(and(...baseConditions));
        }

        if (actionId === "bulk_close_confirm") {
          for (const conversation of matchingConversations) {
            await db.transaction(async (tx) => {
              await updateConversation(
                conversation.id,
                {
                  set: { status: "closed" },
                  byUserId: user.id,
                  message: "Closed via Slack",
                },
                tx,
              );
            });
          }

          // If this was from a mention, reply in the thread
          if (channelId && messageTs) {
            await postSlackMessage(mailbox.slackBotToken, {
              channel: channelId,
              thread_ts: messageTs,
              text: `Successfully closed ${matchingConversations.length} tickets.`,
            });
          } else {
            // Otherwise, update the original message
            await sendSlackMessage(payload.response_url, {
              text: `Successfully closed ${matchingConversations.length} tickets.`,
              replace_original: true,
            });
          }
        } else if (actionId === "bulk_reply_confirm" && message) {
          for (const conversation of matchingConversations) {
            await createReply({
              conversationId: conversation.id,
              message,
              // @ts-expect-error - The createReply function expects a full User object, but we only need the ID
              user: { id: user.id },
              close: false,
            });
          }

          // If this was from a mention, reply in the thread
          if (channelId && messageTs) {
            await postSlackMessage(mailbox.slackBotToken, {
              channel: channelId,
              thread_ts: messageTs,
              text: `Successfully replied to ${matchingConversations.length} tickets.`,
            });
          } else {
            // Otherwise, update the original message
            await sendSlackMessage(payload.response_url, {
              text: `Successfully replied to ${matchingConversations.length} tickets.`,
              replace_original: true,
            });
          }
        }
      } catch (error) {
        console.error("Error in async bulk operation:", error);

        // Try to send error message to the appropriate place
        if (value.channelId && value.messageTs && value.mailboxId) {
          const mailbox = await db.query.mailboxes.findFirst({
            where: eq(mailboxes.id, value.mailboxId),
          });

          if (mailbox?.slackBotToken) {
            await postSlackMessage(mailbox.slackBotToken, {
              channel: value.channelId,
              thread_ts: value.messageTs,
              text: "An error occurred while processing your request. Please try again.",
            });
          }
        } else {
          await sendSlackMessage(payload.response_url, {
            text: "An error occurred while processing your request. Please try again.",
            replace_original: true,
          });
        }
      }
    })();

    return immediateResponse;
  } catch (error) {
    console.error("Error handling bulk operation:", error);
    return Response.json({ error: "Failed to process bulk operation" }, { status: 500 });
  }
};

const sendSlackMessage = async (responseUrl: string, message: any) => {
  try {
    await fetch(responseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Error sending Slack message:", error);
  }
};
