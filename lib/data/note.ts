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

    // Send follower notification for new notes
    if (user?.id) {
      await triggerEvent("conversations/send-follower-notification", {
        conversationId,
        eventType: "note_added" as const,
        triggeredByUserId: user.id,
        eventDetails: {},
      });
    }

    return note;
  });
};
