import { and, desc, eq, SQL, sql } from "drizzle-orm";
import { uniqBy } from "lodash-es";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { extractHashedWordsFromEmail } from "./extractHashedWordsFromEmail";

const MAX_SEARCH_RESULTS = 1000;

export async function searchEmailsByKeywords(
  keywords: string,
  mailboxId: number,
  filters: SQL[] = [],
  orderBy: SQL[] = [desc(conversationMessages.id)],
) {
  const searchIndex = extractHashedWordsFromEmail({ body: keywords }).join(" ");
  const searchResult = await db
    .select({
      id: conversationMessages.id,
      conversationId: conversationMessages.conversationId,
      cleanedUpText: conversationMessages.cleanedUpText,
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.mailboxId, mailboxId),
        sql`string_to_array(search_index, ' ') @> string_to_array(${searchIndex}, ' ')`,
        ...filters,
      ),
    )
    .orderBy(...orderBy)
    .limit(MAX_SEARCH_RESULTS);

  return uniqBy(searchResult, "conversationId");
}
