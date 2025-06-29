import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { messageNotifications } from "@/db/schema";
import type { NotificationStatus } from "@/db/schema/messageNotifications";

const messageNotificationFactory = {
  create: async (
    messageId: number,
    conversationId: number,
    platformCustomerId: number,
    overrides: Partial<typeof messageNotifications.$inferInsert> = {},
  ) => {
    const messageNotification = await db
      .insert(messageNotifications)
      .values({
        messageId,
        conversationId,
        platformCustomerId,
        status: "pending" as NotificationStatus,
        notificationText: faker.lorem.sentence(),
        sentAt: null,
        readAt: null,
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { messageNotification };
  },
};
