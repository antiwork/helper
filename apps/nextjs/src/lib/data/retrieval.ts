import { and, cosineDistance, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { conversations } from "@/db/schema/conversations";
import { conversationsTopics } from "@/db/schema/conversationsTopics";
import { websitePages, websites } from "@/db/schema/websites";
import { generateEmbedding } from "@/lib/ai";
import { knowledgeBankPrompt, PAST_CONVERSATIONS_PROMPT, websitePagesPrompt } from "@/lib/ai/prompts";
import { Mailbox } from "@/lib/data/mailbox";
import { cleanUpTextForAI } from "../ai/core";
import { getMetadata, MetadataAPIError, timestamp } from "../metadataApiClient";
import { captureExceptionAndThrowIfDevelopment } from "../shared/sentry";
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
  onlyWithTopics = false,
) => {
  const queryEmbedding = Array.isArray(queryInput)
    ? queryInput
    : await generateEmbedding(queryInput, "query-find-past-conversations");
  const similarity = sql<number>`1 - (${cosineDistance(conversations.embedding, queryEmbedding)})`;

  let where = sql`${gt(similarity, similarityThreshold)} AND ${conversations.mailboxId} = ${mailbox.id}`;
  if (excludeConversationSlug) {
    where = sql`${where} AND ${conversations.slug} != ${excludeConversationSlug}`;
  }
  if (onlyWithTopics) {
    where = sql`${where} AND EXISTS (
      SELECT 1 FROM ${conversationsTopics} ct
      WHERE ct.conversation_id = ${conversations.id}
    )`;
  }

  const similarConversations = await db.query.conversations.findMany({
    where,
    with: {
      messages: {
        columns: {
          id: true,
          body: true,
          cleanedUpText: true,
          role: true,
          createdAt: true,
        },
        orderBy: (messages, { asc }) => [asc(messages.id)],
      },
    },
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

  const pastConversations = similarConversations
    .map((conversation) => {
      return `--- Conversation Start ---\nDate: ${conversation.createdAt.toLocaleDateString()}\n${conversation.messages
        .map((message) => {
          const role = message.role === "user" ? "Customer" : "Agent";
          return `${role}:\n${cleanUpTextForAI(message.cleanedUpText || message.body)}`;
        })
        .join("\n")}\n--- Conversation End ---`;
    })
    .join("\n\n");

  let conversationPrompt = PAST_CONVERSATIONS_PROMPT.replace("{{PAST_CONVERSATIONS}}", pastConversations);
  conversationPrompt = conversationPrompt.replace("{{USER_QUERY}}", query);

  return conversationPrompt;
};

export const findSimilarInKnowledgeBank = async (query: string, mailbox: Mailbox) => {
  const queryEmbedding = await generateEmbedding(query, "embedding-query-similar-faqs");
  const similarity = sql<number>`1 - (${cosineDistance(faqs.embedding, queryEmbedding)})`;
  const similarFAQs = await db.query.faqs.findMany({
    where: and(
      sql`${gt(similarity, SIMILARITY_THRESHOLD)} AND ${faqs.mailboxId} = ${mailbox.id}`,
      eq(faqs.enabled, true),
    ),
    columns: {
      content: true,
    },
    extras: {
      similarity: similarity.as("similarity"),
    },
    orderBy: (_faq, { desc }) => [desc(similarity)],
    limit: MAX_SIMILAR_KNOWLEDGE_ITEMS,
  });

  return similarFAQs;
};

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
  websitePages: string | null;
};

export const fetchPromptRetrievalData = async (
  mailbox: Mailbox,
  query: string,
  metadata: object | null,
): Promise<PromptRetrievalData> => {
  const knowledgeBank = await findSimilarInKnowledgeBank(query, mailbox);
  const websitePages = await findSimilarWebsitePages(query, mailbox);

  const metadataText = metadata ? `User metadata:\n${JSON.stringify(metadata, null, 2)}` : null;

  return {
    knowledgeBank: knowledgeBankPrompt(knowledgeBank),
    metadata: metadataText,
    websitePages: websitePages.length > 0 ? websitePagesPrompt(websitePages) : null,
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
    if (error instanceof MetadataAPIError) {
      return null;
    }
    captureExceptionAndThrowIfDevelopment(error);
    throw new Error(`Metadata API request failed: unknown error`);
  }
};
