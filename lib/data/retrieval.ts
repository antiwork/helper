import { and, cosineDistance, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, faqs } from "@/db/schema";
import { conversations } from "@/db/schema/conversations";
import { websitePages, websites } from "@/db/schema/websites";
import { generateEmbedding } from "@/lib/ai";
import { knowledgeBankPrompt, PAST_CONVERSATIONS_PROMPT, websitePagesPrompt } from "@/lib/ai/prompts";
import { Mailbox } from "@/lib/data/mailbox";
import { cleanUpTextForAI } from "../ai/core";
import { getMetadata, timestamp } from "../metadataApiClient";
import { captureExceptionAndLogIfDevelopment } from "../shared/sentry";
import { getMetadataApiByMailboxSlug } from "./mailboxMetadataApi";

const SIMILARITY_THRESHOLD = 0.4;
const MAX_SIMILAR_CONVERSATIONS = 3;
const MAX_SIMILAR_KNOWLEDGE_ITEMS = 10;
const MAX_SIMILAR_WEBSITE_PAGES = 5;

export const findSimilarConversations = async (
  queryInput: string | number[],
  mailbox: Mailbox,
  limit: number = MAX_SIMILAR_CONVERSATIONS,
  excludeConversationSlug?: string,
  similarityThreshold: number = SIMILARITY_THRESHOLD,
) => {
  const queryEmbedding = Array.isArray(queryInput)
    ? queryInput
    : await generateEmbedding(queryInput, "query-find-past-conversations");
  const similarity = sql<number>`1 - (${cosineDistance(conversations.embedding, queryEmbedding)})`;

  let where = sql`${gt(similarity, similarityThreshold)} AND ${conversations.mailboxId} = ${mailbox.id} AND ${eq(conversations.isPrompt, false)}`;
  if (excludeConversationSlug) {
    where = sql`${where} AND ${conversations.slug} != ${excludeConversationSlug}`;
  }

  const similarConversations = await db.query.conversations.findMany({
    where: and(where, isNull(conversations.mergedIntoId)),
    extras: {
      similarity: similarity.as("similarity"),
    },
    orderBy: (_conversations, { desc }) => [desc(similarity)],
    limit,
  });

  if (similarConversations.length === 0) return null;

  return similarConversations;
};

export const getPastConversationsPrompt = async (query: string, mailbox: Mailbox) => {
  const similarConversations = await findSimilarConversations(query, mailbox);
  if (!similarConversations) return null;

  const pastConversations = await Promise.all(
    similarConversations.map(async (conversation) => {
      const messages = await db.query.conversationMessages.findMany({
        where: eq(conversationMessages.conversationId, conversation.id),
        orderBy: (messages, { asc }) => [asc(messages.id)],
      });

      return `--- Conversation Start ---\nDate: ${conversation.createdAt.toLocaleDateString()}\n${messages
        .map((message) => {
          const role = message.role === "user" ? "Customer" : "Agent";
          return `${role}:\n${cleanUpTextForAI(message.cleanedUpText || message.body)}`;
        })
        .join("\n")}\n--- Conversation End ---`;
    }),
  );

  let conversationPrompt = PAST_CONVERSATIONS_PROMPT.replace("{{PAST_CONVERSATIONS}}", pastConversations.join("\n\n"));
  conversationPrompt = conversationPrompt.replace("{{USER_QUERY}}", query);

  return conversationPrompt;
};

export const findEnabledKnowledgeBankEntries = async (mailbox: Mailbox) =>
  await db.query.faqs.findMany({
    where: and(eq(faqs.mailboxId, mailbox.id), eq(faqs.enabled, true)),
    columns: {
      id: true,
      content: true,
    },
    orderBy: (faqs, { asc }) => [asc(faqs.content)],
  });

export const findSimilarWebsitePages = async (
  query: string,
  mailbox: Mailbox,
  limit: number = MAX_SIMILAR_WEBSITE_PAGES,
  similarityThreshold: number = SIMILARITY_THRESHOLD,
) => {
  const queryEmbedding = await generateEmbedding(query, "embedding-query-similar-pages");
  const similarity = sql<number>`1 - (${cosineDistance(websitePages.embedding, queryEmbedding)})`;

  const similarPages = await db
    .select({
      url: websitePages.url,
      pageTitle: websitePages.pageTitle,
      markdown: websitePages.markdown,
      similarity: similarity.as("similarity"),
    })
    .from(websitePages)
    .innerJoin(
      websites,
      and(eq(websites.id, websitePages.websiteId), isNull(websites.deletedAt), eq(websites.mailboxId, mailbox.id)),
    )
    .where(and(gt(similarity, similarityThreshold), isNull(websitePages.deletedAt)))
    .orderBy(desc(similarity))
    .limit(limit);

  const pagesWithSimilarity = similarPages.map((page) => ({
    url: page.url,
    pageTitle: page.pageTitle,
    markdown: page.markdown,
    similarity: Number(page.similarity),
  }));

  return pagesWithSimilarity;
};

export type PromptRetrievalData = {
  knowledgeBank: string | null;
  metadata: string | null;
  websitePagesPrompt: string | null;
  websitePages: {
    url: string;
    pageTitle: string;
    markdown: string;
    similarity: number;
  }[];
};

export const fetchPromptRetrievalData = async (
  mailbox: Mailbox,
  query: string,
  metadata: object | null,
): Promise<PromptRetrievalData> => {
  const knowledgeBank = await findEnabledKnowledgeBankEntries(mailbox);
  const websitePages = await findSimilarWebsitePages(query, mailbox);

  const metadataText = metadata ? `User metadata:\n${JSON.stringify(metadata, null, 2)}` : null;

  return {
    knowledgeBank: knowledgeBankPrompt(knowledgeBank),
    metadata: metadataText,
    websitePagesPrompt: websitePages.length > 0 ? websitePagesPrompt(websitePages) : null,
    websitePages,
  };
};

export const fetchMetadata = async (email: string, mailboxSlug: string) => {
  const { metadataApi } = await getMetadataApiByMailboxSlug(mailboxSlug);
  if (!metadataApi) return null;

  try {
    const metadata = await getMetadata(metadataApi, {
      email,
      timestamp: timestamp(),
    });
    return metadata;
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
    return null;
  }
};
