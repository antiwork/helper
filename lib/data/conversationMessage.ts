import { addSeconds } from "date-fns";
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, notInArray, or, SQL } from "drizzle-orm";
import { htmlToText } from "html-to-text";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { EMAIL_UNDO_COUNTDOWN_SECONDS } from "@/components/constants";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import { conversationMessages, DRAFT_STATUSES, files, mailboxes } from "@/db/schema";
import { conversationEvents } from "@/db/schema/conversationEvents";
import { conversations } from "@/db/schema/conversations";
import { notes } from "@/db/schema/notes";
import type { Tool } from "@/db/schema/tools";
import { DbOrAuthUser } from "@/db/supabaseSchema/auth";
import { inngest } from "@/inngest/client";
import { proxyExternalContent } from "@/lib/proxyExternalContent";
import { createPresignedDownloadUrl } from "@/lib/s3/utils";
import { getSlackPermalink } from "@/lib/slack/client";
import { PromptInfo } from "@/types/conversationMessages";
import { formatBytes } from "../files";
import { getConversationById, getNonSupportParticipants, updateConversation } from "./conversation";
import { finishFileUpload } from "./files";

const isAiDraftStale = (draft: typeof conversationMessages.$inferSelect, mailbox: typeof mailboxes.$inferSelect) => {
  return draft.status !== "draft" || draft.createdAt < mailbox.promptUpdatedAt;
};

export const serializeResponseAiDraft = (
  draft: typeof conversationMessages.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
) => {
  if (!draft?.responseToId) {
    return null;
  }
  return {
    id: draft.id,
    responseToId: draft.responseToId,
    body: draft.body,
    isStale: isAiDraftStale(draft, mailbox),
  };
};

export const getMessagesOnly = async (conversationId: number) => {
  const messages = await db.query.conversationMessages.findMany({
    where: and(
      isNull(conversationMessages.deletedAt),
      eq(conversationMessages.conversationId, conversationId),
      or(eq(conversationMessages.role, "user"), notInArray(conversationMessages.status, DRAFT_STATUSES)),
    ),
    orderBy: [asc(conversationMessages.createdAt)],
  });

  return messages;
};

export const getMessages = async (conversationId: number, mailbox: typeof mailboxes.$inferSelect) => {
  const findMessages = (where: SQL) =>
    db.query.conversationMessages.findMany({
      where: and(
        where,
        isNull(conversationMessages.deletedAt),
        or(eq(conversationMessages.role, "user"), notInArray(conversationMessages.status, DRAFT_STATUSES)),
      ),
      columns: {
        id: true,
        status: true,
        body: true,
        createdAt: true,
        emailTo: true,
        emailCc: true,
        emailBcc: true,
        userId: true,
        emailFrom: true,
        isPinned: true,
        role: true,
        conversationId: true,
        metadata: true,
        slackChannel: true,
        slackMessageTs: true,
        reactionType: true,
        reactionFeedback: true,
        reactionCreatedAt: true,
        isFlaggedAsBad: true,
        reason: true,
      },
      with: {
        files: {
          where: eq(files.isPublic, false),
        },
      },
    });

  const messages = await findMessages(eq(conversationMessages.conversationId, conversationId));
  const mergedMessages = await findMessages(
    inArray(
      conversationMessages.conversationId,
      db.select({ id: conversations.id }).from(conversations).where(eq(conversations.mergedIntoId, conversationId)),
    ),
  );
  const allMessages = [...messages, ...mergedMessages];

  const noteRecords = await db.query.notes.findMany({
    where: eq(notes.conversationId, conversationId),
    columns: {
      id: true,
      createdAt: true,
      body: true,
      role: true,
      slackChannel: true,
      slackMessageTs: true,
      userId: true,
    },
    with: {
      files: true,
    },
  });

  const eventRecords = await db.query.conversationEvents.findMany({
    where: and(eq(conversationEvents.conversationId, conversationId), ne(conversationEvents.type, "reasoning_toggled")),
    columns: {
      id: true,
      type: true,
      createdAt: true,
      changes: true,
      byUserId: true,
      reason: true,
    },
  });

  const membersById = Object.fromEntries((await db.query.authUsers.findMany()).map((user) => [user.id, user]));

  const messageInfos = await Promise.all(
    allMessages.map((message) =>
      serializeMessage(message, conversationId, mailbox, (message.userId && membersById[message.userId]) || null),
    ),
  );

  const noteInfos = await Promise.all(
    noteRecords.map(async (note) => ({
      ...note,
      type: "note" as const,
      from: note.userId ? (membersById[note.userId]?.user_metadata?.name ?? null) : null,
      slackUrl:
        mailbox.slackBotToken && note.slackChannel && note.slackMessageTs
          ? await getSlackPermalink(mailbox.slackBotToken, note.slackChannel, note.slackMessageTs)
          : null,
      files: (await serializeFiles(note.files)).flatMap((f) => (f.isInline ? [] : [f])),
    })),
  );

  const eventInfos = await Promise.all(
    eventRecords.map((event) => ({
      ...event,
      changes: {
        ...event.changes,
        assignedToUser: event.changes.assignedToId
          ? (membersById[event.changes.assignedToId]?.user_metadata?.name ?? null)
          : event.changes.assignedToId,
        assignedToAI: event.changes.assignedToAI,
      },
      byUser: event.byUserId ? (membersById[event.byUserId]?.user_metadata?.name ?? null) : null,
      eventType: event.type,
      type: "event" as const,
    })),
  );

  return [...messageInfos, ...noteInfos, ...eventInfos]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((info) => ({ ...info, isNew: false }));
};

