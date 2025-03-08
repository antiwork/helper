import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { api } from "@/trpc/server";
import { mailboxProcedure } from "./procedure";

export const supportEmailRouter = {
  disconnect: mailboxProcedure.input(z.object({ mailboxSlug: z.string().optional() })).mutation(async ({ ctx }) => {
    await api.gmailSupportEmail.delete({ mailboxSlug: ctx.mailbox.slug });
    return { success: true };
  }),
  authorize: mailboxProcedure.input(z.object({ mailboxSlug: z.string().optional() })).mutation(({ ctx }) => {
    // This is a placeholder that will redirect to the Gmail authorization flow
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
