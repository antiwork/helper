import { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { mailboxProcedure } from "./procedure";

export const preferencesRouter = {
  get: mailboxProcedure.query(async ({ ctx }) => {
    const result = await db
      .select({
        preferences: mailboxes.preferences,
      })
      .from(mailboxes)
      .where(eq(mailboxes.id, ctx.mailbox.id))
      .limit(1);

    return result[0];
  }),

  update: mailboxProcedure
    .input(
      z.object({
        preferences: z.object({
          confetti: z.boolean(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(mailboxes)
        .set({
          preferences: input.preferences,
        })
        .where(eq(mailboxes.id, ctx.mailbox.id));
    }),
} satisfies TRPCRouterRecord;
