import "server-only";
import { type Message } from "ai";
import { and, asc, desc, eq, inArray, isNull, not, SQLWrapper } from "drizzle-orm";
import { cache } from "react";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db, Transaction } from "@/db/client";
import { conversationMessages, conversations, gmailSupportEmails, mailboxes, platformCustomers } from "@/db/schema";
import { conversationEvents } from "@/db/schema/conversationEvents";
import { triggerEvent } from "@/jobs/trigger";
import { runAIQuery } from "@/lib/ai";
import { MINI_MODEL } from "@/lib/ai/core";
import { extractAddresses } from "@/lib/emails";
import { conversationChannelId, conversationsListChannelId } from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";
import { updateVipMessageOnClose } from "@/lib/slack/vipNotifications";
import { emailKeywordsExtractor } from "../emailKeywordsExtractor";
import { searchEmailsByKeywords } from "../emailSearchService/searchEmailsByKeywords";
import { captureExceptionAndLog } from "../shared/sentry";
import { getMessages } from "./conversationMessage";
import { getMailbox } from "./mailbox";
import { determineVipStatus, getPlatformCustomer } from "./platformCustomer";

type OptionalConversationAttributes = "slug" | "updatedAt" | "createdAt";

type NewConversation = Omit<typeof conversations.$inferInsert, OptionalConversationAttributes | "source"> &
  Partial<Pick<typeof conversations.$inferInsert, OptionalConversationAttributes>> & {
    source: NonNullable<(typeof conversations.$inferInsert)["source"]>;
    assignedToAI: boolean;
    isPrompt?: boolean;
    isVisitor?: boolean;
  };

export type Conversation = typeof conversations.$inferSelect;

export const CHAT_CONVERSATION_SUBJECT = "Chat";

export const createConversation = async (
  conversation: NewConversation,
  tx: Transaction | typeof db = db,
): Promise<typeof conversations.$inferSelect> => {
  try {
    const conversationValues = {
      ...conversation,
      conversationProvider: "chat" as const,
      subject: conversation.subject,
    };

    const [newConversation] = await tx.insert(conversations).values(conversationValues).returning();
    if (!newConversation) throw new Error("Failed to create conversation");

    return newConversation;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to create conversation");
  }
};

export const getOriginalConversation = async (conversationId: number): Promise<typeof conversations.$inferSelect> => {
  const conversation = assertDefined(
    await db.query.conversations.findFirst({ where: eq(conversations.id, conversationId) }),
  );
  if (conversation.mergedIntoId) return getOriginalConversation(conversation.mergedIntoId);
  return conversation;
};

// If the conversation is merged into another conversation, update the original conversation instead.
// This is mainly useful in automated actions, especially when setting the conversation status to "open",
// since only the original conversation will be shown to staff in the inbox.
export const updateOriginalConversation: typeof updateConversation = async (id, options, tx = db) => {
  const conversation = assertDefined(
    await tx.query.conversations.findFirst({ columns: { mergedIntoId: true }, where: eq(conversations.id, id) }),
  );
  if (conversation.mergedIntoId) return updateConversation(conversation.mergedIntoId, options, tx);
  return updateConversation(id, options, tx);
};

