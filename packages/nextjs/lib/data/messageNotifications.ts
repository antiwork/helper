"use server";

import { and, eq, inArray } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import { messageNotifications, platformCustomers } from "@/db/schema";
import type { NotificationStatus } from "@/db/schema/messageNotifications";

type PlatformCustomer = typeof platformCustomers.$inferSelect;

const MAX_NOTIFICATIONS_TO_FETCH = 10;
const NOTIFICATIONS_STATUS_TO_FETCH: NotificationStatus[] = ["pending", "sent"];

export async function createMessageNotification({
  messageId,
  conversationId,
  platformCustomerId,
  notificationText = "You have a new message",
  tx = db,
}: {
  messageId: number;
  conversationId: number;
  platformCustomerId: number;
  notificationText?: string;
  tx?: Transaction | typeof db;
}) {
  const notification = await tx
    .insert(messageNotifications)
    .values({
      messageId,
      conversationId,
      platformCustomerId,
      notificationText,
      status: "pending",
    })
    .returning()
    .then(takeUniqueOrThrow);

  return notification;
}

export async function fetchAndUpdateUnsentNotifications(
  platformCustomer: PlatformCustomer,
): Promise<{ id: number; text: string; conversationSlug: string }[]> {
  const unsentNotifications = await db.query.messageNotifications.findMany({
    where: and(
      eq(messageNotifications.platformCustomerId, platformCustomer.id),
      inArray(messageNotifications.status, NOTIFICATIONS_STATUS_TO_FETCH),
    ),
    with: {
      conversation: true,
    },
    columns: {
      id: true,
      status: true,
      sentAt: true,
      notificationText: true,
    },
    orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
    limit: MAX_NOTIFICATIONS_TO_FETCH,
  });

  const notificationsToUpdate = unsentNotifications.filter(
    (notification) => notification.sentAt === null || notification.status === "pending",
  );

  if (notificationsToUpdate.length > 0) {
    await db
      .update(messageNotifications)
      .set({
        sentAt: new Date(),
        status: "sent",
      })
      .where(
        inArray(
          messageNotifications.id,
          notificationsToUpdate.map((n) => n.id),
        ),
      );
  }

  return unsentNotifications.map((notification) => ({
    id: notification.id,
    text: notification.notificationText ?? "You have a new message",
    conversationSlug: notification.conversation.slug,
  }));
}
