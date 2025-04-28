import { and, asc, eq, isNull, ne, or } from "drizzle-orm";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { getTextWithConversationSubject } from "@/lib/data/conversationMessage";
import { getMailboxById } from "@/lib/data/mailbox";
import { fetchPromptRetrievalData, getPastConversationsPrompt } from "@/lib/data/retrieval";
import type { PromptInfo } from "@/types/conversationMessages";
import { cleanUpTextForAI, generateCompletion, GPT_4_1_MODEL } from "./core";
import { buildMessagesFromHistory } from "./messageBuilder";
import { buildTools } from "./tools";

const SYSTEM_PROMPT_PREFIX = `
You are tasked with replying to an email in a professional manner. You will be given the content of the email you're responding to and the name of the recipient. Your goal is to craft a courteous, clear, and appropriate response.
Please write your entire email response, including the greeting and sign-off. Not include any explanations or meta-commentary. Your response should read as a complete, ready-to-send email.
`;

const GLOBAL_RULES_SUFFIX = `

<GlobalRulesThatMustBeFollowed>
Do not:
- Do not create extra newlines before signatures, or include signatures at all such as 'Best regards, Helper Support', 'Best, <some name>, 'Sincerely, <some name>'. Those signatures will be added later based on who sends the reply.
- Apologize for things that are not your fault or responsibility.
- Make promises or commitments that you cannot fulfill.
- Include personal opinions or speculations.
- Use overly casual language or slang.
- Do not answer as giving instructions or advice for someone that will be replying to the email. Respond as if you are the person that will be replying to the email.
</GlobalRulesThatMustBeFollowed>
`;

export const buildPromptWithMessages = async (conversationId: number) => {
  const pastMessages = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, conversationId),
      or(
        isNull(conversationMessages.status),
        and(ne(conversationMessages.status, "draft"), ne(conversationMessages.status, "discarded")),
      ),
    ),
    orderBy: asc(conversationMessages.createdAt),
  });

  const filteredMessages = pastMessages.filter(
    (message): message is typeof conversationMessages.$inferSelect & { cleanedUpText: string } =>
      !!message.cleanedUpText && message.cleanedUpText.trim().length > 0,
  );

  const messages = buildMessagesFromHistory(filteredMessages);
  const formattedMessages = messages
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    .map((m) => `<message><role>${m.role}</role><content>${m.content}</content></message>`)
    .join("\n");
  return `This is the conversation history: <messages>${cleanUpTextForAI(formattedMessages)}</messages>`;
};

const convertMarkdownToHtml = async (markdown: string): Promise<string> => {
  const result = await remark().use(remarkHtml, { sanitize: false }).process(markdown);
  return result.toString();
};

export const generateDraftResponse = async (
  mailboxId: number,
  lastUserEmail: typeof conversationMessages.$inferSelect & {
    conversation: { subject: string | null };
  },
  metadata: object | null,
  options: { enableMailboxTools?: boolean } = { enableMailboxTools: false },
): Promise<{ draftResponse: string; promptInfo: PromptInfo }> => {
  const mailbox = await getMailboxById(mailboxId);
  const conversationId = lastUserEmail.conversationId;

  if (!mailbox) {
    throw new Error("Mailbox not found");
  }

  const userPrompt = await getTextWithConversationSubject(lastUserEmail.conversation, lastUserEmail);
  const {
    knowledgeBank,
    websitePagesPrompt,
    metadata: metadataPrompt,
  } = await fetchPromptRetrievalData(mailbox, userPrompt, metadata);
  const relevantPastConversations = await getPastConversationsPrompt(userPrompt, mailbox);

  const systemPrompt = [
    SYSTEM_PROMPT_PREFIX,
    knowledgeBank ? [knowledgeBank] : [],
    websitePagesPrompt ? [websitePagesPrompt] : [],
    relevantPastConversations ? [relevantPastConversations] : [],
    metadataPrompt ? [metadataPrompt] : [],
    GLOBAL_RULES_SUFFIX,
  ]
    .flat()
    .join("\n");

  const result = await generateCompletion({
    model: GPT_4_1_MODEL,
    system: systemPrompt,
    prompt: await buildPromptWithMessages(conversationId),
    maxSteps: 5,
    tools: await buildTools(
      conversationId,
      lastUserEmail.emailFrom ?? "",
      mailbox,
      false,
      false,
      options.enableMailboxTools,
    ),
    functionId: "generate-draft-response",
    metadata: {
      sessionId: conversationId,
      email: lastUserEmail.emailFrom ?? "",
      mailboxSlug: mailbox.slug,
    },
    shortenPromptBy: {
      removeSystem: [relevantPastConversations, knowledgeBank, metadataPrompt],
      truncateMessages: true,
    },
  });

  const htmlResponse = await convertMarkdownToHtml(result.text);

  return {
    draftResponse: htmlResponse,
    promptInfo: {
      past_conversations: relevantPastConversations,
      pinned_replies: knowledgeBank,
      metadata: metadataPrompt,
    },
  };
};
