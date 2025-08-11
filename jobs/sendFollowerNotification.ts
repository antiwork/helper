import { and, eq, ne } from "drizzle-orm";
import { Resend } from "resend";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationFollowers, conversations, userProfiles } from "@/db/schema";
import FollowerNotificationEmail from "@/lib/emails/followerNotification";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

type SendFollowerNotificationPayload = {
  conversationId: number;
  eventType: "new_message" | "status_change" | "assignment_change" | "note_added";
  triggeredByUserId: string;
  eventDetails: {
    message?: string;
    oldStatus?: string;
    newStatus?: string;
    oldAssignee?: string;
    newAssignee?: string;
    note?: string;
  };
};

export const sendFollowerNotification = async (payload: SendFollowerNotificationPayload) => {
  try {
    const { conversationId, eventType, triggeredByUserId, eventDetails } = payload;

    if (!conversationId || !eventType || !triggeredByUserId) {
      return;
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      return;
    }

    const conversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      columns: {
        id: true,
        slug: true,
        subject: true,
        emailFrom: true,
      },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const followers = await db.query.conversationFollowers.findMany({
      where: and(
        eq(conversationFollowers.conversationId, conversationId),
        ne(conversationFollowers.userId, triggeredByUserId),
      ),
      with: {
        userProfile: {
          columns: {
            displayName: true,
          },
        },
        user: {
          columns: {
            email: true,
          },
        },
      },
    });

    if (followers.length === 0) {
      return;
    }

    const triggeredByUser = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, triggeredByUserId),
      columns: {
        displayName: true,
      },
      with: {
        user: {
          columns: {
            email: true,
          },
        },
      },
    });

    const triggeredByName = triggeredByUser?.displayName || triggeredByUser?.user?.email || "Someone";

    const conversationLink = `${env.AUTH_URL}/conversations?id=${conversation.slug}`;
    const resend = new Resend(env.RESEND_API_KEY);

    const emailPromises = followers.map(async (follower) => {
      const email = follower.user?.email;
      if (!email) {
        return { success: false, reason: "No email address" };
      }

      const eventDescription =
        eventType === "new_message"
          ? "New message"
          : eventType === "status_change"
            ? "Status changed"
            : eventType === "assignment_change"
              ? "Assignment changed"
              : eventType === "note_added"
                ? "New note"
                : "Update";

      try {
        const sanitizedSubject = (conversation.subject || "Untitled").replace(/[\r\n]/g, "");
        await resend.emails.send({
          from: env.RESEND_FROM_ADDRESS!,
          to: assertDefined(email),
          subject: `${eventDescription} in "${sanitizedSubject}"`,
          react: FollowerNotificationEmail({
            eventType,
            triggeredByName,
            conversationSubject: sanitizedSubject,
            customerEmail: conversation.emailFrom || "Unknown",
            conversationLink,
            eventDetails,
          }),
        });
        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error);
        return { success: false, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);

    return {
      conversationId,
      eventType,
      emailResults,
      totalFollowers: followers.length,
    };
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  }
};
