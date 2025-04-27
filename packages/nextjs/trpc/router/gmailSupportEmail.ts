import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db/client";
import { inngest } from "@/inngest/client";
import { createGmailSupportEmail, deleteGmailSupportEmail, getGmailSupportEmail } from "@/lib/data/gmailSupportEmail";
import { getGmailService, subscribeToMailbox } from "@/lib/gmail/client";
import { mailboxProcedure } from "./mailbox";

export const gmailSupportEmailRouter = {
  get: mailboxProcedure.query(async ({ ctx }) => {
    const gmailSupportEmail = await getGmailSupportEmail(ctx.mailbox);
    return gmailSupportEmail
      ? {
          id: gmailSupportEmail.id,
          email: gmailSupportEmail.email,
          createdAt: gmailSupportEmail.createdAt,
        }
      : null;
  }),

  create: mailboxProcedure
    .input(
      z.object({
        email: z.string().email(),
        accessToken: z.string(),
        refreshToken: z.string(),
        expiresAt: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { gmailSupportEmail } = await db.transaction(async (tx) => {
        const gmailSupportEmail = await createGmailSupportEmail(ctx.mailbox.slug, input, tx);
        const gmailService = await getGmailService(gmailSupportEmail);
        await subscribeToMailbox(gmailService);
        return { gmailSupportEmail };
      });
      await inngest.send({
        name: "gmail/import-recent-threads",
        data: {
          gmailSupportEmailId: gmailSupportEmail.id,
        },
      });
    }),
  delete: mailboxProcedure.mutation(async ({ ctx }) => {
    return await db.transaction(async (tx) => {
      const gmailSupportEmail = await getGmailSupportEmail(ctx.mailbox);
      if (!gmailSupportEmail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Gmail support email not found" });
      }
      const gmailService = await getGmailService(gmailSupportEmail);
      await gmailService.users.stop({ userId: "me" });
      await deleteGmailSupportEmail(tx, gmailSupportEmail.id);
      return { message: "Support email deleted successfully." };
    });
  }),
} satisfies TRPCRouterRecord;
