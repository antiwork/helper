import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationFollowers, conversations, userProfiles } from "@/db/schema";
import { env } from "@/lib/env";

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
  };
};

export const sendFollowerNotificationJob = async (payload: SendFollowerNotificationPayload) => {
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
      user: {
        with: {
          user: {
            columns: {
              email: true,
            },
          },
        },
        columns: {
          displayName: true,
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

  const generateEmailContent = () => {
    const conversationLink = `${env.AUTH_URL || "https://helperai.dev"}/conversations/${conversation.slug}`;
    const baseSubject = `Update on conversation: ${conversation.subject}`;

    switch (eventType) {
      case "new_message":
        return {
          subject: `${baseSubject} - New message`,
          html: `
              <h2>New message in conversation</h2>
              <p><strong>${triggeredByName}</strong> added a new message to the conversation:</p>
              <p><strong>Subject:</strong> ${conversation.subject}</p>
              <p><strong>Customer:</strong> ${conversation.emailFrom}</p>
              ${eventDetails.message ? `<blockquote style="background: #f5f5f5; padding: 10px; border-left: 3px solid #007bff;">${eventDetails.message.substring(0, 200)}${eventDetails.message.length > 200 ? "..." : ""}</blockquote>` : ""}
              <p><a href="${conversationLink}">View conversation →</a></p>
              <hr>
              <p style="color: #666; font-size: 12px;">You're receiving this because you're following this conversation. <a href="${conversationLink}">Unfollow</a></p>
            `,
        };
      case "status_change":
        return {
          subject: `${baseSubject} - Status changed`,
          html: `
              <h2>Conversation status changed</h2>
              <p><strong>${triggeredByName}</strong> changed the status of this conversation:</p>
              <p><strong>Subject:</strong> ${conversation.subject}</p>
              <p><strong>Customer:</strong> ${conversation.emailFrom}</p>
              <p><strong>Status:</strong> ${eventDetails.oldStatus} → <strong>${eventDetails.newStatus}</strong></p>
              <p><a href="${conversationLink}">View conversation →</a></p>
              <hr>
              <p style="color: #666; font-size: 12px;">You're receiving this because you're following this conversation. <a href="${conversationLink}">Unfollow</a></p>
            `,
        };
      case "assignment_change":
        return {
          subject: `${baseSubject} - Assignment changed`,
          html: `
              <h2>Conversation assignment changed</h2>
              <p><strong>${triggeredByName}</strong> changed the assignment of this conversation:</p>
              <p><strong>Subject:</strong> ${conversation.subject}</p>
              <p><strong>Customer:</strong> ${conversation.emailFrom}</p>
              <p><strong>Assigned to:</strong> ${eventDetails.oldAssignee || "Unassigned"} → <strong>${eventDetails.newAssignee || "Unassigned"}</strong></p>
              <p><a href="${conversationLink}">View conversation →</a></p>
              <hr>
              <p style="color: #666; font-size: 12px;">You're receiving this because you're following this conversation. <a href="${conversationLink}">Unfollow</a></p>
            `,
        };
      case "note_added":
        return {
          subject: `${baseSubject} - New note`,
          html: `
              <h2>New note added</h2>
              <p><strong>${triggeredByName}</strong> added a note to this conversation:</p>
              <p><strong>Subject:</strong> ${conversation.subject}</p>
              <p><strong>Customer:</strong> ${conversation.emailFrom}</p>
              <p><a href="${conversationLink}">View conversation →</a></p>
              <hr>
              <p style="color: #666; font-size: 12px;">You're receiving this because you're following this conversation. <a href="${conversationLink}">Unfollow</a></p>
            `,
        };
      default:
        return {
          subject: baseSubject,
          html: `
              <h2>Conversation updated</h2>
              <p><strong>${triggeredByName}</strong> made changes to this conversation:</p>
              <p><strong>Subject:</strong> ${conversation.subject}</p>
              <p><strong>Customer:</strong> ${conversation.emailFrom}</p>
              <p><a href="${conversationLink}">View conversation →</a></p>
              <hr>
              <p style="color: #666; font-size: 12px;">You're receiving this because you're following this conversation. <a href="${conversationLink}">Unfollow</a></p>
            `,
        };
    }
  };

  const emailContent = generateEmailContent();

  const { Resend } = await import("resend");
  const resend = new Resend(env.RESEND_API_KEY);

  const emailPromises = followers.map(async (follower) => {
    const email = follower.user.user?.email;
    if (!email) {
      return;
    }

    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    } catch (_error) {
      // Failed to send notification
    }
  });

  await Promise.allSettled(emailPromises);

  return {
    conversationId,
    eventType,
    notificationsSent: followers.length,
  };
};
