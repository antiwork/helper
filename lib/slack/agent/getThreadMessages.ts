import type { Block, ImageBlock, RichTextBlockElement, RichTextElement } from "@slack/types";
import { KnownBlock, WebClient } from "@slack/web-api";
import { CoreMessage } from "ai";
import { cache } from "react";

const convertRichTextBlockElementToMarkdown = (element: RichTextBlockElement): string => {
  switch (element.type) {
    case "rich_text_section":
      return element.elements.map(convertRichTextElementToMarkdown).join("");
    case "rich_text_list":
      return `- ${element.elements.map(convertRichTextBlockElementToMarkdown).join("\n- ")}`;
    case "rich_text_preformatted":
      return `\`\`\`\n${element.elements.map(convertRichTextElementToMarkdown).join("")}\n\`\`\``;
    case "rich_text_quote":
      return element.elements
        .map(convertRichTextElementToMarkdown)
        .join("")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
  }
};

const convertRichTextElementToMarkdown = (element: RichTextElement): string => {
  switch (element.type) {
    case "text":
      let text = element.text;
      if (element.style?.strike) text = `~${text}~`;
      if (element.style?.italic) text = `_${text}_`;
      if (element.style?.bold) text = `**${text}**`;
      if (element.style?.code) text = `\`${text}\``;
      return text;
    case "link":
      const linkText = element.text ? element.text.replace(/<|>/g, "") : element.url;
      return `[${linkText}](${element.url})`;
    case "user":
      return `<@${element.user_id}>`;
    case "channel":
      return `<#${element.channel_id}>`;
    case "emoji":
      return `:${element.name}:`;
    case "broadcast":
      return `@${element.range}`;
    case "date":
      return new Date(element.timestamp * 1000).toISOString();
    case "color":
      return element.value;
    case "team":
      return `<@${element.team_id}>`;
    case "usergroup":
      return `<@${element.usergroup_id}>`;
  }
};

const convertKnownBlocksToMarkdown = (blocks: Block[]): string => {
  const markdownParts: string[] = [];
  const knownBlockTypes = [
    "rich_text",
    "section",
    "header",
    "context",
    "divider",
    "image",
    "actions",
    "input",
    "file",
    "video",
  ];

  for (const unknownBlock of blocks) {
    if (!knownBlockTypes.includes(unknownBlock.type)) {
      markdownParts.push(`Unknown block: ${JSON.stringify(unknownBlock)}`);
      continue;
    }

    const block = unknownBlock as KnownBlock;
    let blockMarkdown = "";
    switch (block.type) {
      case "rich_text":
        blockMarkdown = block.elements.map(convertRichTextBlockElementToMarkdown).join("");
        break;
      case "section":
        if (block.text?.type === "mrkdwn") {
          blockMarkdown = block.text.text;
        } else if (block.text?.type === "plain_text") {
          blockMarkdown = block.text.text;
        } else {
          blockMarkdown = block.fields?.map((field) => field.text).join("\n") ?? "";
        }
        break;
      case "header":
        blockMarkdown = `### ${block.text.text}`;
        break;
      case "context":
        blockMarkdown = block.elements
          .map((el) => {
            switch (el.type) {
              case "mrkdwn":
                return el.text;
              case "plain_text":
                return el.text;
              case "image":
                return slackImageToMarkdown(el);
            }
          })
          .join(" ");
        break;
      case "divider":
        blockMarkdown = "---";
        break;
      case "image":
        blockMarkdown = slackImageToMarkdown(block);
        break;
      case "actions":
        blockMarkdown = `Slack actions: ${block.elements.map((el) => el.type).join(", ")}`;
        break;
      case "input":
        blockMarkdown = `Slack input: ${block.label.text}`;
        break;
      case "file":
        blockMarkdown = `Slack file: ${block.external_id}`;
        break;
      case "video":
        blockMarkdown = `Slack video: ${block.alt_text} (${block.video_url})`;
        break;
      default:
        blockMarkdown = `Unknown block: ${JSON.stringify(block)}`;
        break;
    }
    if (blockMarkdown) {
      markdownParts.push(blockMarkdown.trim()); // Trim each part
    }
  }
  return markdownParts.join("\n\n").trim();
};

const slackImageToMarkdown = (image: ImageBlock): string => {
  if ("image_url" in image) {
    return `![${image.alt_text}](${image.image_url})`;
  } else if ("url" in image.slack_file) {
    return `![${image.alt_text}](${image.slack_file.url})`;
  }
  return `Slack image: ${image.alt_text} (ID: ${image.slack_file.id})`;
};

const messageToMarkdown = ({ text, blocks }: { text?: string; blocks?: Block[] }) => {
  let content = "";
  if (blocks && blocks.length > 0) {
    content = convertKnownBlocksToMarkdown(blocks);
  }
  if (!content && text) {
    content = text;
  }
  return content.replace(/\b!debug\b/g, "");
};

export const getThreadMessages = cache(
  async (token: string, channelId: string, threadTs: string, botUserId: string): Promise<CoreMessage[]> => {
    const client = new WebClient(token);
    const { messages } = await client.conversations.replies({
      channel: channelId,
      ts: threadTs,
      limit: 50,
    });

    if (!messages) throw new Error("No messages found in thread");

    const result = messages.flatMap((message) => {
      const isBot = !!message.bot_id;
      let content = messageToMarkdown({ text: message.text, blocks: message.blocks as Block[] });

      if (message.attachments && message.attachments.length > 0) {
        content += `\n\n${message.attachments.map((attachment) => messageToMarkdown({ text: attachment.text, blocks: attachment.blocks as Block[] })).join("\n\n")}`;
      }

      if (!content) return [];

      return [
        {
          role: isBot ? "assistant" : "user",
          content: content.replace(`<@${botUserId}>`, "@Helper"),
        } satisfies CoreMessage,
      ];
    });

    return result;
  },
);
