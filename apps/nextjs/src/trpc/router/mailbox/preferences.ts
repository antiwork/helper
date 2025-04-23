import { TRPCRouterRecord } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { mailboxProcedure } from "./procedure";

export const preferencesRouter = {
  get: mailboxProcedure.query(async ({ ctx }) => {
    return assertDefined(
      await db.query.mailboxes.findFirst({
        where: eq(mailboxes.id, ctx.mailbox.id),
        columns: {
          preferences: true,
        },
      }),
    );
  }),

  update: mailboxProcedure
    .input(
      z.object({
        preferences: z.object({
          confetti: z.boolean(),
          theme: z
            .object({
              background: z.string().regex(/^#([0-9a-f]{6})$/i),
              foreground: z.string().regex(/^#([0-9a-f]{6})$/i),
              primary: z.string().regex(/^#([0-9a-f]{6})$/i),
              accent: z.string().regex(/^#([0-9a-f]{6})$/i),
              sidebarBackground: z.string().regex(/^#([0-9a-f]{6})$/i),
            })
            .optional(),
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
