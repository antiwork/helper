import { currentUser } from "@clerk/nextjs/server";
import { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
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
      const user = assertDefined(await currentUser());
      const note = await addNote({
        conversationId: ctx.conversation.id,
        message: input.message,
        fileSlugs: input.fileSlugs,
        user,
      });
      return { id: note.id };
    }),
} satisfies TRPCRouterRecord;
