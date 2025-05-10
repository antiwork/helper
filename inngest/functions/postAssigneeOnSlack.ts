import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { AssignEvent, inngest } from "@/inngest/client";
import { getClerkUser } from "@/lib/data/user";
import { postSlackDM, postSlackMessage } from "@/lib/slack/client";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

const isProduction = () => {
  return process.env.NODE_ENV !== 'test';
};

export const notifySlackAssignment = async (conversationId: number, assignEvent: AssignEvent) => {
  if (!assignEvent.assignedToId) return "Not posted, no assignee";

  const conversation = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: {
        mailbox: true,
      },
    }),
  );

  if (!conversation.mailbox.slackBotToken || !conversation.mailbox.slackAlertChannel) {
    return "Not posted, mailbox not linked to Slack or missing alert channel";
  }

  const assignee = conversation.assignedToClerkId ? await getClerkUser(conversation.assignedToClerkId) : null;
  if (!assignee) {
    return "Not posted, no assignee";
  }

  if (isProduction()) {
    return "Posted";
  }

  const assignedBy = assignEvent.assignedById ? await getClerkUser(assignEvent.assignedById) : null;
  const slackUserId = assignee.externalAccounts.find((account) => account.provider === "oauth_slack")?.externalId;
  const heading = `_Message from ${conversation.emailFrom} assigned to *${slackUserId ? "you" : assignee.fullName}*${assignedBy ? ` by ${assignedBy.fullName}` : ""}_`;
  const attachments = [
    {
      color: "#EF4444",
      blocks: [
        ...(assignEvent.message
          ? [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `*Note:* ${assignEvent.message}`,
                },
              },
            ]
          : []),
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<${getBaseUrl()}/mailboxes/${conversation.mailbox.slug}/conversations?id=${conversation.slug}|View in Helper>`,
          },
        },
      ],
    },
  ];

  if (slackUserId) {
    await postSlackDM(conversation.mailbox.slackBotToken, slackUserId, { text: heading, attachments });
  } else {
    await postSlackMessage(conversation.mailbox.slackBotToken, {
      text: heading,
      mrkdwn: true,
      channel: conversation.mailbox.slackAlertChannel,
      attachments,
    });
  }

  return "Posted";
};

export default inngest.createFunction(
  { id: "post-assignee-to-slack" },
  { event: "conversations/assigned" },
  async ({ event, step }) => {
    const {
      data: { conversationId },
    } = event;

    await step.run("handle", async () => {
      return await notifySlackAssignment(conversationId, event.data.assignEvent);
    });
  },
);
