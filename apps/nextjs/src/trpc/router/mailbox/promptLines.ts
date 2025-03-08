import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { api } from "@/trpc/server";
import { mailboxProcedure } from "./procedure";

export const promptLinesRouter = {
  update: mailboxProcedure
    .input(
      z.object({
        mailboxSlug: z.string().optional(),
        responseGeneratorPrompt: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input: { responseGeneratorPrompt } }) => {
      await api.mailbox.update({ mailboxSlug: ctx.mailbox.slug, responseGeneratorPrompt });
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
