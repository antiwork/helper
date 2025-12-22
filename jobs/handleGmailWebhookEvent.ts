import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { ParsedMailbox } from "email-addresses";
import { GaxiosResponse } from "gaxios";
import { OAuth2Client } from "google-auth-library";
import { htmlToText } from "html-to-text";
import { JSDOM } from "jsdom";
import { AddressObject, Attachment, ParsedMail, simpleParser } from "mailparser";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import {
  BasicUserProfile,
  conversationEvents,
  conversationMessages,
  conversations,
  files,
  gmailSupportEmails,
  mailboxes,
} from "@/db/schema";
import { runAIQuery } from "@/lib/ai";
import { MINI_MODEL } from "@/lib/ai/core";
import { updateConversation } from "@/lib/data/conversation";
import { createConversationMessage } from "@/lib/data/conversationMessage";
import { createAndUploadFile, finishFileUpload, generateKey, uploadFile } from "@/lib/data/files";
import { matchesTransactionalEmailAddress } from "@/lib/data/transactionalEmailAddressRegex";
import { getBasicProfileByEmail } from "@/lib/data/user";
import { extractAddresses, parseEmailAddress } from "@/lib/emails";
import { env } from "@/lib/env";
import { getGmailService, getMessageById, getMessagesFromHistoryId } from "@/lib/gmail/client";
import { extractEmailPartsFromDocument } from "@/lib/shared/html";
import { captureExceptionAndLog, captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { generateFilePreview } from "./generateFilePreview";
import { triggerEvent } from "./trigger";
import { assertDefinedOrRaiseNonRetriableError, NonRetriableError } from "./utils";

const IGNORED_GMAIL_CATEGORIES = ["CATEGORY_PROMOTIONS", "CATEGORY_UPDATES", "CATEGORY_FORUMS", "CATEGORY_SOCIAL"];

export const isNewThread = (gmailMessageId: string, gmailThreadId: string) => gmailMessageId === gmailThreadId;

const isThankYouOrAutoResponse = async (
  mailbox: typeof mailboxes.$inferSelect,
  emailContent: string,
): Promise<boolean> => {
  try {
    const content = (
      await runAIQuery({
        system: [
          "Determine if an email is either a standalone thank you message with no follow-up questions OR an auto-response (like out-of-office or automated confirmation).",
          "Respond with 'yes' if the email EITHER:",
          "1. Is just a thank you message with no follow-up questions, additional information, or other instructions",
          "2. Contains wording like 'We'll respond to you as soon as we can.'. Always respond with 'yes' if similar wording to this is present even if there are other instructions present.",
          "Respond with 'no' followed by a reason if the email contains questions, information that may an agent may need to check, or otherwise requires a response.",
        ].join("\n"),
        mailbox,
        temperature: 0,
        messages: [{ role: "user", content: emailContent }],
        queryType: "email_auto_ignore",
        model: MINI_MODEL,
        functionId: "email-auto-ignore-detector",
        maxTokens: 500,
      })
    ).text;

    return content.toLowerCase().trim() === "yes";
  } catch (error) {
    captureExceptionAndLog(error);
    return false;
  }
};

export const createMessageAndProcessAttachments = async (
  parsedEmail: ParsedMail,
  parsedEmailFrom: ParsedMailbox,
  processedHtml: string,
  cleanedUpText: string,
  fileSlugs: string[],
  gmailMessageId: string,
  gmailThreadId: string,
  conversation: { id: number; slug: string },
  staffUser?: BasicUserProfile | null,
) => {
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
    userId: staffUser?.id,
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
    cleanedUpText,
    isPerfect: false,
    isPinned: false,
    isFlaggedAsBad: false,
    createdAt: parsedEmail.date ?? new Date(),
  });

  await finishFileUpload({ fileSlugs, messageId: newEmail.id });

  try {
    await processGmailAttachments(conversation.slug, newEmail.id, parsedEmail.attachments);
  } catch (error) {
    captureExceptionAndThrowIfDevelopment(error);
  }
  return newEmail;
};

export const assertSuccessResponseOrThrow = <T>(response: GaxiosResponse<T>): GaxiosResponse<T> => {
  if (response.status < 200 || response.status >= 300) throw new Error(`Request failed: ${response.statusText}`);
  return response;
};

export const getParsedEmailInfo = (parsedEmail: ParsedMail) => {
  const parsedEmailFrom = assertDefinedOrRaiseNonRetriableError(parseEmailAddress(parsedEmail.from?.text ?? ""));
  const parsedEmailBody = parseEmailBody(parsedEmail);
  return { parsedEmail, parsedEmailFrom, parsedEmailBody };
};

