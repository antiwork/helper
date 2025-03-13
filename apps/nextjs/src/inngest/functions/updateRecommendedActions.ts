import { and, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversations, tools } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { assertDefinedOrRaiseNonRetriableError } from "@/inngest/utils";
import { getConversationById } from "@/lib/data/conversation";
import { getMailboxById } from "@/lib/data/mailbox";
import { generateAvailableTools } from "@/lib/tools/apiTool";

export default inngest.createFunction(
  { id: "update-conversation-recommended-actions", concurrency: 10 },
  { event: "conversations/update-recommended-actions" },
  async ({ event, step }) => {
    const { conversationId } = event.data;

    return await step.run("get-conversation", async () => {
      const conversation = assertDefinedOrRaiseNonRetriableError(await getConversationById(conversationId));
      const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(conversation.mailboxId));

      const mailboxTools = await db.query.tools.findMany({
        where: and(eq(tools.mailboxId, mailbox.id), eq(tools.enabled, true)),
      });
      const toolCalls = await generateAvailableTools(conversation, mailbox, mailboxTools);

      const result = await db
        .update(conversations)
        .set({
          recommendedActions: toolCalls.map(({ toolName, args }) => {
            switch (toolName) {
              case "close":
                return { type: "close" };
              case "spam":
                return { type: "spam" };
              case "assign":
                return { type: "assign", clerkUserId: args.userId };
              default:
                return { type: "tool", slug: toolName, parameters: args };
            }
          }),
        })
        .where(eq(conversations.id, conversationId))
        .returning()
        .then(takeUniqueOrThrow);

      return result.recommendedActions;
    });
  },
);
