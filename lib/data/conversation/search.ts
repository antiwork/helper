import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  SQL,
  sql,
} from "drizzle-orm";
import { memoize } from "lodash-es";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, conversations, mailboxes, platformCustomers } from "@/db/schema";
import { serializeConversation } from "@/lib/data/conversation";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { getMetadataApiByMailbox } from "@/lib/data/mailboxMetadataApi";
import {
  CLOSED_BY_AGENT_MESSAGE,
  MARKED_AS_SPAM_BY_AGENT_MESSAGE,
  REOPENED_BY_AGENT_MESSAGE,
} from "@/lib/slack/constants";
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

  // Filters on conversations and messages that we can pass to searchEmailsByKeywords
  let where: Record<string, SQL> = {
    mailboxId: eq(conversations.mailboxId, mailbox.id),
    notMerged: isNull(conversations.mergedIntoId),
    ...(filters.status?.length ? { status: inArray(conversations.status, filters.status) } : {}),
    ...(filters.assignee?.length ? { assignee: inArray(conversations.assignedToClerkId, filters.assignee) } : {}),
    ...(filters.isAssigned === true ? { assignee: isNotNull(conversations.assignedToClerkId) } : {}),
    ...(filters.isAssigned === false ? { assignee: isNull(conversations.assignedToClerkId) } : {}),
    ...(filters.isPrompt !== undefined ? { isPrompt: eq(conversations.isPrompt, filters.isPrompt) } : {}),
    ...(filters.createdAfter ? { createdAfter: gt(conversations.createdAt, new Date(filters.createdAfter)) } : {}),
    ...(filters.createdBefore ? { createdBefore: lt(conversations.createdAt, new Date(filters.createdBefore)) } : {}),
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
                  filters.repliedBy?.length ? inArray(conversationMessages.clerkUserId, filters.repliedBy) : undefined,
                  filters.repliedAfter ? gt(conversationMessages.createdAt, new Date(filters.repliedAfter)) : undefined,
                  filters.repliedBefore
                    ? lt(conversationMessages.createdAt, new Date(filters.repliedBefore))
                    : undefined,
                ),
              ),
          ),
        }
      : {}),
    ...(filters.customer?.length ? { customer: inArray(conversations.emailFrom, filters.customer) } : {}),
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
  };

  const matches = filters.search ? await searchEmailsByKeywords(filters.search, mailbox.id, Object.values(where)) : [];

  // Additional filters we can't pass to searchEmailsByKeywords
  where = {
    ...where,
    ...(filters.isVip && mailbox.vipThreshold
      ? { isVip: sql`${platformCustomers.value} >= ${mailbox.vipThreshold * 100}` }
      : {}),
    ...(filters.minValueDollars
      ? { minValue: gt(platformCustomers.value, (filters.minValueDollars * 100).toString()) }
      : {}),
    ...(filters.maxValueDollars
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
      : conversations.lastUserEmailCreatedAt;
  const orderBy = [filters.sort === "newest" ? desc(orderByField) : asc(orderByField)];
  const metadataEnabled = !filters.search && !!(await getMetadataApiByMailbox(mailbox));
  if (metadataEnabled && (filters.sort === "highest_value" || !filters.sort)) {
    orderBy.unshift(sql`${platformCustomers.value} DESC NULLS LAST`);
  }

  const list = memoize(() =>
    db
      .select()
      .from(conversations)
      .leftJoin(
        platformCustomers,
        and(
          eq(conversations.mailboxId, platformCustomers.mailboxId),
          eq(conversations.emailFrom, platformCustomers.email),
        ),
      )
      .where(and(...Object.values(where)))
      .orderBy(...orderBy)
      .limit(filters.limit + 1) // Get one extra to determine if there's a next page
      .offset(filters.cursor ? parseInt(filters.cursor) : 0)
      .then((results) => ({
        results: results.slice(0, filters.limit).map(({ conversations_conversation, mailboxes_platformcustomer }) => ({
          ...serializeConversation(mailbox, conversations_conversation, mailboxes_platformcustomer),
          matchedMessageText:
            matches.find((m) => m.conversationId === conversations_conversation.id)?.cleanedUpText ?? null,
        })),
        nextCursor:
          results.length > filters.limit ? (parseInt(filters.cursor ?? "0") + filters.limit).toString() : null,
      })),
  );

  return {
    get list() {
      return list();
    },
    where,
    metadataEnabled,
  };
};

export const countSearchResults = async (where: Record<string, SQL>) => {
  const [total] = await db
    .select({ count: count() })
    .from(conversations)
    .leftJoin(
      platformCustomers,
      and(
        eq(conversations.mailboxId, platformCustomers.mailboxId),
        eq(conversations.emailFrom, platformCustomers.email),
      ),
    )
    .where(and(...Object.values(where)));

  return total?.count ?? 0;
};

export const getSearchResultIds = async (where: Record<string, SQL>) => {
  const results = await db
    .select({ id: conversations.id })
    .from(conversations)
    .leftJoin(
      platformCustomers,
      and(
        eq(conversations.mailboxId, platformCustomers.mailboxId),
        eq(conversations.emailFrom, platformCustomers.email),
      ),
    )
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
  filters: { by?: "slack_bot" | "human"; byClerkId?: string[]; before?: string; after?: string },
  slackBotReason: string,
) =>
  hasEvent(
    and(
      eq(conversationEvents.conversationId, conversations.id),
      filters.by === "slack_bot"
        ? eq(conversationEvents.reason, slackBotReason)
        : isNotNull(conversationEvents.byClerkUserId),
      filters.byClerkId?.length ? inArray(conversationEvents.byClerkUserId, filters.byClerkId) : undefined,
      eq(sql`${conversationEvents.changes}->>'status'`, status),
      filters.before ? lt(conversationEvents.createdAt, new Date(filters.before)) : undefined,
      filters.after ? gt(conversationEvents.createdAt, new Date(filters.after)) : undefined,
    ),
  );
