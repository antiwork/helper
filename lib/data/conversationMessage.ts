import { and, asc, desc, eq, inArray, isNull, ne, notInArray, or, SQL } from "drizzle-orm";
import { htmlToText } from "html-to-text";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { Message } from "@helperai/client";
import { EMAIL_UNDO_COUNTDOWN_SECONDS } from "@/components/constants";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import {
  BasicUserProfile,
  conversationEvents,
  conversationMessages,
  DRAFT_STATUSES,
  files,
  guideSessions,
  mailboxes,
  MessageMetadata,
  notes,
  Tool,
} from "@/db/schema";
import { conversations } from "@/db/schema/conversations";
import { triggerEvent } from "@/jobs/trigger";
import { PromptInfo } from "@/lib/ai/promptInfo";
import { getStaffName } from "@/lib/data/user";
import { proxyExternalContent } from "@/lib/proxyExternalContent";
import { getSlackPermalink } from "@/lib/slack/client";
import { formatBytes } from "../files";
import { getConversationById, getNonSupportParticipants, updateConversation } from "./conversation";
import { finishFileUpload, formatAttachments, getFileUrl } from "./files";

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

export const findOriginalAndMergedMessages = async <T>(
  conversationId: number,
  query: (condition: SQL) => Promise<T[]>,
) => {
  const [originalMessages, mergedMessages] = await Promise.all([
    query(eq(conversationMessages.conversationId, conversationId)),
    query(
      inArray(
        conversationMessages.conversationId,
        db.select({ id: conversations.id }).from(conversations).where(eq(conversations.mergedIntoId, conversationId)),
      ),
    ),
  ]);
  return [...originalMessages, ...mergedMessages];
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

  const [messages, noteRecords, eventRecords, guideSessionRecords] = await Promise.all([
    findOriginalAndMergedMessages(conversationId, findMessages),
    db.query.notes.findMany({
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
    }),
    db.query.conversationEvents.findMany({
      where: and(
        eq(conversationEvents.conversationId, conversationId),
        ne(conversationEvents.type, "reasoning_toggled"),
      ),
      columns: {
        id: true,
        type: true,
        createdAt: true,
        changes: true,
        byUserId: true,
        reason: true,
      },
    }),
    db.query.guideSessions.findMany({
      where: eq(guideSessions.conversationId, conversationId),
      columns: {
        id: true,
        uuid: true,
        messageId: true,
        createdAt: true,
        status: true,
        title: true,
        instructions: true,
        steps: true,
      },
    }),
  ]);

  const messageInfos = await Promise.all(messages.map((message) => serializeMessage(message, conversationId, mailbox)));

  const noteInfos = await Promise.all(
    noteRecords.map(async (note) => ({
      ...note,
      type: "note" as const,
      userId: note.userId,
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
        assignedToId: event.changes?.assignedToId,
        assignedToAI: event.changes?.assignedToAI,
      },
      byUserId: event.byUserId,
      eventType: event.type,
      type: "event" as const,
    })),
  );

  const guideSessionInfos = await Promise.all(
    guideSessionRecords.map((guideSession) => ({
      ...guideSession,
      type: "guide_session" as const,
    })),
  );

  return [...messageInfos, ...noteInfos, ...eventInfos, ...guideSessionInfos]
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
) => {
  const messageFiles =
    message.files ??
    (await db.query.files.findMany({ where: and(eq(files.messageId, message.id), eq(files.isPublic, false)) }));

  const filesData = await serializeFiles(messageFiles);

  let sanitizedBody = await sanitizeBody(message.body);
  filesData.forEach((f) => {
    if (f.isInline && sanitizedBody) {
      sanitizedBody = sanitizedBody.replaceAll(`src="${f.key}"`, `src="${f.presignedUrl}"`);
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
    from: message.role === "staff" ? null : message.emailFrom, // Frontend resolves staff names using userId
    userId: message.userId,
    isMerged: message.conversationId !== conversationId,
    isPinned: message.isPinned ?? false,
    slackUrl:
      mailbox.slackBotToken && message.slackChannel && message.slackMessageTs
        ? await getSlackPermalink(mailbox.slackBotToken, message.slackChannel, message.slackMessageTs)
        : null,
    files: filesData.flatMap((f) => (f.isInline ? [] : [f])),
    metadata: message.metadata,
    reactionType: message.reactionType,
    reactionFeedback: message.reactionFeedback,
    reactionCreatedAt: message.reactionCreatedAt,
    isFlaggedAsBad: message.isFlaggedAsBad,
    reason: message.reason,
  };
};

export const serializeMessageForWidget = async (
  message: typeof conversationMessages.$inferSelect,
  attachments: (typeof files.$inferSelect)[],
): Promise<Message> => {
  const messageAttachments = await formatAttachments(attachments.filter((a) => a.messageId === message.id));
  const hasPublicAttachments =
    (message.metadata as MessageMetadata)?.hasAttachments || (message.metadata as MessageMetadata)?.includesScreenshot;
  return {
    id: message.id.toString(),
    role: message.role === "ai_assistant" || message.role === "tool" ? ("assistant" as const) : message.role,
    content: message.cleanedUpText || htmlToText(message.body ?? "", { wordwrap: false }),
    createdAt: message.createdAt.toISOString(),
    reactionType: message.reactionType,
    reactionFeedback: message.reactionFeedback,
    reactionCreatedAt: message.reactionCreatedAt?.toISOString() ?? null,
    staffName: await getStaffName(message.userId),
    publicAttachments: hasPublicAttachments ? messageAttachments : [],
    privateAttachments: hasPublicAttachments ? [] : messageAttachments,
  };
};

const serializeFiles = (inputFiles: (typeof files.$inferSelect)[]) =>
  Promise.all(
    inputFiles.map(async (file) => {
      if (file.isInline) {
        return { isInline: true as const, key: file.key, presignedUrl: await getFileUrl(file) };
      }

      const [presignedUrl, previewUrl] = await Promise.all([
        getFileUrl(file),
        file.previewKey ? getFileUrl(file, { preview: true }) : null,
      ]);

      return {
        ...file,
        isInline: false as const,
        sizeHuman: formatBytes(file.size, 2),
        presignedUrl,
        previewUrl,
      };
    }),
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
    user: BasicUserProfile | null;
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
        { set: { assignedToId: user.id, assignedToAI: false }, byUserId: null, message: "Auto-assigned" },
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
      await updateConversation(
        conversationId,
        {
          set: { status: "closed" },
          byUserId: user?.id ?? null,
          message: user?.id ? "Reply sent" : "Automated reply sent",
        },
        tx,
      );
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
  const messageValues = {
    isPinned: false,
    ...conversationMessage,
    body: conversationMessage.body,
    cleanedUpText: conversationMessage.cleanedUpText,
  };

  const message = await tx.insert(conversationMessages).values(messageValues).returning().then(takeUniqueOrThrow);

  await updateConversation(
    message.conversationId,
    {
      set: {
        lastMessageAt: new Date(),
        ...(message.role === "user" && {
          lastUserEmailCreatedAt: new Date(),
          lastReadAt: new Date(),
        }),
      },
      skipRealtimeEvents: true,
    },
    tx,
  );

  const eventsToSend = [];

  if (message.status !== "draft") {
    eventsToSend.push({
      name: "conversations/message.created" as const,
      data: {
        messageId: message.id,
        conversationId: message.conversationId,
      },
    });
    if (message.userId && (message.role === "user" || message.role === "staff")) {
      eventsToSend.push({
        name: "conversations/send-follower-notification" as const,
        data: {
          conversationId: message.conversationId,
          eventType: "new_message" as const,
          triggeredByUserId: message.userId,
          eventDetails: {
            message: message.cleanedUpText || undefined,
          },
        },
      });
    }
  }

  if (message.status === "queueing") {
    eventsToSend.push({
      name: "conversations/email.enqueued" as const,
      data: { messageId: message.id },
      sleepSeconds: EMAIL_UNDO_COUNTDOWN_SECONDS,
    });
  }

  if (eventsToSend.length > 0) {
    await Promise.all(
      eventsToSend.map((event) =>
        triggerEvent(event.name, event.data, event.sleepSeconds ? { sleepSeconds: event.sleepSeconds } : {}),
      ),
    );
  }

  return message;
};

export const createAiDraft = async (
  conversationId: number,
  body: string,
  responseToId: number,
  promptInfo: PromptInfo | null,
  tx: Transaction | typeof db = db,
): Promise<typeof conversationMessages.$inferSelect> => {
  if (!responseToId) {
    throw new Error("responseToId is required");
  }

  const sanitizedBody = DOMPurify.sanitize(marked.parse(body.trim().replace(/\n\n+/g, "\n\n"), { async: false }));

  return await createConversationMessage(
    {
      conversationId,
      body: sanitizedBody,
      role: "ai_assistant",
      status: "draft",
      responseToId,
      promptInfo: promptInfo ? { details: promptInfo } : null,
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
  tool: Tool | { name: string; description?: string | null; url?: string | null };
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
      tool:
        "id" in tool
          ? {
              id: tool.id,
              slug: tool.slug,
              name: tool.name,
              description: tool.description,
              url: tool.url,
              requestMethod: tool.requestMethod,
            }
          : {
              name: tool.name,
              description: tool.description,
              url: tool.url,
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

export const generateCleanedUpText = (html: string) => {
  if (!html.trim()) return "";

  const paragraphs = htmlToText(html, {
    formatters: {
      image: (elem, _walk, builder) =>
        builder.addInline(`![${elem.attribs?.alt || "image"}](${elem.attribs?.src})`, { noWordTransform: true }),
    },
    wordwrap: false,
  })
    .split(/\s*\n\s*/)
    .filter((p) => p.trim().replace(/\s+/g, " "));
  return paragraphs.join("\n\n");
};