export const updateConversation = async (
  id: number,
  {
    set: dbUpdates = {},
    byUserId = null,
    message = null,
    type = "update",
    skipRealtimeEvents = false,
  }: {
    set?: Partial<typeof conversations.$inferInsert>;
    byUserId?: string | null;
    message?: string | null;
    type?: (typeof conversationEvents.$inferSelect)["type"];
    skipRealtimeEvents?: boolean;
  },
  tx: Transaction | typeof db = db,
) => {
  const current = assertDefined(await tx.query.conversations.findFirst({ where: eq(conversations.id, id) }));
  if (dbUpdates.assignedToAI) {
    dbUpdates.status = "closed";
    dbUpdates.assignedToId = null;
  } else if (dbUpdates.assignedToId) {
    dbUpdates.assignedToAI = false;
  }
  if (current.status !== "closed" && dbUpdates.status === "closed") {
    dbUpdates.closedAt = new Date();
  }

  const updatedConversation = await tx
    .update(conversations)
    .set(dbUpdates)
    .where(eq(conversations.id, id))
    .returning()
    .then(takeUniqueOrThrow);
  const updatesToLog = (["status", "assignedToId", "assignedToAI"] as const).filter(
    (key) => current[key] !== updatedConversation[key],
  );
  if (updatesToLog.length > 0) {
    await tx.insert(conversationEvents).values({
      conversationId: id,
      type: type ?? "update",
      changes: Object.fromEntries(updatesToLog.map((key) => [key, updatedConversation[key]])),
      byUserId,
      reason: message,
    });
  }
  if (!current.assignedToAI && updatedConversation.assignedToAI) {
    const message = await tx.query.conversationMessages.findFirst({
      where: eq(conversationMessages.conversationId, updatedConversation.id),
      orderBy: desc(conversationMessages.createdAt),
    });
    if (message?.role === "user") {
      const mailbox = assertDefined(await getMailbox());
      await triggerEvent("conversations/auto-response.create", {
        messageId: message.id,
        customerInfoUrl: mailbox.customerInfoUrl,
      });
    }
  }

  if (current.status !== "closed" && updatedConversation?.status === "closed") {
    await updateVipMessageOnClose(updatedConversation.id, byUserId);

    await triggerEvent("conversations/embedding.create", { conversationSlug: updatedConversation.slug });
  }

  if (updatedConversation && !skipRealtimeEvents) {
    const publishEvents = async () => {
      try {
        const mailbox = assertDefined(await getMailbox());
        const events = [
          publishToRealtime({
            channel: conversationChannelId(updatedConversation.slug),
            event: "conversation.updated",
            data: serializeConversation(mailbox, updatedConversation),
          }),
        ];
        if (
          current.status !== updatedConversation.status ||
          current.assignedToAI !== updatedConversation.assignedToAI ||
          current.assignedToId !== updatedConversation.assignedToId
        ) {
          events.push(
            publishToRealtime({
              channel: conversationsListChannelId(),
              event: "conversation.statusChanged",
              data: {
                id: updatedConversation.id,
                status: updatedConversation.status,
                assignedToAI: updatedConversation.assignedToAI,
                assignedToId: updatedConversation.assignedToId,
                previousValues: {
                  status: current.status,
                  assignedToAI: current.assignedToAI,
                  assignedToId: current.assignedToId,
                },
              },
            }),
          );
        }
        await Promise.all(events);
      } catch (error) {
        captureExceptionAndLog(error);
      }
    };
    await publishEvents();

    if (byUserId && updatesToLog.length > 0) {
      const notificationEvents = [];

      if (current.status !== updatedConversation.status && updatedConversation.status !== "spam") {
        notificationEvents.push(
          triggerEvent("conversations/send-follower-notification", {
            conversationId: updatedConversation.id,
            eventType: "status_change" as const,
            triggeredByUserId: byUserId,
            eventDetails: {
              oldStatus: current.status || "open",
              newStatus: updatedConversation.status || "open",
            },
          }),
        );
      }

      if (current.assignedToId !== updatedConversation.assignedToId) {
        // Reset lastReadByAssigneeAt when assignee changes
        await tx
          .update(conversations)
          .set({ lastReadByAssigneeAt: null })
          .where(eq(conversations.id, updatedConversation.id));

        notificationEvents.push(
          triggerEvent("conversations/send-follower-notification", {
            conversationId: updatedConversation.id,
            eventType: "assignment_change" as const,
            triggeredByUserId: byUserId,
            eventDetails: {
              oldAssignee: current.assignedToId || undefined,
              newAssignee: updatedConversation.assignedToId || undefined,
            },
          }),
        );
      }

      if (notificationEvents.length > 0) {
        await Promise.allSettled(notificationEvents);
      }
    }
  }
  return updatedConversation ?? null;
};

export const serializeConversation = (
  mailbox: typeof mailboxes.$inferSelect,
  conversation: typeof conversations.$inferSelect,
  platformCustomer?: typeof platformCustomers.$inferSelect | null,
) => {
  return {
    id: conversation.id,
    slug: conversation.slug,
    status: conversation.status,
    emailFrom: conversation.emailFrom,
    subject: conversation.subject ?? "(no subject)",
    conversationProvider: conversation.conversationProvider,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    closedAt: conversation.closedAt,
    lastUserEmailCreatedAt: conversation.lastUserEmailCreatedAt,
    lastReadByCustomerAt: conversation.lastReadAt,
    lastMessageAt: conversation.lastMessageAt,
    assignedToId: conversation.assignedToId,
    assignedToAI: conversation.assignedToAI,
    issueGroupId: conversation.issueGroupId,
    platformCustomer: platformCustomer
      ? {
          ...platformCustomer,
          isVip: determineVipStatus(parseInt(platformCustomer.value ?? "0", 10), mailbox.vipThreshold ?? null),
        }
      : null,
    summary: conversation.summary,
    source: conversation.source ?? "email",
    isPrompt: conversation.isPrompt ?? false,
    isVisitor: conversation.isVisitor ?? false,
    embeddingText: conversation.embeddingText,
    githubIssueNumber: conversation.githubIssueNumber,
    githubIssueUrl: conversation.githubIssueUrl,
    githubRepoOwner: conversation.githubRepoOwner,
    githubRepoName: conversation.githubRepoName,
  };
};

export const serializeConversationWithMessages = async (
  mailbox: typeof mailboxes.$inferSelect,
  conversation: typeof conversations.$inferSelect,
) => {
  const platformCustomer = conversation.emailFrom ? await getPlatformCustomer(conversation.emailFrom) : null;

  const mergedInto = conversation.mergedIntoId
    ? await db.query.conversations.findFirst({
        where: eq(conversations.id, conversation.mergedIntoId),
        columns: { slug: true },
      })
    : null;

  return {
    ...serializeConversation(mailbox, conversation, platformCustomer),
    mergedInto,
    customerInfo: platformCustomer
      ? {
          name: platformCustomer.name,
          value: platformCustomer.value ? parseFloat(platformCustomer.value) : null,
          links: platformCustomer.links,
          isVip: platformCustomer.isVip,
          metadata: platformCustomer.metadata,
        }
      : null,
    draft: null,
    messages: await getMessages(conversation.id, mailbox),
    cc: (await getNonSupportParticipants(conversation)).join(", "),
  };
};

