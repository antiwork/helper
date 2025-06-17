import { and, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { getMailboxById } from "@/lib/data/mailbox";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

export const bulkUpdateConversations = async ({
  conversationFilter,
  status,
  userId,
  mailboxId,
}: {
  conversationFilter: number[] | z.infer<typeof searchSchema>;
  status: "open" | "closed" | "spam";
  userId: string;
  mailboxId: number;
}) => {
  let where;
  if (Array.isArray(conversationFilter)) {
    where = inArray(conversations.id, conversationFilter);
  } else {
    const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(mailboxId));
    const { where: searchWhere } = await searchConversations(mailbox, conversationFilter, "");
    where = and(...Object.values(searchWhere), ne(conversations.status, status));
  }

  const results = await db.query.conversations.findMany({ columns: { id: true }, where });
  const targetConversationIds = results.map((c) => c.id);

  for (const conversationId of targetConversationIds) {
    await updateConversation(conversationId, { set: { status }, byUserId: userId });
  }

  return {
    message: `Updated ${targetConversationIds.length} conversations to status: ${status}`,
  };
};
