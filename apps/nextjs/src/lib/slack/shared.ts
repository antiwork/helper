import { User } from "@clerk/nextjs/server";
import { KnownBlock } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversations, faqs, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { updateConversation } from "@/lib/data/conversation";
import { bodyWithSignature, createReply, getLastAiGeneratedDraft } from "@/lib/data/conversationMessage";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { addNote } from "@/lib/data/note";
import { getOrganizationMembers } from "@/lib/data/organization";
import { findUserViaSlack, getClerkUser } from "@/lib/data/user";
import { openSlackModal, postSlackMessage, updateSlackMessage } from "@/lib/slack/client";

export const OPEN_ATTACHMENT_COLOR = "#EF4444";
export const RESOLVED_ATTACHMENT_COLOR = "#22C55E";

export const getActionButtons = (): KnownBlock => ({
  type: "actions",
  block_id: "conversation_actions",
  elements: [
    {
      type: "button",
      text: { type: "plain_text", text: "Respond" },
      action_id: "respond_in_slack",
    },
    {
      type: "button",
      text: { type: "plain_text", text: "Assign" },
      action_id: "assign",
    },
    {
      type: "button",
      text: { type: "plain_text", text: "Close" },
      action_id: "close",
    },
  ],
});

export const getSuggestedEditButtons = (faqId: number): KnownBlock => ({
  type: "actions",
  block_id: `suggested_edit_actions_${faqId}`,
  elements: [
    {
      type: "button",
      text: { type: "plain_text", text: "Approve" },
      action_id: "approve_suggested_edit",
      value: faqId.toString(),
      style: "primary",
    },
    {
      type: "button",
      text: { type: "plain_text", text: "Reject" },
      action_id: "reject_suggested_edit",
      value: faqId.toString(),
      style: "danger",
    },
    {
      type: "button",
      text: { type: "plain_text", text: "Tweak & Approve" },
      action_id: "tweak_suggested_edit",
      value: faqId.toString(),
    },
  ],
});

type SlackMessage = {
  conversationId: number;
  slackChannel: string | null;
  slackMessageTs: string | null;
};

export const handleMessageSlackAction = async (message: SlackMessage, payload: any) => {
  if (!message.slackMessageTs || !message.slackChannel) return;

  const conversation = assertDefined(
    await db.query.conversations.findFirst({
      where: eq(conversations.id, message.conversationId),
      with: { mailbox: true },
    }),
  );

  if (!conversation.mailbox.slackBotToken) {
    // The user has unlinked the Slack app so we can't do anything
    return;
  }

  if (payload.actions) {
    const action = payload.actions[0].action_id;
    const user = await findUserViaSlack(
      conversation.mailbox.clerkOrganizationId,
      conversation.mailbox.slackBotToken,
      payload.user.id,
    );

    if (!user) {
      await postSlackMessage(conversation.mailbox.slackBotToken, {
        ephemeralUserId: payload.user.id,
        channel: message.slackChannel,
        text: "_Helper user not found, please make sure your Slack email matches your Helper email._",
      });
      return;
    }

    if (action === "assign") {
      await openAssignModal(message, conversation, payload.trigger_id);
    } else if (action === "respond_in_slack") {
      await openRespondModal(message, conversation, user, payload.trigger_id);
    } else if (action === "close") {
      await db.transaction(async (tx) => {
        await updateConversation(
          conversation.id,
          { set: { status: "closed" }, byUserId: user?.id ?? null, message: "Resolved via Slack" },
          tx,
        );
      });
    }
  } else if (payload.type === "view_submission") {
    const user = await findUserViaSlack(
      conversation.mailbox.clerkOrganizationId,
      conversation.mailbox.slackBotToken,
      payload.user.id,
    );

    if (payload.view.callback_id === "assign_conversation") {
      const selectedUserId = payload.view.state.values.assign_to.user.selected_option.value;
      const note = payload.view.state.values.note.message.value;

      const selectedUser = await getClerkUser(selectedUserId);
      if (!selectedUser) throw new Error(`User not found: ${selectedUserId}`);

      await db.transaction(async (tx) => {
        await updateConversation(
          conversation.id,
          {
            set: { assignedToClerkId: selectedUserId },
            message: note || null,
            byUserId: user?.id ?? null,
          },
          tx,
        );
      });
    } else {
      const reply = payload.view.state.values.reply.message.value;
      const sendingMethod = payload.view.state.values.escalation_actions.sending_method.selected_option.value;

      if (!reply) {
        return;
      }

      if (sendingMethod === "email" || sendingMethod === "email_and_close") {
        await createReply({
          conversationId: message.conversationId,
          message: reply,
          user,
          close: sendingMethod === "email_and_close",
          slack: { channel: message.slackChannel, messageTs: message.slackMessageTs },
        });
      } else if (sendingMethod === "note") {
        await addNote({
          conversationId: message.conversationId,
          message: reply,
          user,
          slackChannel: message.slackChannel,
          slackMessageTs: message.slackMessageTs,
        });
      } else {
        throw new Error(`Invalid action: ${JSON.stringify(payload)}`);
      }
    }
  }
};

