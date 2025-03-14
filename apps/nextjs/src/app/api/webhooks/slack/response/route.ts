import { and, eq, ilike, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { createReply } from "@/lib/data/conversationMessage";
import { findUserViaSlack } from "@/lib/data/user";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { verifySlackRequest } from "@/lib/slack/client";
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

  if (actionId && (actionId === "bulk_close_confirm" || actionId === "bulk_reply_confirm")) {
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
    const { mailboxId, olderThan, about, message } = value;

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

        const slackUserId = payload.user.id;
        if (!slackUserId) {
          await sendSlackMessage(payload.response_url, {
            text: "Slack user ID not found",
            replace_original: true,
          });
          return;
        }

        const user = await findUserViaSlack(mailbox.clerkOrganizationId, mailbox.slackBotToken, slackUserId);

        if (!user) {
          await sendSlackMessage(payload.response_url, {
            text: "User not found",
            replace_original: true,
          });
          return;
        }

        await sendSlackMessage(payload.response_url, {
          text: "Processing your request...",
          replace_original: true,
        });

        const baseConditions = [eq(conversations.mailboxId, mailboxId), eq(conversations.status, "open")];

        if (olderThan) {
          let daysAgo = 30; // Default to 30 days

          if (olderThan.endsWith("d")) {
            daysAgo = parseInt(olderThan.slice(0, -1)) || 30;
          }

          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

          baseConditions.push(lt(conversations.createdAt, cutoffDate));
        }

        let matchingConversations: (typeof conversations.$inferSelect)[] = [];

        if (about) {
          const matches = await searchEmailsByKeywords(about, mailboxId);

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
                  message: "Closed via Slack bulk action",
                },
                tx,
              );
            });
          }

          await sendSlackMessage(payload.response_url, {
            text: `Successfully closed ${matchingConversations.length} tickets.`,
            replace_original: true,
          });
        } else if (actionId === "bulk_reply_confirm" && message) {
          for (const conversation of matchingConversations) {
            await createReply({
              conversationId: conversation.id,
              message,
              user,
              close: false,
            });
          }

          await sendSlackMessage(payload.response_url, {
            text: `Successfully replied to ${matchingConversations.length} tickets.`,
            replace_original: true,
          });
        }
      } catch (error) {
        console.error("Error in async bulk operation:", error);
        await sendSlackMessage(payload.response_url, {
          text: "An error occurred while processing your request. Please try again.",
          replace_original: true,
        });
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
