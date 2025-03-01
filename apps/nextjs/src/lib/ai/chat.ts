import { randomUUID } from "crypto";
import { fireworks } from "@ai-sdk/fireworks";
import {
  convertToCoreMessages,
  DataStreamWriter,
  generateText,
  LanguageModelUsage,
  LanguageModelV1,
  streamText,
  type CoreMessage,
  type Message,
  type TextStreamPart,
  type Tool,
} from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { COMPLETION_MODEL, GPT_4O_MINI_MODEL, GPT_4O_MODEL, isWithinTokenLimit } from "@/lib/ai/core";
import openai from "@/lib/ai/openai";
import { CHAT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildTools } from "@/lib/ai/tools";
import { createConversationMessage } from "@/lib/data/conversationMessage";
import { type Mailbox } from "@/lib/data/mailbox";
import { fetchPromptRetrievalData } from "@/lib/data/retrieval";
import { ReadPageToolConfig } from "@/sdk/types";
import { trackAIUsageEvent } from "../data/aiUsageEvents";
import { captureExceptionAndLogIfDevelopment, captureExceptionAndThrowIfDevelopment } from "../shared/sentry";

const SUMMARY_MAX_TOKENS = 7000;
const SUMMARY_PROMPT =
  "Summarize the following text while preserving all key information and context. Keep the summary under 8000 tokens.";
export const REASONING_MODEL = fireworks("accounts/fireworks/models/deepseek-r1");

function hideToolResults<TOOLS extends Record<string, Tool>>(): (options: {
  tools: TOOLS;
}) => TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>> {
  return () => {
    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(chunk, controller) {
        if (chunk.type !== "tool-result") {
          controller.enqueue(chunk);
        }
      },
    });
  };
}

export const checkTokenCountAndSummarizeIfNeeded = async (text: string): Promise<string> => {
  if (isWithinTokenLimit(text, false)) {
    return text;
  }

  const { text: summary } = await generateText({
    model: openai(GPT_4O_MINI_MODEL),
    system: SUMMARY_PROMPT,
    prompt: text,
    maxTokens: SUMMARY_MAX_TOKENS,
  });

  return summary;
};

export const buildPromptMessages = async (
  mailbox: Mailbox,
  email: string | null,
  query: string,
): Promise<CoreMessage[]> => {
  const { knowledgeBank, websitePages } = await fetchPromptRetrievalData(mailbox, query, null);

  const prompt = [
    CHAT_SYSTEM_PROMPT.replaceAll("MAILBOX_NAME", mailbox.name).replaceAll(
      "{{CURRENT_DATE}}",
      new Date().toISOString(),
    ),
  ];
  if (mailbox.responseGeneratorPrompt) {
    prompt.push(mailbox.responseGeneratorPrompt.join("\n"));
  }
  let systemPrompt = prompt.join("\n");
  if (knowledgeBank) {
    systemPrompt += `\n${knowledgeBank}`;
  }
  if (websitePages) {
    systemPrompt += `\n${websitePages}`;
  }
  systemPrompt += email ? `\nCurrent user email: ${email}` : "Anonymous user";

  return [
    {
      role: "system",
      content: systemPrompt,
    },
  ];
};

