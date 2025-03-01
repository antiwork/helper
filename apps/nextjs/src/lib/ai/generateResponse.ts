import { and, asc, eq, isNull, ne, or } from "drizzle-orm";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { db } from "@/db/client";
import { conversationMessages, styleLinters } from "@/db/schema";
import { getTextWithConversationSubject } from "@/lib/data/conversationMessage";
import { getMailboxById, Mailbox } from "@/lib/data/mailbox";
import { fetchPromptRetrievalData, getPastConversationsPrompt } from "@/lib/data/retrieval";
import type { PromptInfo } from "@/types/conversationMessages";
import { getClerkOrganization } from "../data/organization";
import { cleanUpTextForAI, generateCompletion, GPT_4O_MODEL } from "./core";
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

const STYLE_LINTER_SYSTEM_PROMPT = `You are a style linter. You will be given a draft response, and a list of examples of before/after style linting. You will then rewrite the draft response, making it cleaner and more inline with the style of the examples.
Here are before/after examples to base your new draft upon:
{{EXAMPLES}}
`;

const STYLE_LINTER_USER_PROMPT = `
This is the draft response you are style linting:
{{DRAFT_RESPONSE}}

Reply only with a style-linted version, with no additional context.
`;

export const generateAIStyleLinterText = async (
  mailbox: Mailbox,
  response: string,
): Promise<{ response: string; examples: string | null }> => {
  const organization = await getClerkOrganization(mailbox.clerkOrganizationId ?? "");
  if (!organization) {
    throw new Error("Organization not found");
  }

  if (!organization.privateMetadata.isStyleLinterEnabled) {
    return { response, examples: null };
  }

  const linters = await db.query.styleLinters.findMany({
    where: eq(styleLinters.clerkOrganizationId, organization.id),
  });

  if (linters.length === 0) {
    return { response, examples: null };
  }

  const examples = buildStyleLinterExamples(linters);
  const result = await generateCompletion({
    model: GPT_4O_MODEL,
    system: STYLE_LINTER_SYSTEM_PROMPT.replace("{{EXAMPLES}}", examples),
    prompt: STYLE_LINTER_USER_PROMPT.replace("{{DRAFT_RESPONSE}}", response),
    functionId: "style-linter",
  });

  return { response: result.text, examples };
};

const buildStyleLinterExamples = (linters: (typeof styleLinters.$inferSelect)[]) => {
  return linters.map((linter) => `Before: ${linter.before}\nAfter: ${linter.after}`).join("\n\n");
};

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
    websitePages,
    metadata: metadataPrompt,
  } = await fetchPromptRetrievalData(mailbox, userPrompt, metadata);
  const relevantPastConversations = await getPastConversationsPrompt(userPrompt, mailbox);

  const basePrompt = mailbox.responseGeneratorPrompt?.join("\n") || "";
  const systemPrompt = [
    SYSTEM_PROMPT_PREFIX,
    basePrompt,
    knowledgeBank ? [knowledgeBank] : [],
    websitePages ? [websitePages] : [],
    relevantPastConversations ? [relevantPastConversations] : [],
    metadataPrompt ? [metadataPrompt] : [],
    GLOBAL_RULES_SUFFIX,
  ]
    .flat()
    .join("\n");

  const result = await generateCompletion({
    model: GPT_4O_MODEL,
    system: systemPrompt,
    prompt: await buildPromptWithMessages(conversationId),
    maxSteps: 5,
    tools: await buildTools(conversationId, lastUserEmail.emailFrom ?? "", mailbox, false, options.enableMailboxTools),
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

  const resultText = result.text;
  const { response: lintedResponse, examples: styleLinterExamples } = await generateAIStyleLinterText(
    mailbox,
    resultText,
  );

  const htmlResponse = await convertMarkdownToHtml(lintedResponse);

  return {
    draftResponse: htmlResponse,
    promptInfo: {
      past_conversations: relevantPastConversations,
      base_prompt: basePrompt,
      pinned_replies: knowledgeBank,
      metadata: metadataPrompt,
      style_linter_examples: styleLinterExamples,
      unstyled_response: resultText,
    },
  };
};
