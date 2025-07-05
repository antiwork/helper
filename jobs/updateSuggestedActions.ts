import { eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversations, tools } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { getConversationById } from "@/lib/data/conversation";
import { generateSuggestedActions } from "@/lib/tools/apiTool";

export const updateSuggestedActions = async ({ conversationId }: { conversationId: number }) => {
  const conversation = assertDefinedOrRaiseNonRetriableError(await getConversationById(conversationId));

  const mailboxTools = await db.query.tools.findMany({
    where: eq(tools.enabled, true),
  });
  const suggestedActions = await generateSuggestedActions(conversation, mailboxTools);

  const result = await db
    .update(conversations)
    .set({ suggestedActions })
    .where(eq(conversations.id, conversationId))
    .returning()
    .then(takeUniqueOrThrow);

  return result.suggestedActions;
};