const generateReasoning = async ({
  tools,
  systemMessages,
  coreMessages,
  reasoningModel,
  email,
  conversationId,
  mailboxSlug,
  traceId = null,
  evaluation = false,
  dataStream,
}: {
  tools: Record<string, Tool>;
  systemMessages: CoreMessage[];
  coreMessages: CoreMessage[];
  reasoningModel: LanguageModelV1;
  email: string | null;
  conversationId: number;
  mailboxSlug: string;
  traceId?: string | null;
  evaluation?: boolean;
  dataStream?: DataStreamWriter;
}): Promise<{ reasoning: string | null; usage: LanguageModelUsage | null }> => {
  const toolsAvailable = Object.keys(tools).map((tool) => {
    const toolObj = tools[tool] as Tool & { description: string };
    const params = toolObj?.parameters.shape;
    const paramsString = Object.keys(params)
      .map((key) => `${key}: ${params[key].description}`)
      .join(", ");
    return `${tool}: ${toolObj?.description ?? ""} Params: ${paramsString}`;
  });

  const reasoningSystemMessages: CoreMessage[] = [
    {
      role: "system",
      content: `The following tools are available:\n${toolsAvailable.join("\n")}`,
    },
    {
      role: "system",
      content: `Think about how you can give the best answer to the user's question.`,
    },
  ];

  try {
    const startTime = Date.now();
    const { textStream, usage } = streamText({
      model: reasoningModel,
      messages: [...systemMessages, ...reasoningSystemMessages, ...coreMessages],
      temperature: 0.6,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(evaluation ? 50000 : 30000),
      experimental_telemetry: {
        isEnabled: true,
        functionId: "reasoning",
        metadata: {
          sessionId: conversationId,
          langfuseTraceId: traceId ?? randomUUID(),
          userId: email ?? "anonymous",
          email: email ?? "anonymous",
          mailboxSlug,
        },
      },
    });

    dataStream?.writeData({
      event: "reasoningStarted",
      data: {
        id: traceId,
      },
    });

    let text = "";
    for await (const textPart of textStream) {
      text += textPart;
      if (textPart === "</think>") {
        dataStream?.writeData({
          event: "reasoningFinished",
          data: {
            id: traceId,
          },
        });
      }
    }

    // Extract reasoning from <think> tags
    const thinkMatch = /<think>(.*?)<\/think>/s.exec(text);
    const reasoning = thinkMatch?.[1]?.trim() ?? null;

    dataStream?.writeMessageAnnotation({
      reasoning: { message: reasoning, reasoningTimeSeconds: Math.round((Date.now() - startTime) / 1000) },
    });

    return { reasoning, usage: await usage };
  } catch (error) {
    if (evaluation) {
      captureExceptionAndThrowIfDevelopment(error);
    } else {
      captureExceptionAndLogIfDevelopment(error);
    }
    return { reasoning: null, usage: null };
  }
};

