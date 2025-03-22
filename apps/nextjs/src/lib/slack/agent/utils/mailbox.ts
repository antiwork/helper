import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { IntentParameters, MailboxCheckResult } from "../types";

export const generateMailboxButtonValue = (
  action: string,
  mailboxId: number,
  criteria: string,
  message?: string,
): string => {
  if (message) {
    return `${action}|${mailboxId}|${criteria}|${message}`;
  }
  return `${action}|${mailboxId}|${criteria}`;
};

// Helper function to check if a mailbox parameter is required
export const checkMailboxRequirement = async (
  parameters: IntentParameters,
  action: string,
  criteria?: string,
): Promise<MailboxCheckResult> => {
  const mailboxes = await db.query.mailboxes.findMany();
  console.log(`[SLACK_AGENT] Found ${mailboxes.length} mailboxes`);

  if (mailboxes.length <= 1) {
    return {
      requiresMailbox: false,
      mailboxes,
      mailboxNames:
        mailboxes.length === 1 && mailboxes[0]?.name
          ? mailboxes[0].name
          : mailboxes.length === 1
            ? `Mailbox #${mailboxes[0]?.id || "unknown"}`
            : "",
      specifiedMailbox: mailboxes.length === 1 ? mailboxes[0] : null,
      text: "",
    };
  }

  let mailboxId: number | null = null;

  if (criteria && typeof criteria === "string") {
    const match = /in mailbox (\d+)/i.exec(criteria);
    if (match?.[1]) {
      mailboxId = parseInt(match[1], 10);
    }
  }

  if (mailboxId === null && parameters.mailbox) {
    const mailboxParam = String(parameters.mailbox);
    const match1 = /^(\d+)$/.exec(mailboxParam);
    const match2 = /mailbox (\d+)/i.exec(mailboxParam);

    if (match1?.[1]) {
      mailboxId = parseInt(match1[1], 10);
    } else if (match2?.[1]) {
      mailboxId = parseInt(match2[1], 10);
    }
  }

  if (mailboxId !== null) {
    console.log(`[SLACK_AGENT] Found mailbox ID in message: ${mailboxId}`);

    const matchingMailbox = mailboxes.find((mb) => mb.id === mailboxId);
    if (matchingMailbox) {
      console.log(`[SLACK_AGENT] Found matching mailbox with ID: ${mailboxId}`);
      return {
        requiresMailbox: false,
        mailboxes,
        mailboxNames: mailboxes.map((mb) => mb.name || `Mailbox #${mb.id}`).join(", "),
        specifiedMailbox: matchingMailbox,
        text: "",
      };
    }
  }

  const { mailbox } = parameters;
  if (mailbox) {
    console.log(`[SLACK_AGENT] Looking up specified mailbox: "${mailbox}"`);

    const matchingMailboxes = await db.query.mailboxes.findMany({
      where: sql`LOWER(name) LIKE LOWER(${`%${mailbox}%`})`,
    });

    if (matchingMailboxes.length > 0) {
      console.log(`[SLACK_AGENT] Found ${matchingMailboxes.length} matching mailboxes for "${mailbox}"`);
      return {
        requiresMailbox: false,
        mailboxes,
        mailboxNames: mailboxes.map((mb) => mb.name || `Mailbox #${mb.id}`).join(", "),
        specifiedMailbox: matchingMailboxes[0],
        text: "",
      };
    }
  }

  // Multiple mailboxes exist and no valid mailbox was specified
  const mailboxNames = mailboxes.map((mb) => mb.name || `Mailbox #${mb.id}`).join(", ");

  const actionText = getActionText(action, criteria);
  const text = `Please select which mailbox to ${actionText}:`;

  const message = action === "reply_to_tickets" && parameters.message ? String(parameters.message).trim() : undefined;

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    },
    {
      type: "actions",
      elements: mailboxes.map((mb) => ({
        type: "button",
        text: {
          type: "plain_text",
          text: mb.name || `Mailbox #${mb.id}`,
        },
        value: generateMailboxButtonValue(action, mb.id, criteria || "", message),
        action_id: `select_mailbox_${mb.id}`,
      })),
    },
  ];

  return {
    requiresMailbox: true,
    mailboxes,
    mailboxNames,
    specifiedMailbox: null,
    text,
    blocks,
  };
};

// Helper function to get appropriate action text based on the action
export const getActionText = (action: string, criteria?: string): string => {
  switch (action) {
    case "search_tickets":
      return `search tickets${criteria ? ` for "${criteria}"` : ""}`;
    case "close_tickets":
      return `close tickets${criteria ? ` ${criteria}` : ""}`;
    case "reply_to_tickets":
      return `reply to tickets${criteria ? ` about "${criteria}"` : ""}`;
    default:
      return "perform this action";
  }
};
