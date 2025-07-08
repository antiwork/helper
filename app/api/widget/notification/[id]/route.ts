import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { messageNotifications, platformCustomers } from "@/db/schema";
import { corsOptions, corsResponse, withWidgetAuth } from "../../utils";

const updateNotificationSchema = z.object({
  status: z.enum(["read", "dismissed"]),
});

export function OPTIONS() {
  return corsOptions("PATCH");
}

export const PATCH = withWidgetAuth<{ id: string }>(async ({ request, context: { params } }, { session }) => {
  const { id } = await params;
  const notificationId = parseInt(id);

  if (!session.email) {
    return corsResponse({ error: "Not authorized - Anonymous session" }, { status: 401 }, "PATCH");
  }

  const body = await request.json();
  const { status } = updateNotificationSchema.parse(body);

  const platformCustomer = await db.query.platformCustomers.findFirst({
    where: eq(platformCustomers.email, session.email),
  });

  if (!platformCustomer) {
    return corsResponse({ error: "Unauthorized" }, { status: 403 }, "PATCH");
  }

  const [updatedNotification] = await db
    .update(messageNotifications)
    .set({ status })
    .where(
      and(
        eq(messageNotifications.id, notificationId),
        eq(messageNotifications.platformCustomerId, platformCustomer.id),
      ),
    )
    .returning();

  if (!updatedNotification) {
    return corsResponse({ error: "Notification not found" }, { status: 404 }, "PATCH");
  }

  return corsResponse({ success: true }, { status: 200 }, "PATCH");
});
