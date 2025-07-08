import { TRPCError } from "@trpc/server";
import { getMailbox } from "@/lib/data/mailbox";
import { protectedProcedure } from "@/trpc/trpc";

export const mailboxProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const mailbox = await getMailbox();
  if (!mailbox) throw new TRPCError({ code: "NOT_FOUND" });

  return next({ ctx: { ...ctx, mailbox } });
});
