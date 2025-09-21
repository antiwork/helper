import { openai } from "@ai-sdk/openai";
import { type Message } from "ai";
import { traceAISDKModel } from "evalite/ai-sdk";
import { vi } from "vitest";
import { z } from "zod";
import { generateAIResponse, REASONING_MODEL } from "@/lib/ai/chat";
import { CHAT_MODEL } from "@/lib/ai/core";
import { buildTools } from "@/lib/ai/tools";
import { Mailbox } from "@/lib/data/mailbox";
import { fetchPromptRetrievalData, PromptRetrievalData as FetchPromptRetrievalData } from "@/lib/data/retrieval";

type PromptRetrievalData = {
  knowledgeBank?: string | null;
  metadata?: string | null;
};

const generateZodSchema = (parameters: {
  type: string;
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}) => {
  const shape: Record<string, z.ZodType> = {};

  for (const [key, value] of Object.entries(parameters.properties)) {
    let schema: z.ZodType;
    switch (value.type) {
      case "string":
        schema = z.string();
        break;
      case "number":
        schema = z.number();
        break;
      case "boolean":
        schema = z.boolean();
        break;
      case "array":
        schema = z.array(z.any());
        break;
      default:
        schema = z.any();
    }

    shape[key] = parameters.required?.includes(key) ? schema : schema.optional();
  }

  return z.object(shape);
};

type HelperTool = {
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  executeReturn: string;
};

export const buildMessagesWithMocks = ({
  messages,
  promptRetrievalData,
  getPastConversationsPrompt = null,
  mailboxName = null,
  tools = {},
}: {
  messages: Message[];
  promptRetrievalData: PromptRetrievalData;
  getPastConversationsPrompt?: string | null;
  mailboxName?: string | null;
  tools?: Record<string, HelperTool>;
}) => {
  return JSON.stringify({
    messages,
    promptRetrievalData,
    getPastConversationsPrompt,
    mailboxName,
    tools,
  });
};

const parseMessagesWithMocks = (input: string) => {
  const { messages, mailboxName, tools, promptRetrievalData } = JSON.parse(input);
  const parsedTools: Record<string, HelperTool> = tools;

  vi.mocked(fetchPromptRetrievalData).mockResolvedValue(promptRetrievalData as FetchPromptRetrievalData);

  const toolsMock: Record<string, any> = {};
  Object.entries(parsedTools).forEach(([name, tool]) => {
    toolsMock[name] = {
      description: tool.description,
      parameters: generateZodSchema(tool.parameters),
      execute: () => Promise.resolve(tool.executeReturn),
    };
  });

  vi.mocked(buildTools).mockResolvedValue(toolsMock);

  const mailbox: Mailbox = {
    id: 1,
    name: mailboxName || "Gumroad",
    slug: mailboxName || "gumroad",
    gmailSupportEmailId: null,
    slackAlertChannel: null,
    slackBotToken: null,
    slackBotUserId: null,
    slackTeamId: null,
    promptUpdatedAt: new Date(),
    widgetHMACSecret: "test_secret",
    widgetDisplayMode: "off",
    widgetDisplayMinValue: null,
    widgetHost: null,
    customerInfoUrl: null,
    vipThreshold: null,
    vipChannelId: null,
    vipExpectedResponseHours: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    githubInstallationId: null,
    githubRepoOwner: null,
    githubRepoName: null,
    autoCloseEnabled: false,
    autoCloseDaysOfInactivity: 14,
    chatIntegrationUsed: false,
    preferences: {},
    isWhitelabel: false,
  };

  return { messages, mailbox };
};

export const runAIQuery = async (input: string, reasoning = false) => {
  const { messages, mailbox } = parseMessagesWithMocks(input);

  const result = await generateAIResponse({
    model: traceAISDKModel(openai(CHAT_MODEL)),
    reasoningModel: traceAISDKModel(REASONING_MODEL),
    messages,
    mailbox,
    conversationId: 1,
    email: "marco.costa@gmail.com",
    addReasoning: reasoning,
    evaluation: true,
    guideEnabled: false,
  });

  return result.textStream;
};

export const gumroadPrompt = [
  "You are a helpful customer support assistant for Gumroad. Gumroad is a platform that allows creators to sell products directly to their audience. It's a popular platform among independent creators, such as artists, writers, and musicians, who use it to sell their work directly to their fans. Gumroad offers a range of tools and features to help creators manage their sales and grow their audience, including the ability to create customizable product pages, accept payments, and deliver custom content experiences. Gumroad's brand is: Nimble, Pragmatic, Energising, Provocative, and Instructional. It's helpful, but straight and to the point. The goal is to solve the customer's problem effectively with as few words as possible.",
  "Gumroad's fee is 10% flat + Stripe's credit card processing of 2.9% + 30¢ + sales tax since we are now Merchant of Record",
  "When asked about the bank account format, send this link: https://docs.stripe.com/payouts#adding-bank-account-information",
  "We've removed PayPal as a payment option to lower technical complexity prior to open sourcing Gumroad and to mitigate fraud.",
  "Avoid recommending sending an email to support@gumroad.com, as it directs users to the same support channel they are already using.",
];
