import { aliasedTable, and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages, conversations, platformCustomers } from "@/db/schema";
import { searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { Mailbox } from "@/lib/data/mailbox";

export const getAverageResponseTime = async (
  mailbox: Mailbox,
  startDate: Date,
  endDate: Date,
  filters?: Omit<z.infer<typeof searchSchema>, "cursor" | "limit">,
) => {
  const where = filters ? (await searchConversations(mailbox, { ...filters, limit: 1 })).where : null;

  const userMessages = aliasedTable(conversationMessages, "userMessages");

  const [{ averageResponseTimeSeconds } = {}] = await db
    .select({
      averageResponseTimeSeconds:
        sql<number>`avg(EXTRACT(EPOCH FROM (${conversationMessages.createdAt} - ${userMessages.createdAt})))`.mapWith(
          Number,
        ),
    })
    .from(conversationMessages)
    .innerJoin(userMessages, eq(conversationMessages.responseToId, userMessages.id))
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .leftJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
    .where(
      and(
        ...Object.values(where ?? {}),
        eq(conversationMessages.role, "staff"),
        gte(conversationMessages.createdAt, new Date(startDate)),
        lte(conversationMessages.createdAt, new Date(endDate)),
      ),
    );

  return averageResponseTimeSeconds ?? null;
};
