import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationEvents } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { createHumanSupportRequestEventPayload } from "@/lib/data/dashboardEvent";
import { getMailbox } from "@/lib/data/mailbox";
import { dashboardChannelId } from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";

export const publishRequestHumanSupport = async ({ conversationId }: { conversationId: number }) => {
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());

  const event = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversationEvents.findFirst({
      where: eq(conversationEvents.conversationId, conversationId),
      with: {
        conversation: {
          columns: { id: true, slug: true, emailFrom: true, subject: true },
          with: {
            platformCustomer: { columns: { value: true } },
          },
        },
      },
      orderBy: desc(conversationEvents.createdAt),
    }),
  );

  await publishToRealtime({
    channel: dashboardChannelId(),
    event: "event",
    data: createHumanSupportRequestEventPayload(event, mailbox),
  });

  return { success: true };
};
