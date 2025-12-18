import { KnownBlock } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversations, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getFullName } from "@/lib/auth/authUtils";
import { updateConversation } from "@/lib/data/conversation";
import { createReply, getLastAiGeneratedDraft } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";
import { addNote } from "@/lib/data/note";
import { findUserViaSlack } from "@/lib/data/user";
import { openSlackModal, postSlackMessage } from "@/lib/slack/client";

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
    }),
  );

  const mailbox = await getMailbox();
  if (!mailbox?.slackBotToken) {
    // The user has unlinked the Slack app so we can't do anything
    return;
  }

  if (payload.actions) {
    const action = payload.actions[0].action_id;
    const user = await findUserViaSlack(mailbox.slackBotToken, payload.user.id);

    if (!user) {
      await postSlackMessage(mailbox.slackBotToken, {
        ephemeralUserId: payload.user.id,
        channel: message.slackChannel,
        text: "_Helper user not found, please make sure your Slack email matches your Helper email._",
      });
      return;
    }

    if (action === "assign") {
      await openAssignModal(message, payload.trigger_id);
    } else if (action === "respond_in_slack") {
      await openRespondModal(message, payload.trigger_id);
    } else if (action === "close") {
      await db.transaction(async (tx) => {
        await updateConversation(
          conversation.id,
          { set: { status: "closed" }, byUserId: user.id, message: "Resolved via Slack" },
          tx,
        );
      });
    }
  } else if (payload.type === "view_submission") {
    const user = await findUserViaSlack(mailbox.slackBotToken, payload.user.id);
    const shouldAutoAssign = user?.preferences?.autoAssignOnReply && !conversation?.assignedToId;

    if (payload.view.callback_id === "assign_conversation") {
      const selectedUserId = payload.view.state.values.assign_to.user.selected_option.value;
      const note = payload.view.state.values.note.message.value;

      const selectedUser = await db.query.authUsers.findFirst({ where: eq(authUsers.id, selectedUserId) });
      if (!selectedUser) throw new Error(`User not found: ${selectedUserId}`);

      await db.transaction(async (tx) => {
        await updateConversation(
          conversation.id,
          {
            set: { assignedToId: selectedUserId, assignedToAI: false },
            message: note || "Assigned via Slack",
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
          shouldAutoAssign,
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

const openAssignModal = async (message: SlackMessage, triggerId: string) => {
  const mailbox = await getMailbox();
  if (!mailbox?.slackBotToken) {
    throw new Error("Mailbox not linked to Slack");
  }

  await openSlackModal({
    token: assertDefined(mailbox.slackBotToken),
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
            options: (
              await db
                .select({
                  id: userProfiles.id,
                  displayName: userProfiles.displayName,
                  email: authUsers.email,
                })
                .from(userProfiles)
                .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
                .limit(100)
            ).map((member) => ({
              text: {
                type: "plain_text",
                text: getFullName(member),
              },
              value: member.id,
            })),
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

const openRespondModal = async (message: SlackMessage, triggerId: string) => {
  const mailbox = await getMailbox();
  if (!mailbox?.slackBotToken) {
    throw new Error("Mailbox not linked to Slack");
  }

  const draft = await getLastAiGeneratedDraft(message.conversationId);
  await openSlackModal({
    token: assertDefined(mailbox.slackBotToken),
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
            initial_value: draft?.body ?? "",
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
