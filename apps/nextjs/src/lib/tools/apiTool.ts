import { generateText } from "ai";
import { and, eq, inArray, isNotNull, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, ToolMetadata } from "@/db/schema";
import type { Tool } from "@/db/schema/tools";
import openai from "@/lib/ai/openai";
import { ConversationMessage, createToolEvent } from "@/lib/data/conversationMessage";
import { getMetadataApiByMailbox } from "@/lib/data/mailboxMetadataApi";
import { fetchMetadata, findSimilarConversations } from "@/lib/data/retrieval";
import { cleanUpTextForAI, GPT_4O_MINI_MODEL, isWithinTokenLimit } from "../ai/core";
import type { Conversation } from "../data/conversation";
import type { Mailbox } from "../data/mailbox";

export class ToolApiError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ToolApiError";
  }
}

export type ToolAvailableResult = {
  name: string;
  slug: string;
  description: string;
  parameters: Record<string, any>;
};

const LIST_AVAILABLE_TOOLS_SYSTEM_PROMPT = `
Based on the user's conversation and the provided metadata, suggest appropriate functions and their parameters, even if the conversation looks like it's already resolved.

- Return all possible functions, even if they are more than 5.
- Return functions in priority order based on whether they look relevant to the message content and whether they were performed on similar conversations.
- If you recommend "close", do not recommend "spam" and vice versa.
`;

export const buildAITools = (tools: Tool[]) => {
  const aiTools = tools.reduce<Record<string, any>>((acc, tool) => {
    acc[tool.slug] = {
      description: `${tool.name} - ${tool.description}`,
      parameters: buildParameterSchema(tool),
      execute: () => {},
    };
    return acc;
  }, {});
  return aiTools;
};

export const callToolApi = async (
  conversation: Conversation,
  tool: Tool,
  params: Record<string, any>,
  clerkUserId?: string,
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
      clerkUserId,
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
      clerkUserId,
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
    clerkUserId,
  });

  return {
    data,
    success: true,
  };
};

export const generateAvailableTools = async (conversation: Conversation, mailbox: Mailbox, mailboxTools: Tool[]) => {
  const messages: ConversationMessage[] = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, conversation.id),
      isNull(conversationMessages.deletedAt),
      or(ne(conversationMessages.status, "failed"), isNull(conversationMessages.status)),
    ),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  let metadataPrompt = "";
  const metadataApi = await getMetadataApiByMailbox(mailbox);
  if (conversation.emailFrom && metadataApi) {
    const metadata = await fetchMetadata(conversation.emailFrom, mailbox.slug);
    metadataPrompt = metadata ? `Metadata: ${JSON.stringify(metadata, null, 2)}` : "";
  }

  const formattedMessages = messages.map(
    (message) => `${message.role}: ${cleanUpTextForAI(message.cleanedUpText ?? message.body ?? "")}`,
  );

  const messagesText = formattedMessages.join("\n");

  let prompt = `Conversation:\n
  Email From: ${conversation.emailFrom}\n
  Subject: ${conversation.subject}\n
  ${metadataPrompt}`;

  let similarPrompt = "";
  const similarConversations =
    (conversation.embeddingText && (await findSimilarConversations(conversation.embeddingText, mailbox, 3))) || [];
  if (similarConversations.length > 0) {
    const actions = await db.query.conversationEvents.findMany({
      where: and(
        inArray(
          conversationEvents.conversationId,
          similarConversations.map((c) => c.id),
        ),
        eq(conversationEvents.type, "update"),
        isNotNull(conversationEvents.byClerkUserId),
      ),
      orderBy: (events, { asc }) => [asc(events.createdAt)],
      limit: 50,
    });
    const counts: Record<string, number> = {
      "Close the conversation": actions.filter((a) => a.changes.status === "closed").length,
      "Mark as spam": actions.filter((a) => a.changes.status === "spam").length,
    };
    actions.forEach(({ changes: { assignedToClerkId: id } }) => {
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
        isNotNull(conversationMessages.clerkUserId),
      ),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      limit: 50,
    });

    toolsUsed.forEach((message) => {
      const metadata = message.metadata as ToolMetadata;
      counts[`Ran tool ${metadata.tool.slug}`] = (counts[`Ran tool ${metadata.tool.slug}`] ?? 0) + 1;
    });

    similarPrompt = Object.entries(counts)
      .map(([action, count]) => (count > 0 ? `${action} (${count})` : ""))
      .filter(Boolean)
      .join("\n");
  }

  if (isWithinTokenLimit(prompt + similarPrompt, true)) {
    prompt += `\nMessages: ${messagesText}`;
  } else {
    const relevantMessages = [formattedMessages[0], ...formattedMessages.slice(-3)];
    prompt += `\nMessages: ${relevantMessages.join("\n")}`;
  }

  prompt += `\nActions performed on similar conversations:\n${similarPrompt}`;

  const { toolCalls } = await generateText({
    model: openai(GPT_4O_MINI_MODEL),
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
          "Assign the conversation to a user. The ID must start with 'user_'. Do not use this tool if no user IDs of assigned similar conversations exist.",
        parameters: z.object({
          userId: z.string(),
        }),
        execute: async () => {},
      },
      ...buildAITools(mailboxTools),
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

  return toolCalls.map((toolCall) => {
    switch (toolCall.toolName) {
      case "close":
        return { type: "close" as const };
      case "spam":
        return { type: "spam" as const };
      case "assign":
        return { type: "assign" as const, clerkUserId: toolCall.args.userId };
      default:
        const { toolName, args } = toolCall as any;
        const tool = mailboxTools.find((t) => t.slug === toolName);
        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`);
        }
        return {
          type: "tool" as const,
          tool: {
            name: tool.name,
            slug: tool.slug,
            description: tool.description,
            parameters: args,
          } satisfies ToolAvailableResult,
        };
    }
  });
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

const buildParameterSchema = (tool: Tool) => {
  return z.object(
    (tool.parameters || []).reduce<Record<string, z.ZodType>>((acc, param) => {
      const zodType = (z[param.type as keyof typeof z] as any)().describe(param.description || param.name);
      acc[param.name] = param.required ? zodType : zodType.optional();
      return acc;
    }, {}),
  );
};

const validateParameters = (tool: Tool, params: Record<string, any>) => {
  try {
    buildParameterSchema(tool).parse(params);
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
