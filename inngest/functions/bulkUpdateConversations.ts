import { and, inArray, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { updateConversation } from "@/lib/data/conversation";
import { searchConversations } from "@/lib/data/conversation/search";
import { getMailboxById } from "@/lib/data/mailbox";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

export default inngest.createFunction(
  { id: "bulk-update-conversations", concurrency: 5 },
  { event: "conversations/bulk-update" },
  async ({ event, step }) => {
    const { conversationFilter, status, userId, mailboxId } = event.data;

    const targetConversationIds = await step.run("find-conversations", async () => {
      let where;
      if (Array.isArray(conversationFilter)) {
        where = inArray(conversations.id, conversationFilter);
      } else {
        const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(mailboxId));
        const { where: searchWhere } = await searchConversations(mailbox, conversationFilter, "");
        where = and(...Object.values(searchWhere), ne(conversations.status, status));
      }

      const results = await db.query.conversations.findMany({ columns: { id: true }, where });
      return results.map((c) => c.id);
    });

    await step.run("update-conversations", async () => {
      for (const conversationId of targetConversationIds) {
        await updateConversation(conversationId, { set: { status }, byUserId: userId });
      }
    });

    return {
      message: `Updated ${targetConversationIds.length} conversations to status: ${status}`,
    };
  },
);