export const getConversationBySlug = cache(async (slug: string): Promise<typeof conversations.$inferSelect | null> => {
  const result = await db.query.conversations.findFirst({
    where: eq(conversations.slug, slug),
  });
  return result ?? null;
});

export const getConversationById = cache(async (id: number): Promise<typeof conversations.$inferSelect | null> => {
  const result = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });
  return result ?? null;
});

export const getConversationBySlugAndMailbox = async (
  slug: string,
): Promise<typeof conversations.$inferSelect | null> => {
  const result = await db.query.conversations.findFirst({
    where: eq(conversations.slug, slug),
  });
  return result ?? null;
};

export const getNonSupportParticipants = async (conversation: Conversation): Promise<string[]> => {
  const mailbox = await getMailbox();
  if (!mailbox) throw new Error("Mailbox not found");

  const gmailSupportEmail = mailbox.gmailSupportEmailId
    ? await db.query.gmailSupportEmails.findFirst({
        where: eq(gmailSupportEmails.id, mailbox.gmailSupportEmailId),
        columns: { email: true },
      })
    : null;

  const messages = await db.query.conversationMessages.findMany({
    where: and(eq(conversationMessages.conversationId, conversation.id), isNull(conversationMessages.deletedAt)),
    orderBy: [asc(conversationMessages.createdAt)],
  });

  const participants = new Set<string>();

  for (const message of messages) {
    if (message.emailCc) {
      message.emailCc.forEach((cc: string) => participants.add(cc.toLowerCase()));
    }
    if (message.emailTo) {
      extractAddresses(message.emailTo).forEach((addr) => participants.add(addr.toLowerCase()));
    }
  }

  if (conversation.emailFrom) participants.delete(conversation.emailFrom.toLowerCase());
  if (gmailSupportEmail) participants.delete(gmailSupportEmail.email.toLowerCase());

  return Array.from(participants);
};

const getLastUserMessage = async (conversationId: number): Promise<typeof conversationMessages.$inferSelect | null> => {
  const lastUserMessage = await db.query.conversationMessages.findFirst({
    where: and(eq(conversationMessages.conversationId, conversationId), eq(conversationMessages.role, "user")),
    orderBy: [desc(conversationMessages.createdAt)],
  });
  return lastUserMessage ?? null;
};

export const getRelatedConversations = async (
  conversationId: number,
  params?: {
    where?: SQLWrapper;
    whereMessages?: SQLWrapper;
  },
): Promise<Conversation[]> => {
  const mailbox = await getMailbox();
  if (!mailbox) return [];
  const conversationWithMailbox = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conversationWithMailbox) return [];

  const lastUserMessage = await getLastUserMessage(conversationWithMailbox.id);
  if (!lastUserMessage) return [];

  const subject = conversationWithMailbox.subject ?? "";
  const body = lastUserMessage.cleanedUpText ?? "";
  if (!subject && !body) return [];

  const keywords = await emailKeywordsExtractor({
    mailbox,
    subject,
    body,
  });
  if (!keywords.length) return [];

  const messageIds = await searchEmailsByKeywords(keywords.join(" "));

  const relatedConversations = await db.query.conversations.findMany({
    where: and(
      not(eq(conversations.id, conversationId)),
      inArray(
        conversations.id,
        db
          .selectDistinct({ conversationId: conversationMessages.conversationId })
          .from(conversationMessages)
          .where(
            and(
              isNull(conversationMessages.deletedAt),
              not(eq(conversationMessages.role, "ai_assistant")),
              inArray(
                conversationMessages.id,
                messageIds.map((m) => m.id),
              ),
              ...(params?.whereMessages ? [params.whereMessages] : []),
            ),
          ),
      ),
      ...(params?.where ? [params.where] : []),
    ),
    orderBy: desc(conversations.createdAt),
  });
  return relatedConversations;
};

export const generateConversationSubject = async (
  conversationId: number,
  messages: Message[],
  mailbox: typeof mailboxes.$inferSelect,
) => {
  const subject =
    messages.length === 1 && messages[0] && messages[0].content.length <= 50
      ? messages[0].content
      : (
          await runAIQuery({
            model: MINI_MODEL,
            messages: messages.filter((m) => m.role === "user").map((m) => ({ role: "user", content: m.content })),
            mailbox,
            queryType: "response_generator",
            system:
              "Generate a brief, clear subject line (max 50 chars) that summarizes the main point of these messages. Respond with only the subject line, no other text.",
            maxTokens: 500,
            temperature: 0,
            functionId: "generate-conversation-subject",
          })
        ).text;

  await db.update(conversations).set({ subject }).where(eq(conversations.id, conversationId));
  return subject;
};
