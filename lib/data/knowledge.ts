import { KnownBlock } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { faqs, mailboxes } from "@/db/schema";
import { DbOrAuthUser } from "@/db/supabaseSchema/auth";
import { inngest } from "@/inngest/client";
import { getFullName } from "@/lib/auth/authUtils";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { findUserViaSlack } from "@/lib/data/user";
import { openSlackModal, postSlackMessage, updateSlackMessage } from "@/lib/slack/client";

export const approveSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  user: DbOrAuthUser | null,
  content?: string,
) => {
  await db.transaction(async (tx) => {
    await tx
      .update(faqs)
      .set({ enabled: true, suggested: false, content: content ?? knowledge.content })
      .where(eq(faqs.id, knowledge.id));
    if (knowledge.suggestedReplacementForId) {
      await tx.delete(faqs).where(eq(faqs.id, knowledge.suggestedReplacementForId));
    }

    await resetMailboxPromptUpdatedAt(tx, knowledge.mailboxId);

    inngest.send({
      name: "faqs/embedding.create",
      data: { faqId: knowledge.id },
    });
  });

  if (knowledge.slackChannel && knowledge.slackMessageTs && mailbox.slackBotToken) {
    const blocks = suggestionResolvedBlocks(knowledge, mailbox.slug, "approved", user ? getFullName(user) : null);

    await updateSlackMessage({
      token: mailbox.slackBotToken,
      channel: knowledge.slackChannel,
      ts: knowledge.slackMessageTs,
      blocks,
    });
  }
};

export const rejectSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  user: DbOrAuthUser | null,
) => {
  await db.transaction(async (tx) => {
    await tx.delete(faqs).where(eq(faqs.id, knowledge.id));
    await resetMailboxPromptUpdatedAt(tx, knowledge.mailboxId);
  });

  if (knowledge.slackChannel && knowledge.slackMessageTs && mailbox.slackBotToken) {
    const blocks = suggestionResolvedBlocks(knowledge, mailbox.slug, "rejected", user ? getFullName(user) : null);

    await updateSlackMessage({
      token: mailbox.slackBotToken,
      channel: knowledge.slackChannel,
      ts: knowledge.slackMessageTs,
      blocks,
    });
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
    const user = await findUserViaSlack(mailbox.slackBotToken, payload.user.id);

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
    const user = await findUserViaSlack(mailbox.slackBotToken, payload.user.id);
    if (payload.view.callback_id === "tweak_suggested_edit") {
      const content = payload.view.state.values.content.content.value;
      await approveSuggestedEdit(knowledge, mailbox, user, content);
    }
  }
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

const suggestionResolvedBlocks = (
  faq: typeof faqs.$inferSelect,
  mailboxSlug: string,
  action: "approved" | "rejected",
  userName: string | null,
): KnownBlock[] => {
  const actionText = action === "approved" ? "✅ Suggested edit approved" : "❌ Suggested edit rejected";

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${actionText}${userName ? ` by ${userName}` : ""}\n\n*Content*:\n${faq.content}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${getBaseUrl()}/mailboxes/${mailboxSlug}/settings?tab=knowledge|View knowledge bank>`,
      },
    },
  ];
};
