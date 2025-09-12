import { waitUntil } from "@vercel/functions";
import { tool, type Tool } from "ai";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { triggerEvent } from "@/jobs/trigger";
import { GUIDE_USER_TOOL_NAME, REQUEST_HUMAN_SUPPORT_DESCRIPTION } from "@/lib/ai/constants";
import { getConversationById, updateConversation, updateOriginalConversation } from "@/lib/data/conversation";
import { createToolEvent, generateCleanedUpText } from "@/lib/data/conversationMessage";
import { Mailbox } from "@/lib/data/mailbox";
import { getPastConversationsPrompt } from "@/lib/data/retrieval";
import { fuzzyFindSavedReply } from "@/lib/data/savedReplies";
import { getMailboxToolsForChat } from "@/lib/data/tools";
import { createHmacDigest } from "@/lib/metadataApiClient";
import { buildAITools, callToolApi } from "@/lib/tools/apiTool";
import { ToolRequestBody } from "@/packages/client/dist";

const searchKnowledgeBase = async (query: string) => {
  const documents = await getPastConversationsPrompt(query);
  return documents ?? "No past conversations found";
};

const requestHumanSupport = async (conversationId: number, email: string | null, reason: string, newEmail?: string) => {
  const conversation = assertDefined(await getConversationById(conversationId));

  if (newEmail) {
    await updateConversation(conversation.id, {
      set: { emailFrom: newEmail },
      message: "Email set for escalation",
      type: "update",
    });
    email = newEmail;
  }

  await updateOriginalConversation(conversation.id, {
    set: { status: "open", assignedToAI: false, lastUserEmailCreatedAt: conversation.lastUserEmailCreatedAt },
    message: reason,
    type: "request_human_support",
  });

  if (email) {
    waitUntil(
      triggerEvent("conversations/human-support-requested", {
        conversationId: conversation.id,
      }),
    );
  }

  return "The conversation has been escalated to a human agent. You will be contacted soon by email.";
};

const setUserEmail = async (conversationId: number, email: string) => {
  const conversation = assertDefined(await getConversationById(conversationId));
  await updateConversation(conversation.id, {
    set: { emailFrom: email },
    message: "Email set by user",
    type: "update",
  });

  return "Your email has been set. You can now request human support if needed.";
};

