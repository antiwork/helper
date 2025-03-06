import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, subscriptions } from "@/db/schema";
import AutomatedRepliesLimitExceededEmail from "@/emails/automatedRepliesLimitExceeded";
import { inngest } from "@/inngest/client";
import {
  getClerkOrganization,
  getOrganizationAdminUsers,
  isFreeTrial,
  setPrivateMetadata,
} from "@/lib/data/organization";
import { getGmailService, getMessageMetadataById, sendGmailEmail } from "@/lib/gmail/client";
import { convertEmailToRaw } from "@/lib/gmail/lib";
import { sendEmail } from "@/lib/resend/client";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

const markSent = async (emailId: number) => {
  await db.update(conversationMessages).set({ status: "sent" }).where(eq(conversationMessages.id, emailId));
  return null;
};

const markFailed = async (emailId: number, conversationId: number, error: string) => {
  await db.transaction(async (tx) => {
    await tx.update(conversationMessages).set({ status: "failed" }).where(eq(conversationMessages.id, emailId));
    await tx.update(conversations).set({ status: "open" }).where(eq(conversations.id, conversationId));
  });
  return error;
};

export const trackWorkflowReply = async (emailId: number, mailboxSlug: string, organizationId: string) => {
  const organization = await getClerkOrganization(organizationId);
  const updatedOrganization = await setPrivateMetadata(organizationId, {
    automatedRepliesCount: (organization.privateMetadata.automatedRepliesCount ?? 0) + 1,
  });
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.clerkOrganizationId, organizationId),
  });
  const automatedRepliesCount = assertDefined(updatedOrganization.privateMetadata.automatedRepliesCount);
  if (
    !subscription &&
    isFreeTrial(organization) &&
    !organization.privateMetadata.automatedRepliesLimitExceededAt &&
    automatedRepliesCount >= SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT
  ) {
    for (const admin of await getOrganizationAdminUsers(organizationId)) {
      await sendEmail({
        from: "Helper <help@helper.ai>",
        to: [assertDefinedOrRaiseNonRetriableError(admin.emailAddresses[0]?.emailAddress)],
        subject: "Automated replies limit exceeded",
        react: AutomatedRepliesLimitExceededEmail({ mailboxSlug }),
      });
    }
    await setPrivateMetadata(organizationId, { automatedRepliesLimitExceededAt: new Date().toISOString() });
  }
};

export const postEmailToGmail = async (emailId: number) => {
  const email = await db.query.conversationMessages.findFirst({
    where: and(
      eq(conversationMessages.id, emailId),
      eq(conversationMessages.status, "queueing"),
      isNull(conversationMessages.deletedAt),
    ),
    with: {
      conversation: {
        with: {
          mailbox: {
            columns: {
              slug: true,
              clerkOrganizationId: true,
            },
            with: {
              gmailSupportEmail: true,
            },
          },
        },
      },
      files: true,
    },
  });
  if (!email) {
    // The email was likely undone
    return null;
  }

  try {
    if (!email.conversation.emailFrom) {
      return await markFailed(emailId, email.conversationId, "The conversation emailFrom is missing.");
    }
    if (!email.conversation.mailbox.gmailSupportEmail) {
      return await markFailed(emailId, email.conversationId, "The mailbox does not have a connected Gmail account.");
    }

    const pastThreadEmail = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.conversationId, email.conversationId),
        isNotNull(conversationMessages.gmailThreadId),
        isNull(conversationMessages.deletedAt),
      ),
      orderBy: desc(conversationMessages.createdAt),
    });

    const gmailService = await getGmailService(email.conversation.mailbox.gmailSupportEmail);
    const gmailSupportEmailAddress = email.conversation.mailbox.gmailSupportEmail.email;

    const rawEmail = await convertEmailToRaw(
      { ...email, conversation: { ...email.conversation, emailFrom: email.conversation.emailFrom } },
      gmailSupportEmailAddress,
    );
    const response = await sendGmailEmail(gmailService, rawEmail, pastThreadEmail?.gmailThreadId ?? null);
    if (response.status < 200 || response.status >= 300) {
      return await markFailed(emailId, email.conversationId, `Failed to post to Gmail: ${response.statusText}`);
    }
    const sentEmail = await getMessageMetadataById(
      gmailService,
      assertDefinedOrRaiseNonRetriableError(response.data.id),
    );
    const sentEmailHeaders = sentEmail?.data?.payload?.headers ?? [];

    await db
      .update(conversationMessages)
      .set({
        gmailMessageId: response.data.id,
        gmailThreadId: response.data.threadId,
        messageId: sentEmailHeaders.find((header) => header.name?.toLowerCase() === "message-id")?.value ?? null,
        references: sentEmailHeaders.find((header) => header.name?.toLowerCase() === "references")?.value ?? null,
      })
      .where(eq(conversationMessages.id, emailId));

    const result = await markSent(emailId);

    if (email.role === "workflow") {
      try {
        await trackWorkflowReply(
          emailId,
          email.conversation.mailbox.slug,
          email.conversation.mailbox.clerkOrganizationId,
        );
      } catch (error) {
        captureExceptionAndThrowIfDevelopment(error);
      }
    }

    return result;
  } catch (e) {
    captureExceptionAndThrowIfDevelopment(e);
    return await markFailed(emailId, email.conversationId, `Unexpected error: ${e}`);
  }
};

export default inngest.createFunction(
  {
    id: "post-email-to-gmail",
  },
  { event: "conversations/email.enqueued" },
  async ({ event, step }) => {
    const {
      data: { messageId },
    } = event;

    await step.run("handle", async () => await postEmailToGmail(messageId));
  },
);
