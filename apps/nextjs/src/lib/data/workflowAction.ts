import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes, workflowActions } from "@/db/schema";
import { generateResponseWithPrompt } from "../ai/generateResponseWithPrompt";
import { getMetadata, timestamp } from "../metadataApiClient";
import { updateConversation, updateConversationStatus } from "./conversation";
import { createReply } from "./conversationMessage";
import { addNote } from "./note";
import { canSendAutomatedReplies, getClerkOrganization } from "./organization";

export const runWorkflowAction = async (
  action: typeof workflowActions.$inferSelect,
  message: typeof conversationMessages.$inferSelect,
): Promise<boolean> => {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, message.conversationId),
  });
  if (!conversation) {
    console.error(`Conversation not found for message ${message.id}`);
    return false;
  }

  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.id, conversation.mailboxId),
    with: { mailboxesMetadataApi: true },
  });
  if (!mailbox) {
    console.error(`Mailbox not found for conversation ${conversation.id}`);
    return false;
  }

  const organization = await getClerkOrganization(mailbox.clerkOrganizationId);
  if (!organization) {
    console.error(`Organization not found for mailbox ${mailbox.id}`);
    return false;
  }

  if (
    (action.actionType === "send_email" || action.actionType === "send_auto_reply_from_metadata") &&
    !canSendAutomatedReplies(organization)
  ) {
    console.log(
      `Workflow action '${action.actionType}' short-circuited: Organization ${organization.id} can't send automated replies`,
    );
    return false;
  }

  const createAndSendWorkflowEmail = (body: string) =>
    createReply({
      conversationId: conversation.id,
      message: body,
      user: null,
      responseToId: message.id,
      role: "workflow",
      close: false,
    });

  switch (action.actionType) {
    case "send_email": {
      await createAndSendWorkflowEmail(action.actionValue);
      break;
    }
    case "send_auto_reply_from_metadata": {
      const metadata = mailbox.mailboxesMetadataApi
        ? await getMetadata(mailbox.mailboxesMetadataApi, {
            email: message.emailFrom,
            timestamp: timestamp(),
          })
        : null;
      if (!metadata) {
        console.log(
          `Workflow action '${action.actionType}' short-circuited: No metadata found for email ${message.id}`,
        );
        return false;
      }

      try {
        const body = await generateAutoReplyFromMetadata({
          message: { ...message, conversation },
          mailbox,
          metadata,
        });
        await createAndSendWorkflowEmail(body);
      } catch (e) {
        console.error(`Workflow action 'send_auto_reply_from_metadata' failed. Error: ${e}`);
      }
      break;
    }
    case "change_status": {
      console.log(`Workflow action '${action.actionType}' short-circuited: Deprecated action type`);
      return false;
    }
    case "add_note": {
      await addNote({ conversationId: conversation.id, message: action.actionValue, user: null });
      break;
    }
    case "change_helper_status": {
      await updateConversationStatus(conversation, action.actionValue);
      break;
    }
    case "assign_user": {
      await updateConversation(conversation.id, {
        set: { assignedToClerkId: action.actionValue },
        message: "Assigned by workflow",
        byUserId: null,
      });
      break;
    }
    default: {
      console.error(`Unknown action type: ${action.actionType}`);
      return false;
    }
  }

  return true;
};

async function generateAutoReplyFromMetadata({
  message,
  mailbox,
  metadata,
}: {
  message: typeof conversationMessages.$inferSelect & { conversation: typeof conversations.$inferSelect };
  mailbox: typeof mailboxes.$inferSelect;
  metadata: object | null;
}) {
  const append = "Generate a text to reply to the provided email based on info in metadata.";
  const response = await generateResponseWithPrompt({
    message,
    mailbox,
    metadata,
    appendPrompt: append,
  });
  return response;
}
