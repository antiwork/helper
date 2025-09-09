import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { memoize } from "lodash-es";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, conversations, mailboxes, platformCustomers } from "@/db/schema";
import { serializeConversation } from "@/lib/data/conversation";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import {
  CLOSED_BY_AGENT_MESSAGE,
  MARKED_AS_SPAM_BY_AGENT_MESSAGE,
  REOPENED_BY_AGENT_MESSAGE,
} from "@/lib/slack/constants";
import "server-only";
import { z } from "zod";
import { searchEmailsByKeywords } from "../../emailSearchService/searchEmailsByKeywords";

export const searchConversations = async (
  mailbox: typeof mailboxes.$inferSelect,
  filters: z.infer<typeof searchSchema>,
  currentUserId?: string,
) => {
  if (filters.category && !filters.search && !filters.status?.length) {
    filters.status = ["open"];
  }
  if (filters.category === "mine" && currentUserId) {
    filters.assignee = [currentUserId];
  }
  if (filters.category === "unassigned") {
    filters.isAssigned = false;
  }
  if (filters.category === "assigned") {
    filters.isAssigned = true;
  }

  // Build a lightweight subset of filters (conversation-level only) for keyword search
  const conversationWhere: Record<string, SQL> = {
    notMerged: isNull(conversations.mergedIntoId),
    ...(filters.status?.length ? { status: inArray(conversations.status, filters.status) } : {}),
    ...(filters.isAssigned === true ? { assignee: isNotNull(conversations.assignedToId) } : {}),
    ...(filters.isAssigned === false ? { assignee: isNull(conversations.assignedToId) } : {}),
    ...(filters.assignee?.length ? { assignee: inArray(conversations.assignedToId, filters.assignee) } : {}),
    ...(filters.isPrompt !== undefined ? { isPrompt: eq(conversations.isPrompt, filters.isPrompt) } : {}),
    ...(filters.createdAfter ? { createdAfter: gt(conversations.createdAt, new Date(filters.createdAfter)) } : {}),
    ...(filters.createdBefore ? { createdBefore: lt(conversations.createdAt, new Date(filters.createdBefore)) } : {}),
    ...(filters.customer?.length ? { customer: inArray(conversations.emailFrom, filters.customer) } : {}),
    ...(filters.anonymousSessionId
      ? { anonymousSessionId: eq(conversations.anonymousSessionId, filters.anonymousSessionId) }
      : {}),
    ...(filters.issueGroupId ? { issueGroup: eq(conversations.issueGroupId, filters.issueGroupId) } : {}),
  };

  const matches = filters.search ? await searchEmailsByKeywords(filters.search, Object.values(conversationWhere)) : [];

  // Full filter set used for the main query (includes heavier message/event filters)
  const where: Record<string, SQL> = {
    ...conversationWhere,
    ...(filters.repliedBy?.length || filters.repliedAfter || filters.repliedBefore
      ? {
          reply: exists(
            db
              .select()
              .from(conversationMessages)
              .where(
                and(
                  eq(conversationMessages.conversationId, conversations.id),
                  eq(conversationMessages.role, "staff"),
                  filters.repliedBy?.length ? inArray(conversationMessages.userId, filters.repliedBy) : undefined,
                  filters.repliedAfter ? gt(conversationMessages.createdAt, new Date(filters.repliedAfter)) : undefined,
                  filters.repliedBefore
                    ? lt(conversationMessages.createdAt, new Date(filters.repliedBefore))
                    : undefined,
                ),
              ),
          ),
        }
      : {}),
    ...(filters.reactionType
      ? {
          reaction: exists(
            db
              .select()
              .from(conversationMessages)
              .where(
                and(
                  eq(conversationMessages.conversationId, conversations.id),
                  eq(conversationMessages.reactionType, filters.reactionType),
                  isNull(conversationMessages.deletedAt),
                  filters.reactionAfter
                    ? gte(conversationMessages.reactionCreatedAt, new Date(filters.reactionAfter))
                    : undefined,
                  filters.reactionBefore
                    ? lte(conversationMessages.reactionCreatedAt, new Date(filters.reactionBefore))
                    : undefined,
                ),
              ),
          ),
        }
      : {}),
    ...(filters.events?.length ? { events: hasEvent(inArray(conversationEvents.type, filters.events)) } : {}),
    ...(filters.closed ? { closed: hasStatusChangeEvent("closed", filters.closed, CLOSED_BY_AGENT_MESSAGE) } : {}),
    ...(filters.reopened
      ? { reopened: hasStatusChangeEvent("open", filters.reopened, REOPENED_BY_AGENT_MESSAGE) }
      : {}),
    ...(filters.markedAsSpam
      ? { markedAsSpam: hasStatusChangeEvent("spam", filters.markedAsSpam, MARKED_AS_SPAM_BY_AGENT_MESSAGE) }
      : {}),
    ...(filters.hasUnreadMessages
      ? {
          hasUnreadMessages: and(
            isNotNull(conversations.assignedToId),
            exists(
              db
                .select()
                .from(conversationMessages)
                .where(
                  and(
                    eq(conversationMessages.conversationId, conversations.id),
                    eq(conversationMessages.role, "user"),
                    isNull(conversationMessages.deletedAt),
                    gt(
                      conversationMessages.createdAt,
                      sql`COALESCE(${conversations.lastReadByAssigneeAt}, ${conversations.createdAt})`,
                    ),
                  ),
                ),
            ),
          ),
        }
      : {}),
    ...(filters.isVip && mailbox.vipThreshold != null
      ? { isVip: sql`${platformCustomers.value} >= ${mailbox.vipThreshold * 100}` }
      : {}),
    ...(filters.minValueDollars != null
      ? { minValue: gt(platformCustomers.value, (filters.minValueDollars * 100).toString()) }
      : {}),
    ...(filters.maxValueDollars != null
      ? { maxValue: lt(platformCustomers.value, (filters.maxValueDollars * 100).toString()) }
      : {}),
    ...(filters.search
      ? {
          search: or(
            ilike(conversations.emailFrom, `%${filters.search}%`),
            inArray(
              conversations.id,
              matches.map((m) => m.conversationId),
            ),
          ),
        }
      : {}),
  };

  const orderByField =
    filters.status?.length === 1 && filters.status[0] === "closed"
      ? conversations.closedAt
      : sql`COALESCE(${conversations.lastMessageAt}, ${conversations.createdAt})`;
  const isOpenTicketsOnly = filters.status?.length === 1 && filters.status[0] === "open";
  const orderBy = isOpenTicketsOnly
    ? [filters.sort === "newest" ? desc(orderByField) : asc(orderByField)]
    : [filters.sort === "oldest" ? asc(orderByField) : desc(orderByField)];
  if ((filters.sort === "highest_value" || !filters.sort) && isOpenTicketsOnly && !filters.search) {
    orderBy.unshift(sql`${platformCustomers.value} DESC NULLS LAST`);
  }

  const list = memoize(() =>
    db
      .select({
        conversations_conversation: conversations,
        mailboxes_platformcustomer: platformCustomers,
        recent_message_cleanedUpText: sql<string | null>`recent_message.cleaned_up_text`,
        recent_message_createdAt: sql<string | null>`recent_message.created_at`,
        has_unread_messages: sql<boolean>`unread_messages.has_unread`,
      })
      .from(conversations)
      .leftJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
      .leftJoin(
        sql`LATERAL (
          SELECT
            ${conversationMessages.cleanedUpText} as cleaned_up_text, 
            ${conversationMessages.createdAt} as created_at
          FROM ${conversationMessages}
          WHERE ${and(
            eq(conversationMessages.conversationId, conversations.id),
            inArray(conversationMessages.role, ["user", "staff"]),
          )}
          ORDER BY ${desc(conversationMessages.createdAt)}
          LIMIT 1
        ) as recent_message`,
        sql`true`,
      )
      .leftJoin(
        sql`LATERAL (
          SELECT EXISTS(
            SELECT 1
            FROM ${conversationMessages}
            WHERE ${and(
              eq(conversationMessages.conversationId, conversations.id),
              eq(conversationMessages.role, "user"),
              isNull(conversationMessages.deletedAt),
              gt(
                conversationMessages.createdAt,
                sql`COALESCE(${conversations.lastReadByAssigneeAt}, ${conversations.createdAt})`,
              ),
              isNotNull(conversations.assignedToId),
            )}
          ) as has_unread
        ) as unread_messages`,
        sql`true`,
      )
      .where(and(...Object.values(where)))
      .orderBy(...orderBy)
      .limit(filters.limit + 1) // Get one extra to determine if there's a next page
      .offset(filters.cursor ? parseInt(filters.cursor) : 0)
      .then((results) => ({
        results: results
          .slice(0, filters.limit)
          .map(
            ({
              conversations_conversation,
              mailboxes_platformcustomer,
              recent_message_cleanedUpText,
              recent_message_createdAt,
              has_unread_messages,
            }) => ({
              ...serializeConversation(mailbox, conversations_conversation, mailboxes_platformcustomer),
              matchedMessageText:
                matches.find((m) => m.conversationId === conversations_conversation.id)?.cleanedUpText ?? null,
              recentMessageText: recent_message_cleanedUpText || null,
              recentMessageAt: recent_message_createdAt ? new Date(recent_message_createdAt) : null,
              unreadMessageCount: has_unread_messages ? 1 : undefined,
            }),
          ),
        nextCursor:
          results.length > filters.limit ? (parseInt(filters.cursor ?? "0") + filters.limit).toString() : null,
      })),
  );

  return {
    get list() {
      return list();
    },
    where,
  };
};

