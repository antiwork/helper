import "server-only";
import { render } from "@react-email/render";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import ConversationUpdateEmail from "@/lib/emails/conversationUpdate";
import { getFollowersForConversation } from "@/lib/data/conversationFollows";

const followNotificationSchema = z.object({
  conversationId: z.number(),
  conversationSlug: z.string(),
  conversationSubject: z.string(),
  eventType: z.enum([
    "conversation_updated",
    "message_created", 
    "note_added",
    "conversation_split",
  ]),
  eventDescription: z.string(),
  updatedByUserId: z.string().optional(),
});

type FollowNotificationPayload = z.infer<typeof followNotificationSchema>;

let resend: any = null;

const getResendClient = async () => {
  if (!resend && env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    resend = new Resend(env.RESEND_API_KEY);
  }
  return resend;
};

export const handleFollowNotification = async (payload: FollowNotificationPayload) => {
  try {
    const validatedPayload = followNotificationSchema.parse(payload);
    const {
      conversationId,
      conversationSlug,
      conversationSubject,
      eventType,
      eventDescription,
      updatedByUserId,
    } = validatedPayload;

    const resendClient = await getResendClient();
    if (!resendClient || !env.RESEND_FROM_ADDRESS) {
      console.log("Email not configured, skipping follow notifications");
      return;
    }

    // Get all followers for this conversation
    const followerIds = await getFollowersForConversation(conversationId);
    
    if (followerIds.length === 0) {
      return; // No followers, nothing to do
    }

    // Exclude the user who made the update from notifications
    const recipientIds = updatedByUserId 
      ? followerIds.filter(id => id !== updatedByUserId)
      : followerIds;

    if (recipientIds.length === 0) {
      return; // No recipients after filtering out the updater
    }

    // Get recipient email addresses and names
    const recipients = await db
      .select({
        email: authUsers.email,
        displayName: userProfiles.displayName,
      })
      .from(authUsers)
      .leftJoin(userProfiles, eq(authUsers.id, userProfiles.id))
      .where(inArray(authUsers.id, recipientIds));

    if (recipients.length === 0) {
      return; // No valid recipients found
    }

    // Get the name of the user who made the update
    let updatedByName: string | undefined;
    if (updatedByUserId) {
      const updater = await db
        .select({
          displayName: userProfiles.displayName,
          email: authUsers.email,
        })
        .from(authUsers)
        .leftJoin(userProfiles, eq(authUsers.id, userProfiles.id))
        .where(eq(authUsers.id, updatedByUserId))
        .limit(1);
      
      updatedByName = updater[0]?.displayName || updater[0]?.email || "Someone";
    }

    // Render the email template
    const emailHtml = await render(ConversationUpdateEmail({
      conversationSubject,
      conversationSlug,
      eventType,
      eventDescription,
      updatedByName,
    }));

    const emailText = await render(ConversationUpdateEmail({
      conversationSubject,
      conversationSlug,  
      eventType,
      eventDescription,
      updatedByName,
    }), { plainText: true });

    // Send emails to all followers
    const emailPromises = recipients
      .filter(recipient => recipient.email)
      .map(recipient => 
        resendClient.emails.send({
          from: env.RESEND_FROM_ADDRESS!,
          to: recipient.email!,
          subject: `[Conversation Update] ${conversationSubject}`,
          html: emailHtml,
          text: emailText,
        })
      );

    const results = await Promise.allSettled(emailPromises);
    
    // Log any failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`Failed to send follow notification email to recipient ${index}:`, result.reason);
      }
    });

    console.log(`Sent ${emailPromises.length} follow notification emails for conversation ${conversationId}`);
  } catch (error) {
    captureExceptionAndLog(error);
    throw error; // Re-throw so job system can handle retries
  }
};