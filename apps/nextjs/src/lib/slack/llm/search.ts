import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { createResultsFormattingPrompt, createSearchParametersPrompt } from "./prompts";
import { generateLLMResponse, type LLMProvider } from "./providers";

export interface TicketSearchResult {
  id: number;
  slug: string;
  subject: string;
  from: string | null;
  status: string | null;
  createdAt: Date;
  lastActivity: Date;
}

export interface SearchParameters {
  keywords?: string;
  status?: string[];
  email?: string;
  limit?: number;
  paymentProvider?: string;
}

/**
 * Process the natural language query using LLM to extract structured search parameters
 */
export async function extractSearchParameters(
  query: string,
  provider: LLMProvider = "openai",
): Promise<SearchParameters> {
  const prompt = createSearchParametersPrompt(query);

  try {
    const responseText = await generateLLMResponse(prompt, 0, provider);
    console.log("Raw LLM response:", responseText);

    let cleanedResponse = responseText;

    // Remove markdown code blocks if present (```json...```)
    cleanedResponse = cleanedResponse.replace(/```(?:json|javascript)?\s+/g, "").replace(/\s*```\s*$/g, "");

    // Remove any non-JSON text before or after the JSON object
    const jsonStartIndex = cleanedResponse.indexOf("{");
    const jsonEndIndex = cleanedResponse.lastIndexOf("}") + 1;

    if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
      cleanedResponse = cleanedResponse.substring(jsonStartIndex, jsonEndIndex);
    }

    console.log("Cleaned response for parsing:", cleanedResponse);

    const parsedResponse = JSON.parse(cleanedResponse);
    return parsedResponse;
  } catch (error) {
    console.error("Error extracting search parameters:", error);
    return {
      keywords: query,
      limit: 5,
    };
  }
}

/**
 * Build database query filters based on extracted parameters
 */
export function buildDatabaseQuery(params: SearchParameters): SQL[] {
  const filters: SQL[] = [];

  if (params.status && params.status.length > 0) {
    filters.push(inArray(conversations.status, params.status as ("open" | "closed" | "spam")[]));
  }

  if (params.email) {
    filters.push(eq(conversations.emailFrom, params.email));
  }

  if (params.paymentProvider) {
    // If payment provider is specified, add it to the search
    const paymentProviderKeyword = params.keywords
      ? `${params.keywords} ${params.paymentProvider}`
      : params.paymentProvider;

    params.keywords = paymentProviderKeyword;
  }

  return filters;
}

export async function searchTickets(
  mailboxId: number,
  query: string,
  provider: LLMProvider = "openai",
): Promise<TicketSearchResult[]> {
  const searchParams = await extractSearchParameters(query, provider);

  const filters = buildDatabaseQuery(searchParams);

  let conversationIds: number[] = [];
  if (searchParams.keywords) {
    const keywordResults = await searchEmailsByKeywords(searchParams.keywords, mailboxId);
    conversationIds = keywordResults.map((result) => result.conversationId);

    if (conversationIds.length === 0) {
      return [];
    }
  }

  const conversationsQuery = db.query.conversations.findMany({
    where: and(
      eq(conversations.mailboxId, mailboxId),
      ...(conversationIds.length > 0 ? [inArray(conversations.id, conversationIds)] : []),
      ...filters,
    ),
    orderBy: [desc(conversations.lastUserEmailCreatedAt)],
    limit: searchParams.limit || 5,
    with: {
      messages: {
        limit: 1,
        orderBy: [desc(conversationMessages.createdAt)],
      },
    },
  });

  const results = await conversationsQuery;

  return results.map((conversation) => ({
    id: conversation.id,
    slug: conversation.slug,
    subject: conversation.subject || "No subject",
    from: conversation.emailFrom || "Unknown",
    status: conversation.status || "open",
    createdAt: conversation.createdAt,
    lastActivity: conversation.lastUserEmailCreatedAt || conversation.createdAt,
  }));
}

export async function formatSearchResults(
  results: TicketSearchResult[],
  query: string,
  provider: LLMProvider = "gemini",
): Promise<string> {
  if (results.length === 0) {
    return `I couldn't find any tickets matching your query: "${query}"`;
  }

  const resultsFormatted = results
    .map((ticket) => {
      const date = new Date(ticket.lastActivity).toLocaleDateString();
      return `- ID: ${ticket.id} | ${ticket.status?.toUpperCase() || "OPEN"} | ${ticket.subject} | From: ${ticket.from} | Last activity: ${date}`;
    })
    .join("\n");

  const prompt = createResultsFormattingPrompt(query, resultsFormatted);

  try {
    const responseText = await generateLLMResponse(prompt, 0.7, provider);

    let cleanedResponse = responseText;

    cleanedResponse = cleanedResponse.replace(/```(.*?)\s+/g, "").replace(/\s*```\s*$/g, "");

    return cleanedResponse;
  } catch (error) {
    console.error("Error formatting search results:", error);

    const header = `Here are the tickets matching your query "${query}":\n\n`;
    return header + resultsFormatted;
  }
}
