import { User } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { GaxiosResponse } from "gaxios";
import { OAuth2Client } from "google-auth-library";
import { htmlToText } from "html-to-text";
import { NonRetriableError } from "inngest";
import { JSDOM } from "jsdom";
import { AddressObject, Attachment, ParsedMail, simpleParser } from "mailparser";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, files, gmailSupportEmails, mailboxes } from "@/db/schema";
import { env } from "@/env";
import { inngest } from "@/inngest/client";
import { updateConversation } from "@/lib/data/conversation";
import { createConversationMessage } from "@/lib/data/conversationMessage";
import { createAndUploadFile, finishFileUpload } from "@/lib/data/files";
import { matchesTransactionalEmailAddress } from "@/lib/data/transactionalEmailAddressRegex";
import { findUserByEmail } from "@/lib/data/user";
import { extractAddresses, parseEmailAddress } from "@/lib/emails";
import { getGmailService, getMessageById, getMessagesFromHistoryId } from "@/lib/gmail/client";
import { respondToEmail } from "@/lib/respondToEmail";
import { extractEmailPartsFromDocument } from "@/lib/shared/html";
import { captureExceptionAndLogIfDevelopment, captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { generateS3Key, getS3Url, uploadFile } from "@/s3/utils";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";
import { generateFilePreview } from "./generateFilePreview";

const IGNORED_GMAIL_CATEGORIES = ["CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS", "CATEGORY_SOCIAL"];

const isNewThread = (gmailMessageId: string, gmailThreadId: string) => gmailMessageId === gmailThreadId;

const assignBasedOnCc = async (mailboxId: number, conversationId: number, emailCc: string) => {
  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.id, mailboxId),
    columns: {
      clerkOrganizationId: true,
    },
  });
  if (!mailbox) return;

  const ccAddresses = extractAddresses(emailCc);

  for (const ccAddress of ccAddresses) {
    const ccStaffUser = await findUserByEmail(mailbox.clerkOrganizationId, ccAddress);
    if (ccStaffUser) {
      await updateConversation(conversationId, {
        set: { assignedToClerkId: ccStaffUser.id },
        message: "Auto-assigned based on CC",
        skipAblyEvents: true,
      });
      break;
    }
  }
};

export const createMessageAndProcessAttachments = async (
  mailboxId: number,
  parsedEmail: ParsedMail,
  gmailMessageId: string,
  gmailThreadId: string,
  conversation: { id: number; slug: string },
  staffUser: User | null,
) => {
  const { parsedEmailFrom, parsedEmailBody } = getParsedEmailInfo(parsedEmail);
  const { processedHtml, fileSlugs } = await extractAndUploadInlineImages(parsedEmailBody);

  const references = parsedEmail.references
    ? Array.isArray(parsedEmail.references)
      ? parsedEmail.references.join(" ")
      : parsedEmail.references
    : null;
  const emailTo = parsedEmail.to ? addressesToString(parsedEmail.to) : null;
  const emailCc = parsedEmail.cc ? addressesToString(parsedEmail.cc) : null;
  const emailBcc = parsedEmail.bcc ? addressesToString(parsedEmail.bcc) : null;

  const newEmail = await createConversationMessage({
    role: staffUser ? "staff" : "user",
    status: staffUser ? "sent" : null,
    clerkUserId: staffUser?.id,
    gmailMessageId,
    gmailThreadId,
    messageId: parsedEmail.messageId?.length ? parsedEmail.messageId : null,
    references,
    conversationId: conversation.id,
    emailFrom: parsedEmailFrom.address,
    emailTo,
    emailCc: emailCc ? extractAddresses(emailCc) : null,
    emailBcc: emailBcc ? extractAddresses(emailBcc) : null,
    body: processedHtml,
    cleanedUpText: htmlToText(
      isNewThread(gmailMessageId, gmailThreadId) ? processedHtml : extractQuotations(processedHtml),
    ),
    isPerfect: false,
    isPinned: false,
    isFlaggedAsBad: false,
    createdAt: parsedEmail.date ?? new Date(),
  });

  await finishFileUpload({ fileSlugs, messageId: newEmail.id });

  if (emailCc && !staffUser) {
    const conversationRecord = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
      columns: {
        assignedToClerkId: true,
      },
    });

    if (!conversationRecord?.assignedToClerkId) {
      await assignBasedOnCc(mailboxId, conversation.id, emailCc);
    }
  }

  try {
    await processGmailAttachments(conversation.slug, newEmail.id, parsedEmail.attachments);
  } catch (error) {
    captureExceptionAndThrowIfDevelopment(error);
  }
  return newEmail;
};

