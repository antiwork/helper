import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { notes } from "@/db/schema/notes";
import { DbOrAuthUser } from "@/db/supabaseSchema/auth";
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
  user: DbOrAuthUser | null;
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

    return note;
  });
};
