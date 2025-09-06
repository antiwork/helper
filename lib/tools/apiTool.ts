import { generateText, type Tool as AITool } from "ai";
import { and, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import { mapValues } from "lodash-es";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, conversations, ToolMetadata } from "@/db/schema";
import type { Tool } from "@/db/schema/tools";
import { customerInfoPrompt } from "@/lib/ai/customerInfoPrompt";
import openai from "@/lib/ai/openai";
import { ConversationMessage, createToolEvent } from "@/lib/data/conversationMessage";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { cleanUpTextForAI, isWithinTokenLimit, MINI_MODEL } from "../ai/core";
import type { Conversation } from "../data/conversation";

export class ToolApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ToolApiError";
  }
}

const LIST_AVAILABLE_TOOLS_SYSTEM_PROMPT = `
Based on the user's conversation and the provided metadata, suggest appropriate functions and their parameters, even if the conversation looks like it's already resolved.

- Return all possible functions, even if they are more than 5.
- Return functions in priority order based on whether they look relevant to the message content and whether they were performed on similar conversations.
- If you recommend "close", do not recommend "spam" and vice versa.
`;

export const buildAITools = (tools: Tool[], email: string | null) => {
  const aiTools = tools.reduce<
    Record<string, Omit<AITool, "execute"> & { customerEmailParameter: string | null; available: boolean }>
  >((acc, tool) => {
    if (!email && !tool.availableInAnonymousChat) {
      acc[tool.slug] = {
        description: `${tool.name} - This tool requires you to be logged in. Please log in and try again.`,
        parameters: z.object({}),
        customerEmailParameter: tool.customerEmailParameter,
        available: false,
      };
    } else {
      acc[tool.slug] = {
        description: `${tool.name} - ${tool.description}`,
        parameters: buildParameterSchema(tool, { useEmailParameter: true, email }),
        customerEmailParameter: tool.customerEmailParameter,
        available: true,
      };
    }
    return acc;
  }, {});
  return aiTools;
};

export const callToolApi = async (
  conversation: Conversation,
  tool: Tool,
  params: Record<string, any>,
  userId?: string,
) => {
  validateParameters(tool, params);

  const headers = createHeaders(tool);
  const url = buildUrl(tool, params);
  const requestOptions = buildRequestOptions(tool, params, headers);

  let response;
  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    await createToolEvent({
      conversationId: conversation.id,
      tool,
      error:
        error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : "Unknown error",
      parameters: params,
      userMessage: "The API returned an error",
      userId,
    });
    return {
      success: false,
      message: "The API returned an error",
    };
  }

  if (!response.ok) {
    let responseBody;
    try {
      responseBody = await response.clone().json();
    } catch {
      responseBody = await response.text();
    }
    await createToolEvent({
      conversationId: conversation.id,
      tool,
      error: { status: response.status, statusText: response.statusText, body: responseBody },
      parameters: params,
      userMessage: "The API returned an error",
      userId,
    });
    return {
      success: false,
    };
  }

  const data = await response.json();

  await createToolEvent({
    conversationId: conversation.id,
    tool,
    data,
    parameters: params,
    userMessage: "Tool executed successfully.",
    userId,
  });

  return {
    data,
    success: true,
  };
};

export const generateSuggestedActions = async (conversation: Conversation, mailboxTools: Tool[]) => {
  const messages: ConversationMessage[] = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, conversation.id),
      isNull(conversationMessages.deletedAt),
      or(ne(conversationMessages.status, "failed"), isNull(conversationMessages.status)),
    ),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  let metadataPrompt = "";
  if (conversation.emailFrom) {
    const platformCustomer = await getPlatformCustomer(conversation.emailFrom);
    if (platformCustomer) metadataPrompt = customerInfoPrompt(conversation.emailFrom, platformCustomer);
  }

  const formattedMessages = messages.map(
    (message) => `${message.role}: ${cleanUpTextForAI(message.cleanedUpText ?? message.body ?? "")}`,
  );

  const messagesText = formattedMessages.join("\n");

  let prompt = `Conversation:\n
  Email From: ${conversation.emailFrom}\n
  Subject: ${conversation.subject}\n
  ${metadataPrompt}`;

  const similarPrompt = conversation.embeddingText
    ? await buildSimilarConversationActionsPrompt(conversation.embeddingText)
    : "";

  if (isWithinTokenLimit(prompt + similarPrompt, true)) {
    prompt += `\nMessages: ${messagesText}`;
  } else {
    const relevantMessages = [formattedMessages[0], ...formattedMessages.slice(-3)];
    prompt += `\nMessages: ${relevantMessages.join("\n")}`;
  }

  if (similarPrompt) {
    prompt += `\nActions performed on similar conversations:\n${similarPrompt}`;
  }

  const aiTools = buildAITools(mailboxTools, conversation.emailFrom);

  const { toolCalls } = await generateText({
    model: openai(MINI_MODEL, { structuredOutputs: false }),
    tools: {
      close: {
        description: "Close the conversation",
        parameters: z.object({}),
        execute: async () => {},
      },
      spam: {
        description: "Mark the conversation as spam",
        parameters: z.object({}),
        execute: async () => {},
      },
      assign: {
        description:
          'Assign the conversation to a user. The ID must be one of those indicated by "Assigned to user ID" in the similar conversations section. Do not use this tool if no user IDs of assigned similar conversations exist.',
        parameters: z.object({
          userId: z.string(),
        }),
        execute: async () => {},
      },
      ...mapValues(aiTools, (tool) => ({
        ...tool,
        execute: async () => {},
      })),
    },
    temperature: 0.5,
    maxTokens: 1000,
    system: LIST_AVAILABLE_TOOLS_SYSTEM_PROMPT,
    prompt,
    maxSteps: 1,
    toolChoice: "required",
    experimental_telemetry: {
      isEnabled: true,
      functionId: "list-available-tools",
    },
  });

  return toolCalls.map(({ toolName, args }) => {
    switch (toolName) {
      case "close":
        return { type: "close" };
      case "spam":
        return { type: "spam" };
      case "assign":
        return { type: "assign", userId: args.userId };
      default:
        const parameters = args as Record<string, any>;
        if (aiTools[toolName]?.customerEmailParameter && conversation.emailFrom) {
          parameters[aiTools[toolName].customerEmailParameter] = conversation.emailFrom;
        }
        return { type: "tool", slug: toolName, parameters };
    }
  }) satisfies (typeof conversations.$inferInsert)["suggestedActions"];
};

