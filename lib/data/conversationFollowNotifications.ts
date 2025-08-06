import "server-only";
import { render } from "@react-email/render";
import { eq, inArray } from "drizzle-orm";
import { type Transaction, db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "../shared/sentry";
import ConversationUpdateEmail from "../emails/conversationUpdate";
import { getFollowersForConversation } from "./conversationFollows";

const getResendClient = async () => {
  if (!env.RESEND_API_KEY) return null;
  const { Resend } = await import("resend");
  return new Resend(env.RESEND_API_KEY);
};

type SendFollowNotificationsParams = {
  conversationId: number;
  conversationSlug: string;
  conversationSubject: string;
  eventType: string;
  eventDescription: string;
  updatedByUserId?: string | null;
  tx?: Transaction | typeof db;
};

export const sendFollowNotifications = async ({
  conversationId,
  conversationSlug,
  conversationSubject,
  eventType,
  eventDescription,
  updatedByUserId,
  tx = db,
}: SendFollowNotificationsParams): Promise<void> => {
  try {
    const resendClient = await getResendClient();
    const fromAddress = env.RESEND_FROM_ADDRESS;
    if (!resendClient || !fromAddress) {
      return; // Email not configured, skip notifications
    }

    // Get all followers for this conversation
    const followerIds = await getFollowersForConversation(conversationId, tx);
    
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
    const recipients = await tx
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
      const updater = await tx
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
    const emailPromises = recipients.map(recipient => {
      if (!recipient.email) return null;

      return resendClient.emails.send({
        from: fromAddress,
        to: recipient.email,
        subject: `[Conversation Update] ${conversationSubject}`,
        html: emailHtml,
        text: emailText,
      });
    }).filter(Boolean);

    await Promise.allSettled(emailPromises);
  } catch (error) {
    captureExceptionAndLog(error);
  }
};