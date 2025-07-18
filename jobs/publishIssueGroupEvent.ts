import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { issueGroups } from "@/db/schema";
import { issueGroupsChannelId } from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";

export const publishIssueGroupEvent = async ({
  issueGroupId,
  eventType,
}: {
  issueGroupId: number;
  eventType: "created" | "updated" | "deleted";
}) => {
  const issueGroup = await db.query.issueGroups.findFirst({
    where: eq(issueGroups.id, issueGroupId),
  });

  if (!issueGroup && eventType !== "deleted") {
    return;
  }

  // Publish to the global issue groups channel
  await publishToRealtime({
    channel: issueGroupsChannelId(),
    event: "issueGroupUpdated",
    data: {
      eventType,
      issueGroup: eventType === "deleted" ? { id: issueGroupId } : issueGroup,
    },
  });
};