export const handleGmailWebhookEvent = async ({ body, headers }: any) => {
  // Next.js API route handlers will lowercase header keys (e.g. "Authorization" -> "authorization"), but not Inngest.
  // For consistency across all potential invocations of this function, we can lowercase everything here.
  const normalizedHeaders = Object.fromEntries(
    Object.entries(z.record(z.string(), z.string()).parse(headers)).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const data = await authorizeGmailRequest(
    GmailWebhookBodySchema.parse(body),
    GmailWebhookHeadersSchema.parse(normalizedHeaders),
  );

  const gmailSupportEmail = await db.query.gmailSupportEmails.findFirst({
    where: eq(gmailSupportEmails.email, data.emailAddress),
    with: {
      mailboxes: true,
    },
  });
  const mailbox = gmailSupportEmail?.mailboxes[0];
  if (!mailbox || !gmailSupportEmail?.accessToken || !gmailSupportEmail.refreshToken) {
    return `Valid gmail support email record not found for ${data.emailAddress}`;
  }
  Sentry.setContext("gmailSupportEmail info", {
    mailboxId: mailbox.id,
    gmailSupportEmailId: gmailSupportEmail.id,
    gmailSupportEmailHistoryId: gmailSupportEmail.historyId,
    dataEmailAddress: data.emailAddress,
    dataHistoryId: data.historyId,
  });

  const client = getGmailService(gmailSupportEmail);
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
    captureExceptionAndLog(new Error("Cached historyId expired"));
    histories =
      (await getMessagesFromHistoryId(client, data.historyId.toString()).then(assertSuccessResponseOrThrow)).data
        .history ?? [];
  }

  const messagesAdded = histories.flatMap((h) => h.messagesAdded ?? []);
  const results: {
    message: string;
    responded?: boolean;
    ignoreReason?: string;
    gmailMessageId?: string;
    gmailThreadId?: string;
    messageId?: number;
    conversationSlug?: string;
  }[] = [];

  for (const { message } of messagesAdded) {
    if (!(message?.id && message.threadId)) {
      results.push({
        message: "Skipped - missing message ID or thread ID",
        gmailMessageId: message?.id ?? undefined,
        gmailThreadId: message?.threadId ?? undefined,
      });
      continue;
    }

    const gmailMessageId = message.id;
    const gmailThreadId = message.threadId;
    const labelIds = message.labelIds ?? [];

    const existingEmail = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.gmailMessageId, gmailMessageId),
    });
    if (existingEmail) {
      results.push({ message: `Skipped - message ${gmailMessageId} already exists`, gmailMessageId, gmailThreadId });
      continue;
    }

    try {
      const response = await getMessageById(client, gmailMessageId).then(assertSuccessResponseOrThrow);
      const parsedEmail = await simpleParser(
        Buffer.from(assertDefined(response.data.raw), "base64url").toString("utf-8"),
      );
      const { parsedEmailFrom, parsedEmailBody } = getParsedEmailInfo(parsedEmail);

      const emailSentFromMailbox = parsedEmailFrom.address === gmailSupportEmail.email;
      if (emailSentFromMailbox) {
        results.push({
          message: `Skipped - message ${gmailMessageId} sent from mailbox`,
          gmailMessageId,
          gmailThreadId,
        });
        continue;
      }

      const { processedHtml, fileSlugs } = await extractAndUploadInlineImages(parsedEmailBody);
      const cleanedUpText = htmlToText(
        isNewThread(gmailMessageId, gmailThreadId) ? processedHtml : extractQuotations(processedHtml),
      );

      const staffUser = await getBasicProfileByEmail(parsedEmailFrom.address);
      const isFirstMessage = isNewThread(gmailMessageId, gmailThreadId);

      let ignoreReason: string | undefined;
      if (!!staffUser && !isFirstMessage) {
        ignoreReason = "Message is from staff";
      } else if (labelIds.some((id) => IGNORED_GMAIL_CATEGORIES.includes(id))) {
        ignoreReason = `Message is in an ignored category (${labelIds.filter((id) => IGNORED_GMAIL_CATEGORIES.includes(id)).join(", ")})`;
      } else if (matchesTransactionalEmailAddress(parsedEmailFrom.address)) {
        ignoreReason = `Email address is transactional (${parsedEmailFrom.address})`;
      } else {
        const isAutomatedResponseOrThankYou = await isThankYouOrAutoResponse(mailbox, cleanedUpText);
        if (isAutomatedResponseOrThankYou) ignoreReason = "Message is an automated response or thank you";
      }

      const createNewConversation = () =>
        db
          .insert(conversations)
          .values({
            emailFrom: parsedEmailFrom.address,
            emailFromName: parsedEmailFrom.name,
            subject: parsedEmail.subject,
            status: ignoreReason ? "closed" : "open",
            closedAt: ignoreReason ? new Date() : null,
            conversationProvider: "gmail",
            source: "email",
            isPrompt: false,
            isVisitor: false,
            assignedToAI: !!mailbox.preferences?.autoRespondEmailToChat,
            anonymousSessionId: null,
          })
          .returning({
            id: conversations.id,
            slug: conversations.slug,
            status: conversations.status,
            assignedToAI: conversations.assignedToAI,
          })
          .then(takeUniqueOrThrow);

      let conversation;
      if (isNewThread(gmailMessageId, gmailThreadId)) {
        conversation = await createNewConversation();
      } else {
        const previousEmail = await db.query.conversationMessages.findFirst({
          where: eq(conversationMessages.gmailThreadId, gmailThreadId),
          orderBy: (emails, { desc }) => [desc(emails.createdAt)],
          with: {
            conversation: {
              columns: {
                id: true,
                slug: true,
                status: true,
                assignedToAI: true,
              },
            },
          },
        });
        // If a conversation doesn't already exist for this email, create one anyway
        // (since we likely dropped the initial email).
        conversation = previousEmail?.conversation ?? (await createNewConversation());
      }

      const newEmail = await createMessageAndProcessAttachments(
        parsedEmail,
        parsedEmailFrom,
        processedHtml,
        cleanedUpText,
        fileSlugs,
        gmailMessageId,
        gmailThreadId,
        conversation,
        staffUser,
      );
      if (
        conversation.status === "closed" &&
        (!conversation.assignedToAI || mailbox.preferences?.autoRespondEmailToChat === "draft") &&
        !ignoreReason
      ) {
        await updateConversation(conversation.id, { set: { status: "open" }, message: "Email received" });
      }

      if (ignoreReason) {
        await db.insert(conversationEvents).values({
          conversationId: conversation.id,
          type: "email_auto_ignored",
          changes: { status: "closed" },
          reason: ignoreReason,
        });
      } else {
        await triggerEvent("conversations/auto-response.create", {
          messageId: newEmail.id,
          customerInfoUrl: mailbox.customerInfoUrl,
        });
      }

      results.push({
        message: `Created message ${newEmail.id}`,
        messageId: newEmail.id,
        conversationSlug: conversation.slug,
        responded: !ignoreReason,
        ignoreReason,
        gmailMessageId,
        gmailThreadId,
      });
    } catch (error) {
      captureExceptionAndThrowIfDevelopment(error);
      results.push({ message: `Error processing message ${gmailMessageId}: ${error}`, gmailMessageId, gmailThreadId });
      continue;
    }
  }

  await db
    .update(gmailSupportEmails)
    .set({ historyId: data.historyId })
    .where(eq(gmailSupportEmails.id, gmailSupportEmail.id));

  return {
    data: env.NODE_ENV === "development" ? data : undefined,
    messages: messagesAdded.length,
    results,
  };
};