export const handleKnowledgeBankSlackAction = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  payload: any,
) => {
  if (!knowledge.slackMessageTs || !knowledge.slackChannel) return;

  if (!mailbox.slackBotToken) {
    // The user has unlinked the Slack app so we can't do anything
    return;
  }

  if (payload.actions) {
    const action = payload.actions[0].action_id;
    const user = await findUserViaSlack(mailbox.clerkOrganizationId, mailbox.slackBotToken, payload.user.id);

    if (!user) {
      await postSlackMessage(mailbox.slackBotToken, {
        ephemeralUserId: payload.user.id,
        channel: knowledge.slackChannel,
        text: "_Helper user not found, please make sure your Slack email matches your Helper email._",
      });
      return;
    }

    if (action === "approve_suggested_edit") {
      await approveSuggestedEdit(knowledge, mailbox, user);
    } else if (action === "reject_suggested_edit") {
      await rejectSuggestedEdit(knowledge, mailbox, user);
    } else if (action === "tweak_suggested_edit") {
      await openTweakSuggestedEditModal(knowledge, mailbox, payload.trigger_id);
    }
  } else if (payload.type === "view_submission") {
    const user = await findUserViaSlack(mailbox.clerkOrganizationId, mailbox.slackBotToken, payload.user.id);
    if (payload.view.callback_id === "tweak_suggested_edit") {
      const content = payload.view.state.values.content.content.value;
      await approveSuggestedEdit(knowledge, mailbox, user, content);
    }
  }
};

const openAssignModal = async (
  message: SlackMessage,
  conversation: typeof conversations.$inferSelect & {
    mailbox: {
      clerkOrganizationId: string;
      slackBotToken: string | null;
    };
  },
  triggerId: string,
) => {
  await openSlackModal({
    token: assertDefined(conversation.mailbox.slackBotToken),
    triggerId,
    title: "Assign Conversation",
    view: {
      type: "modal",
      callback_id: "assign_conversation",
      private_metadata: assertDefined(message.slackMessageTs),
      blocks: [
        {
          type: "input",
          block_id: "assign_to",
          label: { type: "plain_text", text: "Assign to" },
          element: {
            type: "static_select",
            action_id: "user",
            placeholder: { type: "plain_text", text: "Select a user" },
            options: (await getOrganizationMembers(conversation.mailbox.clerkOrganizationId)).data.flatMap((member) =>
              member.publicUserData
                ? [
                    {
                      text: {
                        type: "plain_text",
                        text: `${member.publicUserData.firstName || member.publicUserData.identifier} ${
                          member.publicUserData.lastName || ""
                        }`,
                      },
                      value: member.publicUserData?.userId || "",
                    },
                  ]
                : [],
            ),
          },
        },
        {
          type: "input",
          block_id: "note",
          label: { type: "plain_text", text: "Message" },
          element: { type: "plain_text_input", multiline: true, action_id: "message" },
          optional: true,
        },
      ],
      submit: {
        type: "plain_text",
        text: "Assign",
      },
    },
  });
};

