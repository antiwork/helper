import { SlackEvent, WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createMessageBlocks } from "@/lib/slack/vipNotifications";

export type LinkSharedEvent = SlackEvent & {
  type: "link_shared";
  links: {
    url: string;
    domain: string;
  }[];
  channel: string;
  message_ts: string;
};

export async function handleSlackUnfurl(event: LinkSharedEvent, slackBotToken: string) {
  const links = event.links ?? [];
  const slack = new WebClient(slackBotToken);
  const regex = /[?&]id=([a-zA-Z0-9_-]+)/u;
  const unfurls: Record<string, any> = {};

  for (const link of links) {
    const match = regex.exec(link.url);
    if (!match) continue;

    const slugOrId = match[1];
    let convo = undefined;

    try {
      if (slugOrId) {
        convo = await db.query.conversations.findFirst({
          where: eq(conversations.slug, slugOrId),
          with: { mailbox: true },
        });

        if (!convo) {
          try {
            convo = await db.query.conversations.findFirst({
              where: eq(conversations.id, Number(slugOrId)),
              with: { mailbox: true },
            });
          } catch (idParseError) {
            captureExceptionAndLog?.(idParseError);
          }
        }
      }
    } catch (dbError) {
      captureExceptionAndLog?.(dbError);
    }

    try {
      if (convo) {
        const attachments = createMessageBlocks({
          conversation: convo,
          messages: [
            {
              type: "original",
              body: convo.subject ?? `Conversation with ${convo.emailFromName ?? convo.emailFrom}`,
            },
          ],
          customerLinks: [],
          closed: convo.status === "closed",
        });

        unfurls[link.url] = {
          title: convo.subject ?? `Conversation with ${convo.emailFromName ?? convo.emailFrom}`,
          title_link: link.url,
          text: `New conversation from *${convo.emailFromName ?? "Unknown"}*`,
          attachments,
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