const addressesToString = (value: AddressObject | AddressObject[]) => {
  return Array.isArray(value) ? value.map((to) => to.text).join(", ") : value.text;
};

const GmailWebhookBodySchema = z.object({
  message: z.object({
    data: z.string(),
    // The ID assigned by Google when the message is published. Guaranteed to be unique within the pub/sub topic.
    // https://cloud.google.com/pubsub/docs/reference/rest/v1/PubsubMessage
    messageId: z.string(),
    publishTime: z.string(),
  }),
  subscription: z.string(),
});

const GmailWebhookHeadersSchema = z.object({
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
    captureExceptionAndLog(error);
    throw new NonRetriableError("Invalid token");
  }
  const rawData = JSON.parse(Buffer.from(body.message.data, "base64").toString("utf-8"));
  return GmailWebhookDataSchema.parse(rawData);
};

export const extractQuotations = (html: string) => {
  return extractEmailPartsFromDocument(new JSDOM(html).window.document).mainContent;
};

const processGmailAttachments = async (conversationSlug: string, messageId: number, attachments: Attachment[]) => {
  await Promise.all(
    attachments.map(async (attachment) => {
      try {
        const fileName = attachment.filename ?? "untitled";
        const key = generateKey(["attachments", conversationSlug], fileName);
        const contentType = attachment.contentType ?? "application/octet-stream";

        const { id: fileId } = await db
          .insert(files)
          .values({
            messageId,
            name: fileName,
            key,
            mimetype: contentType,
            size: attachment.size,
            isInline: false,
            isPublic: false,
          })
          .returning({ id: files.id })
          .then(takeUniqueOrThrow);

        await uploadFile(key, attachment.content, { mimetype: contentType });
        await generateFilePreview({ fileId });
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

export const extractAndUploadInlineImages = async (html: string) => {
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

        processedHtml = processedHtml.replace(match, match.replace(/src="[^"]+"/i, `src="${file.key}"`));
        fileSlugs.push(file.slug);
      } catch (error) {
        captureExceptionAndLog(error);
      }
    }),
  );

  return { processedHtml, fileSlugs };
};