const createHeaders = (tool: Tool) => {
  const headers = new Headers(tool.headers || {});
  if (tool.authenticationMethod === "bearer_token" && tool.authenticationToken) {
    headers.set("Authorization", `Bearer ${tool.authenticationToken}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
};

const buildUrl = (tool: Tool, params: Record<string, any>) => {
  let url = tool.url;
  const queryParams: Record<string, any> = {};

  tool.parameters?.forEach((param) => {
    const value = params[param.name];
    if (value !== undefined) {
      if (param.in === "query") {
        queryParams[param.name] = value;
      } else if (param.in === "path") {
        url = url.replace(`{${param.name}}`, encodeURIComponent(value.toString()));
      }
    }
  });

  const urlObject = new URL(url);
  Object.entries(queryParams).forEach(([key, value]) => {
    urlObject.searchParams.append(key, value.toString());
  });

  return urlObject.toString();
};

const buildRequestOptions = (tool: Tool, params: Record<string, any>, headers: Headers) => {
  const requestOptions: RequestInit = {
    method: tool.requestMethod,
    headers,
  };

  if (tool.requestMethod !== "GET") {
    const bodyParams =
      tool.parameters
        ?.filter((param) => param.in === "body")
        .reduce(
          (acc, param) => {
            if (params[param.name] !== undefined) {
              acc[param.name] = params[param.name];
            }
            return acc;
          },
          {} as Record<string, any>,
        ) ?? {};

    if (Object.keys(bodyParams).length > 0) {
      requestOptions.body = JSON.stringify(bodyParams);
    }
  }

  return requestOptions;
};

const buildParameterSchema = (
  tool: Tool,
  { useEmailParameter, email }: { useEmailParameter: boolean; email?: string | null },
) => {
  return z.object(
    (tool.parameters || []).reduce<Record<string, z.ZodType>>((acc, param) => {
      if (useEmailParameter && param.name === tool.customerEmailParameter) {
        // If there's an email parameter, it should always be required in anonymous chat even if it's optional in the API.
        // In authenticated chat we'll substitute the value with the user's email later, the description is a hint to get better AI responses.
        acc[param.name] = email
          ? z
              .string()
              .describe(
                `The current customer's email: "${email}". This tool cannot be called with emails of other customers.`,
              )
          : z.string().describe(param.description || param.name);
        return acc;
      }
      const zodType = (z[param.type as keyof typeof z] as any)().describe(param.description || param.name);
      acc[param.name] = param.required ? zodType : zodType.optional();
      return acc;
    }, {}),
  );
};

const validateParameters = (tool: Tool, params: Record<string, any>) => {
  try {
    buildParameterSchema(tool, { useEmailParameter: false }).parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ToolApiError(
        "INVALID_PARAMETER",
        `Parameter validation failed: ${firstError?.path.join(".")} - ${firstError?.message}`,
      );
    }
    throw error;
  }
};

const buildSimilarConversationActionsPrompt = async (embeddingText: string): Promise<string> => {
  const similarConversations = (await findSimilarConversations(embeddingText, 10)) || [];

  if (similarConversations.length === 0) {
    return "";
  }

  const actions = await db.query.conversationEvents.findMany({
    where: and(
      inArray(
        conversationEvents.conversationId,
        similarConversations.map((c) => c.id),
      ),
      eq(conversationEvents.type, "update"),
      isNotNull(conversationEvents.byUserId),
    ),
    orderBy: (events, { asc }) => [asc(events.createdAt)],
    limit: 50,
  });

  const counts: Record<string, number> = {
    "Close the conversation": actions.filter((a) => a.changes.status === "closed").length,
    "Mark as spam": actions.filter((a) => a.changes.status === "spam").length,
  };

  actions.forEach(({ changes: { assignedToId: id } }) => {
    if (!id) return;
    counts[`Assigned to user ID ${id}`] = (counts[`Assigned to user ID ${id}`] ?? 0) + 1;
  });

  const toolsUsed = await db.query.conversationMessages.findMany({
    where: and(
      inArray(
        conversationMessages.conversationId,
        similarConversations.map((c) => c.id),
      ),
      eq(conversationMessages.role, "tool"),
      isNotNull(conversationMessages.userId),
    ),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    limit: 50,
  });

  toolsUsed.forEach((message) => {
    const metadata = message.metadata as ToolMetadata;
    counts[`Ran tool ${metadata.tool.slug}`] = (counts[`Ran tool ${metadata.tool.slug}`] ?? 0) + 1;
  });

  return Object.entries(counts)
    .map(([action, count]) => (count > 0 ? `${action} (${count} times)` : ""))
    .filter(Boolean)
    .join("\n");
};