const openRespondModal = async (
  message: SlackMessage,
  conversation: typeof conversations.$inferSelect & { mailbox: { slackBotToken: string | null } },
  user: User,
  triggerId: string,
) => {
  const draft = await getLastAiGeneratedDraft(message.conversationId);
  const draftBody = bodyWithSignature(draft?.body, user);
  await openSlackModal({
    token: assertDefined(conversation.mailbox.slackBotToken),
    triggerId,
    title: "Reply",
    view: {
      callback_id: "conversation",
      private_metadata: assertDefined(message.slackMessageTs),
      blocks: [
        {
          type: "input",
          block_id: "reply",
          label: { type: "plain_text", text: "Reply" },
          element: {
            type: "plain_text_input",
            initial_value: draftBody,
            multiline: true,
            focus_on_load: true,
            action_id: "message",
          },
        },
        {
          type: "actions",
          block_id: "escalation_actions",
          elements: [
            {
              type: "radio_buttons",
              action_id: "sending_method",
              options: [
                { text: { type: "plain_text", text: "Reply and keep conversation open" }, value: "email" },
                { text: { type: "plain_text", text: "Reply and close" }, value: "email_and_close" },
                { text: { type: "plain_text", text: "Add as note" }, value: "note" },
              ],
            },
          ],
        },
      ],
    },
  });
};

const approveSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  user: User | null,
  content?: string,
) => {
  await db.transaction(async (tx) => {
    await tx
      .update(faqs)
      .set({ enabled: true, suggested: false, content: content || undefined })
      .where(eq(faqs.id, knowledge.id));
    await resetMailboxPromptUpdatedAt(tx, mailbox.id);
    inngest.send({
      name: "faqs/embedding.create",
      data: { faqId: knowledge.id },
    });
  });

  const blocks = suggestedEditAttachments(
    knowledge,
    mailbox.slug,
    content ? "tweaked" : "approved",
    user?.fullName ?? null,
  );
  await updateSlackMessage({
    token: assertDefined(mailbox.slackBotToken),
    channel: assertDefined(knowledge.slackChannel),
    ts: assertDefined(knowledge.slackMessageTs),
    blocks,
  });
};

const rejectSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  user: User | null,
) => {
  await db.transaction(async (tx) => {
    await tx.delete(faqs).where(eq(faqs.id, knowledge.id));
    await resetMailboxPromptUpdatedAt(tx, mailbox.id);
  });

  const blocks = suggestedEditAttachments(knowledge, mailbox.slug, "rejected", user?.fullName ?? null);
  await updateSlackMessage({
    token: assertDefined(mailbox.slackBotToken),
    channel: assertDefined(knowledge.slackChannel),
    ts: assertDefined(knowledge.slackMessageTs),
    blocks,
  });
};

const openTweakSuggestedEditModal = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  triggerId: string,
) => {
  await openSlackModal({
    token: assertDefined(mailbox.slackBotToken),
    triggerId,
    title: "Tweak Suggested Edit",
    view: {
      type: "modal",
      callback_id: "tweak_suggested_edit",
      private_metadata: assertDefined(knowledge.slackMessageTs),
      blocks: [
        {
          type: "input",
          block_id: "content",
          label: { type: "plain_text", text: "Edit Content" },
          element: {
            type: "plain_text_input",
            initial_value: knowledge.content,
            multiline: true,
            focus_on_load: true,
            action_id: "content",
          },
        },
      ],
      submit: {
        type: "plain_text",
        text: "Approve",
      },
    },
  });
};

const suggestedEditAttachments = (
  faq: typeof faqs.$inferSelect,
  mailboxSlug: string,
  action: "approved" | "rejected" | "tweaked",
  userName: string | null,
): KnownBlock[] => {
  const actionText = action === "approved" ? "approved" : action === "rejected" ? "rejected" : "tweaked and approved";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Suggested Content:*\n${faq.content}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${getBaseUrl()}/mailboxes/${mailboxSlug}/settings?tab=knowledge|View in Helper>`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `_Suggested edit ${actionText}${userName ? ` by ${userName}` : ""}_`,
        },
      ],
    },
  ];
};