export const sanitizeBody = async (body: string | null) =>
  body ? await proxyExternalContent(DOMPurify.sanitize(body, { FORBID_TAGS: ["script", "style"] })) : null;

export const serializeMessage = async (
  message: Pick<
    typeof conversationMessages.$inferSelect,
    | "id"
    | "status"
    | "body"
    | "createdAt"
    | "emailTo"
    | "emailCc"
    | "emailBcc"
    | "userId"
    | "emailFrom"
    | "isPinned"
    | "role"
    | "conversationId"
    | "slackChannel"
    | "slackMessageTs"
    | "metadata"
    | "reactionType"
    | "reactionFeedback"
    | "reactionCreatedAt"
    | "isFlaggedAsBad"
    | "reason"
  > & {
    files?: (typeof files.$inferSelect)[];
  },
  conversationId: number,
  mailbox: typeof mailboxes.$inferSelect,
  user?: DbOrAuthUser | null,
) => {
  const messageFiles =
    message.files ??
    (await db.query.files.findMany({ where: and(eq(files.messageId, message.id), eq(files.isPublic, false)) }));

  const draftEmail =
    message.role === "user"
      ? await db.query.conversationMessages.findFirst({
          where: and(
            eq(conversationMessages.conversationId, message.conversationId),
            eq(conversationMessages.role, "ai_assistant"),
            isNotNull(conversationMessages.promptInfo),
            eq(conversationMessages.responseToId, message.id),
          ),
          orderBy: [desc(conversationMessages.createdAt)],
        })
      : null;

  const filesData = await serializeFiles(messageFiles);

  let sanitizedBody = await sanitizeBody(message.body);
  filesData.forEach((f) => {
    if (f.isInline && sanitizedBody) {
      sanitizedBody = sanitizedBody.replaceAll(`src="${f.url}"`, `src="${f.presignedUrl}"`);
    }
  });

  return {
    type: "message" as const,
    id: message.id,
    status: message.status,
    body: sanitizedBody,
    createdAt: message.createdAt,
    role: message.role,
    emailTo: message.emailTo,
    cc: message.emailCc || [],
    bcc: message.emailBcc || [],
    from: message.role === "staff" && user ? (user.user_metadata?.name ?? user.email) : message.emailFrom,
    isMerged: message.conversationId !== conversationId,
    isPinned: message.isPinned ?? false,
    slackUrl:
      mailbox.slackBotToken && message.slackChannel && message.slackMessageTs
        ? await getSlackPermalink(mailbox.slackBotToken, message.slackChannel, message.slackMessageTs)
        : null,
    draft: draftEmail ? serializeResponseAiDraft(draftEmail, mailbox) : null,
    files: filesData.flatMap((f) => (f.isInline ? [] : [f])),
    metadata: message.metadata,
    reactionType: message.reactionType,
    reactionFeedback: message.reactionFeedback,
    reactionCreatedAt: message.reactionCreatedAt,
    isFlaggedAsBad: message.isFlaggedAsBad,
    reason: message.reason,
  };
};

