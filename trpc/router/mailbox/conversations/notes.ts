import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { addNote } from "@/lib/data/note";
import { conversationProcedure } from "./procedure";

export const notesRouter = {
  add: conversationProcedure
    .input(
      z.object({
        message: z.string(),
        fileSlugs: z.array(z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const note = await addNote({
        conversationId: ctx.conversation.id,
        message: input.message,
        fileSlugs: input.fileSlugs,
        user: ctx.user,
      });
      return { id: note.id };
    }),
} satisfies TRPCRouterRecord;
