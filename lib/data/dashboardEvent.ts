import { conversationEvents, conversationMessages, conversations, mailboxes, platformCustomers } from "@/db/schema";
import { determineVipStatus } from "@/lib/data/platformCustomer";

type DashboardEventPayload = {
  type: "email" | "chat" | "ai_reply" | "human_support_request" | "good_reply" | "bad_reply";
  id: string;
  conversationSlug: string;
  emailFrom: string | null;
  title: string | null;
  value: number | null;
  isVip: boolean;
  description?: string | null;
  timestamp: Date;
};

type ConversationForEvent = Pick<typeof conversations.$inferSelect, "slug" | "emailFrom" | "subject"> & {
  platformCustomer: Pick<typeof platformCustomers.$inferSelect, "value"> | null;
};

type BaseEventInput = {
  conversation: ConversationForEvent;
  mailbox: Pick<typeof mailboxes.$inferSelect, "vipThreshold">;
};

const createBaseEventPayload = ({
  conversation,
  mailbox,
}: BaseEventInput): Omit<DashboardEventPayload, "type" | "id" | "description" | "timestamp"> => {
  const value = conversation.platformCustomer?.value ? Number(conversation.platformCustomer.value) : null;
  return {
    conversationSlug: conversation.slug,
    emailFrom: conversation.emailFrom,
    title: conversation.subject,
    value,
    isVip: determineVipStatus(value, mailbox.vipThreshold),
  };
};

export const createMessageEventPayload = (
  message: Pick<typeof conversationMessages.$inferSelect, "id" | "role" | "emailTo" | "cleanedUpText" | "createdAt"> & {
    conversation: ConversationForEvent;
  },
  mailbox: Pick<typeof mailboxes.$inferSelect, "vipThreshold">,
): DashboardEventPayload => {
  return {
    ...createBaseEventPayload({ conversation: message.conversation, mailbox }),
    type: message.role === "ai_assistant" ? "ai_reply" : message.emailTo ? "email" : "chat",
    id: `${message.id}-message`,
    description: message.cleanedUpText,
    timestamp: message.createdAt,
  };
};

export const createReactionEventPayload = (
  message: Pick<
    typeof conversationMessages.$inferSelect,
    "id" | "reactionType" | "reactionFeedback" | "reactionCreatedAt"
  > & {
    conversation: ConversationForEvent;
  },
  mailbox: Pick<typeof mailboxes.$inferSelect, "vipThreshold">,
): DashboardEventPayload => {
  return {
    ...createBaseEventPayload({ conversation: message.conversation, mailbox }),
    type: message.reactionType === "thumbs-up" ? "good_reply" : "bad_reply",
    id: `${message.id}-reaction`,
    description: message.reactionFeedback,
    timestamp: message.reactionCreatedAt!,
  };
};

export const createHumanSupportRequestEventPayload = (
  request: Pick<typeof conversationEvents.$inferSelect, "id" | "createdAt"> & {
    conversation: ConversationForEvent;
  },
  mailbox: Pick<typeof mailboxes.$inferSelect, "vipThreshold">,
): DashboardEventPayload => {
  return {
    ...createBaseEventPayload({ conversation: request.conversation, mailbox }),
    type: "human_support_request",
    id: `${request.id}-human-support-request`,
    timestamp: request.createdAt,
  };
};
