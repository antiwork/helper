import { and, eq, inArray } from "drizzle-orm";
import { gmail_v1 } from "googleapis";
import { htmlToText } from "html-to-text";
import { simpleParser } from "mailparser";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationMessages, conversations, gmailSupportEmails, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { findUserByEmail } from "@/lib/data/user";
import { parseEmailAddress } from "@/lib/emails";
import { getGmailService, getLast10GmailThreads, getMessageById, getThread, GmailClient } from "@/lib/gmail/client";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";
import {
  assertSuccessResponseOrThrow,
  createMessageAndProcessAttachments,
  extractAndUploadInlineImages,
  extractQuotations,
  getParsedEmailInfo,
  isNewThread,
} from "./handleGmailWebhookEvent";

export default inngest.createFunction(
  {
    id: "import-recent-gmail-threads",
    retries: 1,
  },
  { event: "gmail/import-recent-threads" },
  async ({ event, step }) => {
    const {
      data: { gmailSupportEmailId },
    } = event;

    const threads = await step.run("import", async () => {
      return await getNewGmailThreads(gmailSupportEmailId);
    });

    const results = await Promise.all(
      threads.map((thread) => {
        return step.run("process-thread", async () => {
          return await processGmailThread(gmailSupportEmailId, assertDefinedOrRaiseNonRetriableError(thread.id));
        });
      }),
    );

    return results;
  },
);

export const excludeExistingGmailThreads = async (
  gmailSupportEmailId: number,
  gmailThreads: gmail_v1.Schema$Thread[],
) => {
  const gmailThreadIds = gmailThreads.map((thread) => assertDefinedOrRaiseNonRetriableError(thread.id));
  const existingEmails = await db
    .selectDistinct({ gmailThreadId: conversationMessages.gmailThreadId })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
    .innerJoin(mailboxes, eq(mailboxes.id, conversations.mailboxId))
    .where(
      and(
        eq(mailboxes.gmailSupportEmailId, gmailSupportEmailId),
        inArray(conversationMessages.gmailThreadId, gmailThreadIds),
      ),
    );
  const existingThreads = new Set(
    existingEmails.flatMap((email) => (email.gmailThreadId ? [email.gmailThreadId] : [])),
  );
  return gmailThreads.filter((thread) => !existingThreads.has(assertDefinedOrRaiseNonRetriableError(thread.id)));
};

export const getNewGmailThreads = async (gmailSupportEmailId: number) => {
  const gmailSupportEmail = await db.query.gmailSupportEmails
    .findFirst({
      where: eq(gmailSupportEmails.id, gmailSupportEmailId),
    })
    .then(assertDefinedOrRaiseNonRetriableError);
  const client = await getGmailService(gmailSupportEmail);
  const response = await getLast10GmailThreads(client);
  assertSuccessResponseOrThrow(response);
  const threads = response.data.threads ?? [];
  return excludeExistingGmailThreads(gmailSupportEmailId, threads);
};

export const processGmailThread = async (
  gmailSupportEmailId: number,
  gmailThreadId: string,
  conversationOverrides?: Partial<typeof conversations.$inferSelect>,
) => {
  const gmailSupportEmail = await db.query.gmailSupportEmails
    .findFirst({
      where: eq(gmailSupportEmails.id, gmailSupportEmailId),
    })
    .then(assertDefinedOrRaiseNonRetriableError);
  const client = await getGmailService(gmailSupportEmail);
  return processGmailThreadWithClient(client, gmailSupportEmail, gmailThreadId, conversationOverrides);
};

export const processGmailThreadWithClient = async (
  client: GmailClient,
  gmailSupportEmail: typeof gmailSupportEmails.$inferSelect,
  gmailThreadId: string,
  conversationOverrides?: Partial<typeof conversations.$inferSelect>,
) => {
  const response = await getThread(client, gmailThreadId);
  assertSuccessResponseOrThrow(response);
  const messages = response.data.messages ?? [];
  // This happened at least once in local development; this will use Sentry to track how common this case is.
  if (messages[0]?.id !== gmailThreadId) {
    const errorMessage = `Thread ID ${gmailThreadId} doesn't match the first message ID ${messages[0]?.id}`;
    captureExceptionAndThrowIfDevelopment(new Error(errorMessage));
    return { gmailThreadId, error: errorMessage };
  }
  const firstMessageHeaders = messages[0].payload?.headers;
  const parsedEmailFrom = assertDefinedOrRaiseNonRetriableError(
    parseEmailAddress(firstMessageHeaders?.find((h) => h.name?.toLowerCase() === "from")?.value ?? ""),
  );
  const subject = firstMessageHeaders?.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "";
  const mailbox = await db.query.mailboxes
    .findFirst({
      where: eq(mailboxes.gmailSupportEmailId, gmailSupportEmail.id),
      columns: {
        id: true,
        clerkOrganizationId: true,
      },
    })
    .then(assertDefinedOrRaiseNonRetriableError);
  const conversation = await db
    .insert(conversations)
    .values({
      mailboxId: mailbox.id,
      emailFrom: parsedEmailFrom.address,
      emailFromName: parsedEmailFrom.name,
      subject,
      status: "open",
      conversationProvider: "gmail",
      ...conversationOverrides,
    })
    .returning({ id: conversations.id, slug: conversations.slug })
    .then(takeUniqueOrThrow);

  let lastUserEmailCreatedAt: Date | null = null;
  const messageInfos = await Promise.all(
    messages.map((message) => {
      return getMessageById(client, assertDefinedOrRaiseNonRetriableError(message.id)).then(
        assertSuccessResponseOrThrow,
      );
    }),
  );
  for (const message of messageInfos) {
    const parsedEmail = await simpleParser(
      Buffer.from(assertDefinedOrRaiseNonRetriableError(message.data.raw), "base64url").toString("utf-8"),
    );
    const { parsedEmailFrom, parsedEmailBody } = getParsedEmailInfo(parsedEmail);
    const { processedHtml, fileSlugs } = await extractAndUploadInlineImages(parsedEmailBody);
    const cleanedUpText = htmlToText(
      isNewThread(assertDefinedOrRaiseNonRetriableError(message.data.id), gmailThreadId)
        ? processedHtml
        : extractQuotations(processedHtml),
    );
    // Process messages serially since we rely on the database ID for message ordering
    const staffUser = await findUserByEmail(mailbox.clerkOrganizationId, parsedEmailFrom.address);
    await createMessageAndProcessAttachments(
      mailbox.id,
      parsedEmail,
      parsedEmailFrom,
      processedHtml,
      cleanedUpText,
      fileSlugs,
      assertDefinedOrRaiseNonRetriableError(message.data.id),
      gmailThreadId,
      conversation,
      staffUser,
    );
    const isUserEmail = parsedEmailFrom.address.toLowerCase() !== gmailSupportEmail.email.toLowerCase();
    if (isUserEmail && parsedEmail.date && (!lastUserEmailCreatedAt || lastUserEmailCreatedAt < parsedEmail.date)) {
      lastUserEmailCreatedAt = parsedEmail.date;
    }
  }
  await db.update(conversations).set({ lastUserEmailCreatedAt }).where(eq(conversations.id, conversation.id));

  return {
    gmailThreadId,
    lastUserEmailCreatedAt,
    conversationId: conversation.id,
    conversationSlug: conversation.slug,
  };
};
