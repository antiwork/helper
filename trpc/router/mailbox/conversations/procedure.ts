import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { mailboxProcedure } from "../procedure";

export const conversationProcedure = mailboxProcedure
  .input(z.object({ conversationSlug: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.slug, input.conversationSlug),
    });

    if (!conversation) throw new TRPCError({ code: "NOT_FOUND" });

    return next({ ctx: { ...ctx, conversation } });
  });
