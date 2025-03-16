import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { ensureCleanedUpText, getTextWithConversationSubject } from "@/lib/data/conversationMessage";
import { upsertPlatformCustomer } from "@/lib/data/platformCustomer";
import { fetchMetadata } from "@/lib/data/retrieval";

export const respondToEmail = async (messageId: number) => {
  const email = await db.query.conversationMessages
    .findFirst({
      where: eq(conversationMessages.id, messageId),
      with: {
        conversation: {
          with: {
            mailbox: {
              columns: {
                slug: true,
                autoRespondEmailToChat: true,
                widgetHost: true,
                id: true,
                name: true,
                disableAutoResponseForVips: true,
              },
            },
          },
        },
      },
    })
    .then(assertDefined);
  if (email.conversation.status === "spam") {
    return;
  }

  await ensureCleanedUpText(email);

  const customerMetadata = email.emailFrom
    ? await fetchMetadata(email.emailFrom, email.conversation.mailbox.slug)
    : null;
  if (customerMetadata) {
    await db
      .update(conversationMessages)
      .set({ metadata: customerMetadata ?? null })
      .where(eq(conversationMessages.id, messageId));

    if (email.emailFrom) {
      await upsertPlatformCustomer({
        email: email.emailFrom,
        mailboxId: email.conversation.mailboxId,
        customerMetadata: customerMetadata.metadata,
      });
    }
  }

  const emailText = (await getTextWithConversationSubject(email.conversation, email)).trim();
  if (emailText.length === 0) {
    return;
  }

  const { mailbox } = email.conversation;

  // TODO: only link to widget if widgetHost is set
  if (mailbox.autoRespondEmailToChat) {
    await inngest.send({
      name: "conversations/auto-response.create",
      data: { messageId: email.id },
    });
  }
};
