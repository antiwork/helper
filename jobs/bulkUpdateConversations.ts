import { and, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { getMailbox } from "@/lib/data/mailbox";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

export const bulkUpdateConversations = async ({
  conversationFilter,
  status,
  userId,
  assignedToId,
  assignedToAI,
  message,
}: {
  conversationFilter: number[] | z.infer<typeof searchSchema>;
  status?: "open" | "closed" | "spam";
  userId: string;
  assignedToId?: string;
  assignedToAI?: boolean;
  message?: string;
}) => {
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());

  let where;
  if (Array.isArray(conversationFilter)) {
    where = inArray(conversations.id, conversationFilter);
  } else {
    const { where: searchWhere } = await searchConversations(mailbox, conversationFilter, "");
    const filters = Object.values(searchWhere);
    if (status !== undefined) {
      filters.push(ne(conversations.status, status));
    }
    where = and(...filters);
  }

  const results = await db.query.conversations.findMany({ columns: { id: true }, where });
  const targetConversationIds = results.map((c) => c.id);

  for (const conversationId of targetConversationIds) {
    await updateConversation(conversationId, {
      set: { status, assignedToId, assignedToAI },
      byUserId: userId,
      message,
    });
  }

  return {
    message: `Updated ${targetConversationIds.length} conversations to status: ${status}`,
  };
};
