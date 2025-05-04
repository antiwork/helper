import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { messageNotifications, platformCustomers } from "@/db/schema";
import { authenticateWidget, corsOptions, corsResponse } from "../../utils";

const updateNotificationSchema = z.object({
  status: z.enum(["read", "dismissed"]),
});

export function OPTIONS() {
  return corsOptions("PATCH");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notificationId = parseInt(id);

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 }, "PATCH");
  }

  const { session, mailbox } = authResult;

  if (!session.email) {
    return corsResponse({ error: "Not authorized - Anonymous session" }, { status: 401 }, "PATCH");
  }

  const body = await request.json();
  const { status } = updateNotificationSchema.parse(body);

  const platformCustomer = await db.query.platformCustomers.findFirst({
    where: and(eq(platformCustomers.email, session.email), eq(platformCustomers.mailboxId, mailbox.id)),
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
}