export const buildTools = async ({
  conversationId,
  email,
  includeHumanSupport = true,
  guideEnabled = false,
  includeMailboxTools = true,
  reasoningMiddlewarePrompt,
}: {
  conversationId: number;
  email: string | null;
  includeHumanSupport?: boolean;
  guideEnabled?: boolean;
  includeMailboxTools?: boolean;
  reasoningMiddlewarePrompt?: string;
}): Promise<Record<string, Tool>> => {
  const reasoningMiddleware = async (result: Promise<string | undefined> | string | undefined) => {
    const resultString = await result;
    if (reasoningMiddlewarePrompt && resultString) {
      return `${reasoningMiddlewarePrompt}\n\n${resultString}`;
    }
    return resultString;
  };

  const logToolEvent = (toolName: string, params: Record<string, any>) =>
    createToolEvent({
      conversationId,
      tool: { name: toolName },
      parameters: params,
      userMessage: "",
    });

  const tools: Record<string, Tool> = {
    knowledge_base: tool({
      description: "search the knowledge base",
      parameters: z.object({
        query: z.string().describe("query to search the knowledge base"),
      }),
      execute: ({ query }) =>
        reasoningMiddleware(searchKnowledgeBase(query)).finally(() => logToolEvent("search_knowledge_base", { query })),
    }),
    read_saved_reply: tool({
      description: "read a saved reply, to get the message content when a saved reply should be used",
      parameters: z.object({
        replyName: z.string().describe("name of the saved reply to read"),
      }),
      execute: async ({ replyName }) => {
        try {
          const savedReply = await fuzzyFindSavedReply(replyName);
          if (!savedReply)
            return {
              error: "Saved reply not found - ignore saved reply instructions and generate a response from scratch.",
            };
          return {
            content: generateCleanedUpText(savedReply.content),
          };
        } finally {
          logToolEvent("read_saved_reply", { replyName });
        }
      },
    }),
  };

  if (guideEnabled) {
    tools[GUIDE_USER_TOOL_NAME] = tool({
      description: "call this tool to guide the user in the interface instead of returning a text response",
      parameters: z.object({
        title: z.string().describe("title of the guide that will be displayed to the user"),
        instructions: z.string().describe("instructions for the guide based on the current page and knowledge base"),
      }),
    });
  }

  if (!email) {
    tools.set_user_email = tool({
      description: "Set the email address for the current anonymous user, so that the user can be contacted later",
      parameters: z.object({
        email: z.string().email().describe("email address to set for the user"),
      }),
      execute: ({ email }) =>
        reasoningMiddleware(setUserEmail(conversationId, email)).finally(() =>
          logToolEvent("set_user_email", { email }),
        ),
    });
  }

  if (includeHumanSupport) {
    tools.request_human_support = tool({
      description: REQUEST_HUMAN_SUPPORT_DESCRIPTION,
      parameters: z.object({
        reason: z
          .string()
          .describe(
            "Escalation reasons must include specific details about the issue. Simply stating a human is needed without context is not acceptable, even if the user stated several times or said it's urgent.",
          ),
        email: email
          ? z.string().optional()
          : z.string().email().describe("email address to contact you (required for anonymous users)"),
      }),
      execute: ({ reason, email: newEmail }) =>
        reasoningMiddleware(requestHumanSupport(conversationId, email, reason, newEmail)),
    });
  }

  if (includeMailboxTools) {
    const mailboxTools = await getMailboxToolsForChat();
    const aiTools = buildAITools(mailboxTools, email);

    for (const [slug, aiTool] of Object.entries(aiTools)) {
      const mailboxTool = mailboxTools.find((t) => t.slug === slug);
      if (!mailboxTool) continue;

      tools[slug] = tool({
        description: aiTool.description,
        parameters: aiTool.parameters,
        execute: aiTool.available
          ? async (params) => {
              if (aiTool.customerEmailParameter && email) {
                params[aiTool.customerEmailParameter] = email;
              }
              const conversation = assertDefined(await getConversationById(conversationId));
              const result = await callToolApi(conversation, mailboxTool, params);
              return reasoningMiddleware(JSON.stringify(result));
            }
          : () => Promise.resolve("This tool is not available"),
      });
    }
  }

  return tools;
};

export const callServerSideTool = async ({
  tool,
  toolName,
  conversationId,
  email,
  params,
  mailbox,
}: {
  tool: ToolRequestBody;
  toolName: string;
  conversationId: number;
  email: string | null;
  params: Record<string, any>;
  mailbox: Mailbox;
}) => {
  const result = await fetchToolEndpoint(tool, email, params, mailbox);
  await createToolEvent({
    conversationId,
    tool: {
      name: toolName,
      description: tool.description,
      url: tool.serverRequestUrl,
    },
    data: result.success ? result.data : undefined,
    error: result.success ? undefined : result.error,
    parameters: params,
    userMessage: result.success ? "Tool executed successfully." : "Tool execution failed.",
  });
  return result;
};

const fetchToolEndpoint = async (
  tool: ToolRequestBody,
  email: string | null,
  parameters: Record<string, any>,
  mailbox: Mailbox,
) => {
  if (!tool.serverRequestUrl) {
    throw new Error("Tool does not have a server request URL");
  }

  const requestBody = { email, parameters, requestTimestamp: Math.floor(Date.now() / 1000) };
  const hmacDigest = createHmacDigest(mailbox.widgetHMACSecret, { json: requestBody });
  const hmacSignature = hmacDigest.toString("base64");

  try {
    const response = await fetch(tool.serverRequestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${hmacSignature}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let error = `Server returned ${response.status}: ${response.statusText}`;
      try {
        const data = await response.json();
        if (data.error) error = data.error;
      } catch {}
      return {
        success: false,
        error,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
