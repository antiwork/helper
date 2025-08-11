import { and, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { BasicUserProfile } from "@/db/schema";
import { notes } from "@/db/schema/notes";
import { triggerEvent } from "@/jobs/trigger";
import { finishFileUpload } from "./files";

export const addNote = async ({
  conversationId,
  message,
  user,
  slackChannel,
  slackMessageTs,
  fileSlugs = [],
}: {
  conversationId: number;
  message: string;
  user: BasicUserProfile | null;
  slackChannel?: string | null;
  slackMessageTs?: string | null;
  fileSlugs?: string[];
}) => {
  return await db.transaction(async (tx) => {
    const note = await tx
      .insert(notes)
      .values({
        conversationId,
        body: message,
        userId: user?.id,
        role: "staff",
        slackChannel,
        slackMessageTs,
      })
      .returning()
      .then(takeUniqueOrThrow);

    await finishFileUpload({ fileSlugs, noteId: note.id }, tx);
    if (user?.id) {
      await triggerEvent("conversations/send-follower-notification", {
        conversationId,
        eventType: "note_added" as const,
        triggeredByUserId: user.id,
        eventDetails: { note: note.body },
      });
    }

    return note;
  });
};

export const updateNote = async ({ noteId, message, userId }: { noteId: number; message: string; userId: string }) => {
  const [updatedNote] = await db
    .update(notes)
    .set({
      body: message,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning();

  if (!updatedNote) {
    throw new Error("Note not found or unauthorized");
  }

  return updatedNote;
};

export const deleteNote = async ({ noteId, userId }: { noteId: number; userId: string }) => {
  const [deletedNote] = await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .returning();

  if (!deletedNote) {
    throw new Error("Note not found or unauthorized");
  }

  return deletedNote;
};
