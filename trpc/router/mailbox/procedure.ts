import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getMailboxBySlug } from "@/lib/data/mailbox";
import { protectedProcedure } from "@/trpc/trpc";

export const mailboxProcedure = protectedProcedure
  .input(z.object({ mailboxSlug: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const mailbox = await getMailboxBySlug(input.mailboxSlug);
    if (!mailbox) throw new TRPCError({ code: "NOT_FOUND" });

    return next({ ctx: { ...ctx, mailbox } });
  });
