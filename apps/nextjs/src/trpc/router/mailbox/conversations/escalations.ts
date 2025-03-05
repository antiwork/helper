import { currentUser } from "@clerk/nextjs/server";
import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { createEscalation, getActiveEscalation } from "@/lib/data/escalation";
import { getSlackPermalink } from "@/lib/slack/client";
import { conversationProcedure } from "./procedure";

export const escalationsRouter = {
  get: conversationProcedure.query(async ({ ctx }) => {
    const { conversation, mailbox } = ctx;
    const escalation = await getActiveEscalation(conversation.id);
    return escalation
      ? {
          slackUrl:
            mailbox.slackBotToken && escalation.slackChannel && escalation.slackMessageTs
              ? await getSlackPermalink(mailbox.slackBotToken, escalation.slackChannel, escalation.slackMessageTs)
              : null,
          isProcessing: !escalation.resolvedAt && !escalation.slackMessageTs,
        }
      : null;
  }),

  create: conversationProcedure.mutation(async ({ ctx }) => {
    const { conversation, mailbox, session } = ctx;

    const user = assertDefined(await currentUser());
    const escalation = await createEscalation(conversation, mailbox, user);
    if ("error" in escalation) throw new TRPCError({ code: "BAD_REQUEST", message: escalation.error });
  }),
} satisfies TRPCRouterRecord;
