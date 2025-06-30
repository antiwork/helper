import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { deleteRecentSearch, getRecentSearches, saveRecentSearch } from "@/lib/data/recentSearches";
import { mailboxProcedure } from "./procedure";

export const recentSearchesRouter = {
  list: mailboxProcedure.query(async ({ ctx }) => {
    return await getRecentSearches(ctx.user.id, ctx.mailbox.id);
  }),

  save: mailboxProcedure
    .input(
      z.object({
        searchTerm: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await saveRecentSearch(ctx.user.id, ctx.mailbox.id, input.searchTerm);
    }),

  delete: mailboxProcedure
    .input(
      z.object({
        searchId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await deleteRecentSearch(ctx.user.id, input.searchId);
    }),
} satisfies TRPCRouterRecord;
