import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { issueGroupsChannelId } from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";

export const handleIssueGroupStatusChange = async ({ conversationId }: { conversationId: number }) => {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: {
      issueGroupId: true,
    },
  });

  if (!conversation?.issueGroupId) {
    return { message: "No issue group associated with conversation" };
  }

  // Publish realtime update to refresh issue group counts
  await publishToRealtime({
    channel: issueGroupsChannelId(),
    event: "issueGroupUpdated",
    data: {
      issueGroupId: conversation.issueGroupId,
      conversationId,
    },
  });

  return {
    message: "Issue group status change handled",
    issueGroupId: conversation.issueGroupId,
  };
};
