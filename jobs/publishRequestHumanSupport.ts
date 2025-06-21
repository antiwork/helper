import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationEvents, mailboxes } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { createHumanSupportRequestEventPayload } from "@/lib/data/dashboardEvent";
import { dashboardChannelId } from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";

export const publishRequestHumanSupport = async ({
  mailboxSlug,
  conversationId,
}: {
  mailboxSlug: string;
  conversationId: number;
}) => {
  const mailbox = assertDefinedOrRaiseNonRetriableError(
    await db.query.mailboxes.findFirst({
      where: eq(mailboxes.slug, mailboxSlug),
    }),
  );

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