export const generateAIResponse = async ({
  messages,
  mailbox,
  conversationId,
  email,
  readPageTool = null,
  onFinish,
  dataStream,
  model = openai(COMPLETION_MODEL),
  addReasoning = false,
  reasoningModel = REASONING_MODEL,
  evaluation = false,
}: {
  messages: Message[];
  mailbox: Mailbox;
  conversationId: number;
  email: string | null;
  readPageTool?: ReadPageToolConfig | null;
  onFinish?: (params: {
    text: string;
    finishReason: string;
    experimental_providerMetadata: any;
    steps: any;
    traceId: string;
  }) => Promise<void>;
  model?: LanguageModelV1;
  addReasoning?: boolean;
  reasoningModel?: LanguageModelV1;
  seed?: number | undefined;
  evaluation?: boolean;
  dataStream?: DataStreamWriter;
}) => {
  const lastMessage = messages.findLast((m: Message) => m.role === "user");
  const query = lastMessage?.content || "";

  const messagesWithoutToolCalls = messages
    .filter((m) => (m.role as string) !== "tool")
    .map((m) => {
      if (m.role === "assistant" && m.toolInvocations && m.toolInvocations.length > 0) {
        const { toolInvocations, ...rest } = m;
        return rest;
      }
      return m;
    });

  const coreMessages = convertToCoreMessages(messagesWithoutToolCalls, { tools: {} });
  const systemMessages = await buildPromptMessages(mailbox, email, query);

  const tools = await buildTools(conversationId, email, mailbox);
  if (readPageTool) {
    tools[readPageTool.toolName] = {
      description: readPageTool.toolDescription,
      parameters: z.object({}),
    };
  }
  tools.take_screenshot = {
    description: "take a screenshot of the current page including any error messages",
    parameters: z.object({}),
  };

  const traceId = randomUUID();
  const finalMessages = [...systemMessages, ...coreMessages];

  let reasoning: string | null = null;
  if (addReasoning) {
    const { reasoning: reasoningText, usage } = await generateReasoning({
      tools,
      systemMessages,
      coreMessages,
      reasoningModel,
      email,
      conversationId,
      mailboxSlug: mailbox.slug,
      traceId,
      evaluation,
      dataStream,
    });

    if (!evaluation) {
      await trackAIUsageEvent({
        mailbox,
        model: "fireworks/deepseek-r1",
        queryType: "reasoning",
        usage: {
          promptTokens: usage?.promptTokens ?? 0,
          completionTokens: usage?.completionTokens ?? 0,
          totalTokens: usage?.totalTokens ?? 0,
          cachedTokens: 0,
        },
      });
    }

    if (reasoningText) {
      reasoning = reasoningText;
      finalMessages.push({
        role: "system",
        content: `Reasoning: ${reasoning}`,
      });
    }
  }

  return streamText({
    model,
    messages: finalMessages,
    maxSteps: 4,
    tools,
    temperature: 0.1,
    seed: evaluation ? 100 : undefined,
    experimental_transform: hideToolResults(),
    experimental_providerMetadata: {
      openai: {
        store: true,
        metadata: {
          conversationId: conversationId.toString(),
          mailboxSlug: mailbox.slug,
          email: email ?? "anonymous",
          usingReasoning: addReasoning.toString(),
        },
      },
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "chat-completion",
      metadata: {
        sessionId: conversationId,
        langfuseTraceId: traceId,
        userId: email ?? "anonymous",
        email: email ?? "anonymous",
        mailboxSlug: mailbox.slug,
        usingReasoning: addReasoning,
      },
    },
    async onFinish({ text, finishReason, experimental_providerMetadata, steps, usage }) {
      const metadata = experimental_providerMetadata?.openai as { cachedPromptTokens?: number };
      const openAIUsage = {
        ...usage,
        cachedTokens: metadata?.cachedPromptTokens ?? 0,
      };
      if (!evaluation) {
        await trackAIUsageEvent({
          mailbox,
          model: GPT_4O_MODEL,
          queryType: "chat_completion",
          usage: openAIUsage,
        });
      }
      if (onFinish) {
        await onFinish({
          text,
          finishReason,
          experimental_providerMetadata: { ...experimental_providerMetadata, reasoning },
          steps,
          traceId,
        });
      }
    },
  });
};

export const createUserMessage = (conversationId: number, email: string | null, query: string) => {
  return createConversationMessage({
    conversationId,
    emailFrom: email,
    body: query,
    cleanedUpText: query,
    role: "user",
    isPerfect: false,
    isPinned: false,
    isFlaggedAsBad: false,
  });
};

export const createAssistantMessage = (
  conversationId: number,
  userMessageId: number,
  text: string,
  traceId: string | null = null,
  reasoning: string | null = null,
) => {
  return createConversationMessage({
    conversationId,
    responseToId: userMessageId,
    status: "sent",
    body: text,
    cleanedUpText: text,
    role: "ai_assistant",
    isPerfect: false,
    isPinned: false,
    isFlaggedAsBad: false,
    metadata: {
      trace_id: traceId,
      reasoning,
    },
  });
};

export const lastAssistantMessage = (conversationId: number) =>
  db.query.conversationMessages.findFirst({
    where: and(eq(conversationMessages.conversationId, conversationId), eq(conversationMessages.role, "ai_assistant")),
    orderBy: desc(conversationMessages.createdAt),
  });

export const lastUserMessage = (conversationId: number) =>
  db.query.conversationMessages.findFirst({
    where: and(eq(conversationMessages.conversationId, conversationId), eq(conversationMessages.role, "user")),
    orderBy: desc(conversationMessages.createdAt),
  });