export const serializeFiles = (inputFiles: (typeof files.$inferSelect)[]) =>
  Promise.all(
    inputFiles.map(async (file) =>
      file.isInline
        ? { isInline: true as const, url: file.url, presignedUrl: await createPresignedDownloadUrl(file.url) }
        : {
            ...file,
            isInline: false as const,
            sizeHuman: formatBytes(file.size, 2),
            presignedUrl: await createPresignedDownloadUrl(file.url),
            previewUrl: file.previewUrl ? await createPresignedDownloadUrl(file.previewUrl) : null,
          },
    ),
  );

type OptionalMessageAttributes = "updatedAt" | "createdAt";
type NewConversationMessage = Omit<typeof conversationMessages.$inferInsert, OptionalMessageAttributes> &
  Partial<Pick<typeof conversationMessages.$inferInsert, OptionalMessageAttributes>>;

export type ConversationMessage = typeof conversationMessages.$inferSelect;

export const createReply = async (
  {
    conversationId,
    message,
    user,
    cc,
    bcc = [],
    fileSlugs = [],
    close = true,
    slack,
    role,
    responseToId = null,
    shouldAutoAssign = true,
  }: {
    conversationId: number;
    message: string | null;
    user: DbOrAuthUser | null;
    cc?: string[] | null;
    bcc?: string[];
    fileSlugs?: string[];
    close?: boolean;
    slack?: { channel: string; messageTs: string } | null;
    role?: "user" | "staff" | null;
    responseToId?: number | null;
    shouldAutoAssign?: boolean;
  },
  tx0: Transaction | typeof db = db,
) => {
  const conversation = await getConversationById(conversationId);
  if (!conversation) throw new Error("Conversation not found");

  return tx0.transaction(async (tx) => {
    if (shouldAutoAssign && user && !conversation.assignedToId) {
      await updateConversation(
        conversationId,
        { set: { assignedToId: user.id, assignedToAI: false }, byUserId: null },
        tx,
      );
    }

    const createdMessage = await createConversationMessage(
      {
        conversationId,
        body: message,
        userId: user?.id,
        emailCc: cc ?? (await getNonSupportParticipants(conversation)),
        emailBcc: bcc,
        slackChannel: slack?.channel,
        slackMessageTs: slack?.messageTs,
        role: role ?? "staff",
        responseToId,
        status: "queueing",
        isPerfect: false,
        isFlaggedAsBad: false,
      },
      tx,
    );

    await finishFileUpload({ fileSlugs, messageId: createdMessage.id }, tx);

    if (close && conversation.status !== "spam") {
      await updateConversation(conversationId, { set: { status: "closed" }, byUserId: user?.id ?? null }, tx);
    }

    const lastAiDraft = await getLastAiGeneratedDraft(conversationId, tx);
    if (lastAiDraft?.body) {
      if (message && cleanupMessage(lastAiDraft.body) === cleanupMessage(message)) {
        await tx
          .update(conversationMessages)
          .set({ isPerfect: true })
          .where(eq(conversationMessages.id, createdMessage.id));
      }
    }
    await discardAiGeneratedDrafts(conversationId, tx);

    return createdMessage.id;
  });
};

export const createConversationMessage = async (
  conversationMessage: NewConversationMessage,
  tx: Transaction | typeof db = db,
): Promise<typeof conversationMessages.$inferSelect> => {
  const message = await tx
    .insert(conversationMessages)
    .values({
      isPinned: false,
      ...conversationMessage,
    })
    .returning()
    .then(takeUniqueOrThrow);

  if (message.role === "user") {
    await updateConversation(
      message.conversationId,
      { set: { lastUserEmailCreatedAt: new Date() }, skipAblyEvents: true },
      tx,
    );
  }

  if (message.status !== "draft") {
    await inngest.send({
      name: "conversations/message.created",
      data: {
        messageId: message.id,
        conversationId: message.conversationId,
      },
    });
  }

  if (message.status === "queueing") {
    await inngest.send({
      name: "conversations/email.enqueued",
      data: { messageId: message.id },
      ts: addSeconds(new Date(), EMAIL_UNDO_COUNTDOWN_SECONDS).getTime(),
    });
  }

  return message;
};

