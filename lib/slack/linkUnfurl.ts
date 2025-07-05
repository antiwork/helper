import { KnownBlock, LinkSharedEvent, LinkUnfurls, WebClient } from "@slack/web-api";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { formatCurrency } from "@/components/utils/currency";
import { db } from "@/db/client";
import { conversationMessages, conversations, platformCustomers } from "@/db/schema";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { handleSlackErrors } from "@/lib/slack/client";
import { findMailboxForEvent } from "./agent/findMailboxForEvent";

export async function handleSlackUnfurl(event: LinkSharedEvent) {
  const mailboxInfo = await handleSlackErrors(findMailboxForEvent(event));
  const mailbox = mailboxInfo?.currentMailbox ?? mailboxInfo?.mailboxes?.[0];

  if (!mailbox?.slackBotToken) {
    return;
  }

  const links = event.links ?? [];
  const slack = new WebClient(mailbox.slackBotToken);
  const regex = /[?&]id=([a-zA-Z0-9_-]+)/u;
  const unfurls: LinkUnfurls = {};

  for (const link of links) {
    const match = regex.exec(link.url);
    if (!match) continue;

    const slug = match[1];
    let convo = undefined;

    try {
      if (slug) {
        convo = await db.query.conversations.findFirst({
          where: eq(conversations.slug, slug),
        });
      }
    } catch (dbError) {
      captureExceptionAndLog?.(dbError);
    }

    try {
      if (convo) {
        const [originalMessage, latestMessage, platformCustomer] = await Promise.all([
          db.query.conversationMessages.findFirst({
            where: and(
              eq(conversationMessages.conversationId, convo.id),
              inArray(conversationMessages.role, ["user", "staff", "ai_assistant"]),
            ),
            orderBy: [asc(conversationMessages.createdAt)],
          }),
          db.query.conversationMessages.findFirst({
            where: and(
              eq(conversationMessages.conversationId, convo.id),
              inArray(conversationMessages.role, ["user", "staff", "ai_assistant"]),
            ),
            orderBy: [desc(conversationMessages.createdAt)],
          }),
          convo.emailFrom
            ? db.query.platformCustomers.findFirst({
                where: and(eq(platformCustomers.email, convo.emailFrom)),
              })
            : null,
        ]);

        const lines = [
          `*<${link.url}|${convo.subject ?? "(No subject)"}>*`,
          `Conversation from ${platformCustomer?.name ? `${platformCustomer.name} (${platformCustomer.email})` : (convo.emailFrom ?? "Anonymous")}`,
          "",
          "*Original message:*",
          "",
          `${originalMessage?.cleanedUpText}`,
          "",
          "*Latest message:*",
          "",
          `${latestMessage?.cleanedUpText}`,
        ];

        const attachments: KnownBlock[] = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: lines.join("\n"),
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "plain_text",
                text: `Created: ${convo.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                emoji: true,
              },
              {
                type: "plain_text",
                text: `Last reply: ${latestMessage?.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                emoji: true,
              },
              ...(platformCustomer?.value
                ? [
                    {
                      type: "plain_text" as const,
                      text: `Value: ${formatCurrency(parseFloat(platformCustomer.value))}`,
                      emoji: true,
                    },
                  ]
                : []),
            ],
          },
        ];

        unfurls[link.url] = {
          blocks: attachments,
          fallback: `Conversation from ${convo.emailFrom ?? "Anonymous"}`,
        };
      } else {
        unfurls[link.url] = {
          title: `Conversation not found`,
          title_link: link.url,
          text: "This conversation link could not be resolved in the database.",
          footer: "Helper AI • Missing",
        };
      }
    } catch (unfurlBuildError) {
      captureExceptionAndLog?.(unfurlBuildError);
    }
  }

  try {
    if (Object.keys(unfurls).length > 0) {
      await slack.chat.unfurl({
        channel: event.channel,
        ts: event.message_ts,
        unfurls,
      });
    }
  } catch (slackError) {
    captureExceptionAndLog?.(slackError);
  }
}