export default inngest.createFunction(
  {
    id: "handle-gmail-webhook-event",
    // Retries are disabled for cost reasons and because the logic currently isn't idempotent
    // (this function will execute once per Gmail webhook event, so adding an extra step or retry
    // can significantly increase costs. When necessary, we can optimize this function with either
    // an Inngest debounce + timeout or by batching webhook events).
    retries: 0,
  },
  { event: "gmail/webhook.received" },
  async ({ event, step }) => {
    const {
      data: { body, headers },
    } = event;

    return await step.run("handle", async () => await handleGmailWebhookEvent(body, headers));
  },
);

export const assertSuccessResponseOrThrow = <T>(response: GaxiosResponse<T>): GaxiosResponse<T> => {
  if (response.status < 200 || response.status >= 300) throw new Error(`Request failed: ${response.statusText}`);
  return response;
};

const getParsedEmailInfo = (parsedEmail: ParsedMail) => {
  const parsedEmailFrom = assertDefinedOrRaiseNonRetriableError(parseEmailAddress(parsedEmail.from?.text ?? ""));
  const parsedEmailBody = parseEmailBody(parsedEmail);
  return { parsedEmail, parsedEmailFrom, parsedEmailBody };
};

export const handleGmailWebhookEvent = async (body: any, headers: any) => {
  // Next.js API route handlers will lowercase header keys (e.g. "Authorization" -> "authorization"), but not Inngest.
  // For consistency across all potential invocations of this function, we can lowercase everything here.
  const normalizedHeaders = Object.fromEntries(
    Object.entries(z.record(z.string()).parse(headers)).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const data = await authorizeGmailRequest(
    GmailWebhookBodySchema.parse(body),
    GmailWebhookHeadersSchema.parse(normalizedHeaders),
  );

  const gmailSupportEmail = await db.query.gmailSupportEmails.findFirst({
    where: eq(gmailSupportEmails.email, data.emailAddress),
    with: {
      mailboxes: {
        columns: {
          id: true,
          clerkOrganizationId: true,
        },
      },
    },
  });
  const mailboxId = gmailSupportEmail?.mailboxes[0]?.id;
  const organizationId = gmailSupportEmail?.mailboxes[0]?.clerkOrganizationId;
  if (!(gmailSupportEmail && mailboxId && organizationId)) {
    return `Gmail support email record not found for ${data.emailAddress}`;
  }
  Sentry.setContext("gmailSupportEmail info", {
    mailboxId,
    gmailSupportEmailId: gmailSupportEmail.id,
    gmailSupportEmailHistoryId: gmailSupportEmail.historyId,
    dataEmailAddress: data.emailAddress,
    dataHistoryId: data.historyId,
  });

  const client = await getGmailService(gmailSupportEmail);
  let histories = [];

  // The history ID on the GmailSupportEmail record expires after a certain amount of time, so we
  // need to replace it with a valid history ID and may need to perform a full sync to retrieve missing emails.
  // Refs: https://developers.google.com/gmail/api/reference/rest/v1/users.history/list#query-parameters
  //       https://developers.google.com/gmail/api/guides/sync#full_synchronization
  const historyId = gmailSupportEmail.historyId ?? data.historyId;
  const response = await getMessagesFromHistoryId(client, historyId.toString());
  if (response.status !== 404) {
    assertSuccessResponseOrThrow(response);
    histories = response.data.history ?? [];
  } else {
    captureExceptionAndLogIfDevelopment(new Error("Cached historyId expired"));
    histories =
      (await getMessagesFromHistoryId(client, data.historyId.toString()).then(assertSuccessResponseOrThrow)).data
        .history ?? [];
  }

  const results: string[] = [];

  for (const history of histories) {
    for (const { message } of history.messagesAdded ?? []) {
      if (!(message?.id && message.threadId)) {
        results.push("Skipped - missing message ID or thread ID");
        continue;
      }

      const gmailMessageId = message.id;
      const threadId = message.threadId;
      const labelIds = message.labelIds ?? [];

      const existingEmail = await db.query.conversationMessages.findFirst({
        where: eq(conversationMessages.gmailMessageId, gmailMessageId),
      });
      if (existingEmail) {
        results.push(`Skipped - message ${gmailMessageId} already exists`);
        continue;
      }

      try {
        const response = await getMessageById(client, gmailMessageId).then(assertSuccessResponseOrThrow);
        const parsedEmail = await simpleParser(
          Buffer.from(assertDefined(response.data.raw), "base64url").toString("utf-8"),
        );
        const { parsedEmailFrom } = getParsedEmailInfo(parsedEmail);

        const emailSentFromMailbox = parsedEmailFrom.address === gmailSupportEmail.email;
        if (emailSentFromMailbox) {
          results.push(`Skipped - message ${gmailMessageId} sent from mailbox`);
          continue;
        }

        const staffUser = await findUserByEmail(organizationId, parsedEmailFrom.address);
        const isFirstMessage = isNewThread(gmailMessageId, threadId);
        const shouldIgnore =
          (!!staffUser && !isFirstMessage) ||
          labelIds.some((id) => IGNORED_GMAIL_CATEGORIES.includes(id)) ||
          (await matchesTransactionalEmailAddress(parsedEmailFrom.address));

        const createNewConversation = async () => {
          return await db
            .insert(conversations)
            .values({
              mailboxId,
              emailFrom: parsedEmailFrom.address,
              emailFromName: parsedEmailFrom.name,
              subject: parsedEmail.subject,
              status: shouldIgnore ? "closed" : "open",
              closedAt: shouldIgnore ? new Date() : null,
              conversationProvider: "gmail",
              source: "email",
              isPrompt: false,
              isVisitor: false,
            })
            .returning({ id: conversations.id, slug: conversations.slug, status: conversations.status })
            .then(takeUniqueOrThrow);
        };

        let conversation;
        if (isNewThread(gmailMessageId, threadId)) {
          conversation = await createNewConversation();
        } else {
          const previousEmail = await db.query.conversationMessages.findFirst({
            where: eq(conversationMessages.gmailThreadId, threadId),
            orderBy: (emails, { desc }) => [desc(emails.createdAt)],
            with: {
              conversation: {
                columns: {
                  id: true,
                  slug: true,
                  status: true,
                },
              },
            },
          });
          // If a conversation doesn't already exist for this email, create one anyway
          // (since we likely dropped the initial email).
          conversation = previousEmail?.conversation ?? (await createNewConversation());
        }
        if (conversation.status === "closed" && !shouldIgnore) {
          await updateConversation(conversation.id, { set: { status: "open" } });
        }

        const newEmail = await createMessageAndProcessAttachments(
          mailboxId,
          parsedEmail,
          gmailMessageId,
          threadId,
          conversation,
          staffUser,
        );

        if (!shouldIgnore) {
          // TODO: make sure respondToEmail sets to open correctly
          // TODO: make this a job?
          await respondToEmail(newEmail.id);
          results.push(`Created and responded to message ${newEmail.id}`);
          continue;
        }

        results.push(`Created message ${newEmail.id} (no response needed)`);
      } catch (error) {
        captureExceptionAndThrowIfDevelopment(error);
        results.push(`Error processing message ${gmailMessageId}: ${error}`);
        continue;
      }
    }
  }

  await db
    .update(gmailSupportEmails)
    .set({ historyId: data.historyId })
    .where(eq(gmailSupportEmails.id, gmailSupportEmail.id));

  return { results };
};

const addressesToString = (value: AddressObject | AddressObject[]) => {
  return Array.isArray(value) ? value.map((to) => to.text).join(", ") : value.text;
};

export const GmailWebhookBodySchema = z.object({
  message: z.object({
    data: z.string(),
    // The ID assigned by Google when the message is published. Guaranteed to be unique within the pub/sub topic.
    // https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage
    messageId: z.string(),
    publishTime: z.string(),
  }),
  subscription: z.string(),
});

export const GmailWebhookHeadersSchema = z.object({
  authorization: z.string().min(1),
});

const GmailWebhookDataSchema = z.object({
  emailAddress: z.string().email(),
  historyId: z.number(),
});

const authorizeGmailRequest = async (
  body: z.infer<typeof GmailWebhookBodySchema>,
  headers: z.infer<typeof GmailWebhookHeadersSchema>,
) => {
  try {
    const ticket = await new OAuth2Client().verifyIdToken({
      idToken: assertDefined(headers.authorization.split(" ")[1]),
    });
    const claim = ticket.getPayload();
    if (!claim?.email || claim.email !== env.GOOGLE_PUBSUB_CLAIM_EMAIL)
      throw new Error(`Invalid claim email: ${claim?.email}`);
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
    throw new NonRetriableError("Invalid token");
  }
  const rawData = JSON.parse(Buffer.from(body.message.data, "base64").toString("utf-8"));
  return GmailWebhookDataSchema.parse(rawData);
};

const extractQuotations = (html: string) => {
  return extractEmailPartsFromDocument(new JSDOM(html).window.document).mainContent;
};

const processGmailAttachments = async (conversationSlug: string, messageId: number, attachments: Attachment[]) => {
  await Promise.all(
    attachments.map(async (attachment) => {
      try {
        const fileName = attachment.filename ?? "untitled";
        const s3Key = generateS3Key(["attachments", conversationSlug], fileName);
        const contentType = attachment.contentType ?? "application/octet-stream";

        const { id: fileId } = await db
          .insert(files)
          .values({
            messageId,
            name: fileName,
            url: getS3Url(s3Key),
            mimetype: contentType,
            size: attachment.size,
            isInline: false,
            isPublic: false,
          })
          .returning({ id: files.id })
          .then(takeUniqueOrThrow);

        await uploadFile(attachment.content, s3Key, contentType);
        await generateFilePreview(fileId);
      } catch (error) {
        captureExceptionAndThrowIfDevelopment(error);
      }
    }),
  );
};

const parseEmailBody = (parsedEmail: ParsedMail) => {
  // Replace \r\n with <br/> if the body is plain text
  const parsedEmailBody =
    parsedEmail.html === false
      ? (parsedEmail.textAsHtml ?? parsedEmail.text)?.replace(/\r\n/g, "<br/>")
      : parsedEmail.html;
  if (!parsedEmailBody) return "";

  // Extract the body content
  const document = new JSDOM(parsedEmailBody).window.document;
  let content = document.body ? document.body.innerHTML : parsedEmailBody;

  // Remove trailing <br/> tags
  content = content.replace(/(<br\s*\/?>)+$/i, "");

  // Normalize Unicode characters
  content = content.normalize("NFKD");

  return content;
};

const extractAndUploadInlineImages = async (html: string) => {
  const fileSlugs: string[] = [];
  let processedHtml = html;

  const imageMatches = Array.from(html.matchAll(/<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/gi));

  await Promise.all(
    imageMatches.map(async ([match, extension, base64Data]) => {
      try {
        const mimetype = `image/${extension}`;
        const buffer = Buffer.from(assertDefined(base64Data), "base64");
        const fileName = `image.${extension}`;

        const file = await createAndUploadFile({
          data: buffer,
          fileName,
          prefix: "inline-attachments",
          mimetype,
          isInline: true,
        });

        processedHtml = processedHtml.replace(match, match.replace(/src="[^"]+"/i, `src="${file.url}"`));
        fileSlugs.push(file.slug);
      } catch (error) {
        captureExceptionAndLogIfDevelopment(error);
      }
    }),
  );

  return { processedHtml, fileSlugs };
};
