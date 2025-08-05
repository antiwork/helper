import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { addNote, deleteNote, updateNote } from "@/lib/data/note";
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

  update: conversationProcedure
    .input(
      z.object({
        noteId: z.number(),
        message: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const updatedNote = await updateNote({
        noteId: input.noteId,
        message: input.message,
        userId: ctx.user.id,
      });

      return { id: updatedNote.id };
    }),

  delete: conversationProcedure
    .input(
      z.object({
        noteId: z.number(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await deleteNote({
        noteId: input.noteId,
        userId: ctx.user.id,
      });

      return { success: true };
    }),
} satisfies TRPCRouterRecord;