export const countSearchResults = async (where: Record<string, SQL>) => {
  const [total] = await db
    .select({ count: count() })
    .from(conversations)
    .leftJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
    .where(and(...Object.values(where)));

  return total?.count ?? 0;
};

export const getSearchResultIds = async (where: Record<string, SQL>) => {
  const results = await db
    .select({ id: conversations.id })
    .from(conversations)
    .leftJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
    .where(and(...Object.values(where)));

  return results.map((result) => result.id);
};

const hasEvent = (where?: SQL) =>
  exists(
    db
      .select()
      .from(conversationEvents)
      .where(and(eq(conversationEvents.conversationId, conversations.id), where)),
  );

const hasStatusChangeEvent = (
  status: (typeof conversations.$inferSelect)["status"],
  filters: { by?: "slack_bot" | "human"; byUserId?: string[]; before?: string; after?: string },
  slackBotReason: string,
) =>
  hasEvent(
    and(
      eq(conversationEvents.conversationId, conversations.id),
      filters.by === "slack_bot"
        ? eq(conversationEvents.reason, slackBotReason)
        : isNotNull(conversationEvents.byUserId),
      filters.byUserId?.length ? inArray(conversationEvents.byUserId, filters.byUserId) : undefined,
      eq(sql`${conversationEvents.changes}->>'status'`, status),
      filters.before ? lt(conversationEvents.createdAt, new Date(filters.before)) : undefined,
      filters.after ? gt(conversationEvents.createdAt, new Date(filters.after)) : undefined,
    ),
  );