export const createAiDraft = async (
  conversationId: number,
  body: string,
  responseToId: number,
  promptInfo: PromptInfo,
  tx: Transaction | typeof db = db,
): Promise<typeof conversationMessages.$inferSelect> => {
  if (!responseToId) {
    throw new Error("responseToId is required");
  }

  return await createConversationMessage(
    {
      conversationId,
      body: DOMPurify.sanitize(marked.parse(body.trim().replace(/\n\n+/g, "\n\n"), { async: false })),
      role: "ai_assistant",
      status: "draft",
      responseToId,
      promptInfo,
      cleanedUpText: body,
      isPerfect: false,
      isFlaggedAsBad: false,
    },
    tx,
  );
};

export const ensureCleanedUpText = async (
  message: typeof conversationMessages.$inferSelect,
  tx: Transaction | typeof db = db,
) => {
  if (message.cleanedUpText !== null) return message.cleanedUpText;
  const cleanedUpText = generateCleanedUpText(message.body ?? "");
  await tx.update(conversationMessages).set({ cleanedUpText }).where(eq(conversationMessages.id, message.id));
  return cleanedUpText;
};

export const getConversationMessageById = async (id: number): Promise<ConversationMessage | null> => {
  const result = await db.query.conversationMessages.findFirst({
    where: eq(conversationMessages.id, id),
  });
  return result ?? null;
};

export const getLastAiGeneratedDraft = async (
  conversationId: number,
  tx: Transaction | typeof db = db,
): Promise<typeof conversationMessages.$inferSelect | null> => {
  const result = await tx.query.conversationMessages.findFirst({
    where: and(
      eq(conversationMessages.conversationId, conversationId),
      eq(conversationMessages.role, "ai_assistant"),
      eq(conversationMessages.status, "draft"),
    ),
    orderBy: [desc(conversationMessages.createdAt)],
  });
  return result ?? null;
};

export async function getTextWithConversationSubject(
  conversation: { subject: string | null },
  message: typeof conversationMessages.$inferSelect,
) {
  const cleanedUpText = await ensureCleanedUpText(message);
  const subject = conversation.subject;
  return `${subject ? `${subject}\n\n` : ""}${cleanedUpText}`;
}

export const getPastMessages = async (
  message: typeof conversationMessages.$inferSelect,
): Promise<(typeof conversationMessages.$inferSelect)[]> => {
  const pastMessages = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, message.conversationId),
      ne(conversationMessages.id, message.id),
      notInArray(conversationMessages.status, DRAFT_STATUSES),
      isNotNull(conversationMessages.body),
      isNotNull(conversationMessages.cleanedUpText),
    ),
    orderBy: [asc(conversationMessages.createdAt)],
  });

  for (const pastMessage of pastMessages) {
    if (pastMessage.cleanedUpText === null) {
      pastMessage.cleanedUpText = await ensureCleanedUpText(pastMessage);
    }
  }
  return pastMessages;
};

export const createToolEvent = async ({
  conversationId,
  tool,
  data,
  error,
  parameters,
  userMessage,
  userId,
  tx = db,
}: {
  conversationId: number;
  tool: Tool;
  data?: any;
  error?: any;
  parameters: Record<string, any>;
  userMessage: string;
  userId?: string;
  tx?: Transaction | typeof db;
}) => {
  const message = await tx.insert(conversationMessages).values({
    conversationId,
    role: "tool",
    body: userMessage,
    cleanedUpText: userMessage,
    metadata: {
      tool: {
        id: tool.id,
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
        url: tool.url,
        requestMethod: tool.requestMethod,
      },
      result: data || error,
      success: !error,
      parameters,
    },
    isPerfect: false,
    isFlaggedAsBad: false,
    status: "sent",
    userId,
  });

  return message;
};

const discardAiGeneratedDrafts = async (conversationId: number, tx: Transaction | typeof db = db): Promise<void> => {
  await tx
    .update(conversationMessages)
    .set({ status: "discarded" })
    .where(
      and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.role, "ai_assistant"),
        eq(conversationMessages.status, "draft"),
      ),
    );
};

const cleanupMessage = (message: string): string => {
  const strippedMessage = message.replace(/<[^>]*>/g, "");
  return strippedMessage.replace(/\s+/g, " ").trim();
};

const generateCleanedUpText = (html: string) => {
  if (!html.trim()) return "";

  const paragraphs = htmlToText(html, { wordwrap: false })
    .split(/\s*\n\s*/)
    .filter((p) => p.trim().replace(/\s+/g, " "));
  return paragraphs.join("\n\n");
};
