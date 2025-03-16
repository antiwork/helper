import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { assertDefinedOrRaiseNonRetriableError } from "@/inngest/utils";
import { postSlackMessage } from "@/lib/slack/client";
import { getSuggestedEditButtons } from "@/lib/slack/shared";

export const notifySlackSuggestedEdit = async (faqId: number) => {
  const faq = assertDefinedOrRaiseNonRetriableError(
    await db.query.faqs.findFirst({
      where: eq(faqs.id, faqId),
      with: {
        mailbox: true,
      },
    }),
  );

  if (!faq.mailbox.slackBotToken || !faq.mailbox.slackAlertChannel) {
    return "Not posted, mailbox not linked to Slack or missing alert channel";
  }

  const heading = `_New suggested edit for the knowledge bank_`;
  const attachments = [
    {
      color: "#EF4444",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Suggested Content:*\n${faq.content}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<${getBaseUrl()}/mailboxes/${faq.mailbox.slug}/settings?tab=knowledge|View in Helper>`,
          },
        },
        getSuggestedEditButtons(faq.id),
      ],
    },
  ];

  await postSlackMessage(faq.mailbox.slackBotToken, {
    text: heading,
    mrkdwn: true,
    channel: faq.mailbox.slackAlertChannel,
    attachments,
  });

  return "Posted";
};

export default inngest.createFunction(
  { id: "notify-suggested-edit" },
  { event: "faqs/suggested.created" },
  async ({ event, step }) => {
    const { faqId } = event.data;

    return await step.run("notify-suggested-edit", () => notifySlackSuggestedEdit(faqId));
  },
);
