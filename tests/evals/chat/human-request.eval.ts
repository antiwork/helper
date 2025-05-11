import { Factuality } from "autoevals";
import { evalite } from "evalite";
import { expect, vi } from "vitest";
import { REQUEST_HUMAN_SUPPORT_DESCRIPTION } from "@/lib/ai/constants";
import { knowledgeBankPrompt } from "@/lib/ai/prompts";
import { buildMessagesWithMocks, gumroadPrompt, runAIQuery } from "@/tests/evals/support/chat";

const REASONING_ENABLED = true;

const tool = {
  description: REQUEST_HUMAN_SUPPORT_DESCRIPTION,
  parameters: {
    type: "object",
    properties: {
      reason: { type: "string", description: "reason for escalation" },
    },
    required: ["reason"],
  },
  executeReturn: "The conversation has been escalated to a human agent. You will be contacted soon by email.",
  execute: vi
    .fn()
    .mockResolvedValue("The conversation has been escalated to a human agent. You will be contacted soon by email."),
};

evalite("Human request clarification", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "1",
            role: "user",
            content: "can i talk to a human",
          },
        ],
        promptRetrievalData: {
          knowledgeBank: knowledgeBankPrompt(gumroadPrompt.map((content) => ({ content }))),
        },
        tools: {
          request_human_support: tool,
        },
      }),
      expected: "The AI should ask for more details instead of immediately escalating.",
      assert: () => {
        expect(tool.execute).not.toHaveBeenCalled();
      },
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});

evalite("Request human support after clarifying", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "1",
            role: "user",
            content: "can i talk to a human",
          },
          {
            id: "2",
            role: "assistant",
            content:
              "Could you please describe the issue you're experiencing? I'll do my best to assist you, and if needed, I can escalate your request to a human agent.",
          },
          {
            id: "3",
            role: "user",
            content: "i can't download my sales data, the page is broken",
          },
          {
            id: "4",
            role: "assistant",
            content:
              "Does it work if you use a different browser? If not, let me know and I'll escalate your request to a human agent.",
          },
          {
            id: "5",
            role: "user",
            content: "talk to a human",
          },
        ],
        promptRetrievalData: {
          knowledgeBank: knowledgeBankPrompt(gumroadPrompt.map((content) => ({ content }))),
        },
        tools: {
          request_human_support: tool,
        },
      }),
      expected: "The AI should escalate to a human.",
      assert: () => {
        expect(tool.execute).toHaveBeenCalledOnce();
      },
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});

evalite("Request human support when the issue is already clear", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "1",
            role: "user",
            content: "can i talk to a human. i can't download my sales data, the page is broken",
          },
        ],
        promptRetrievalData: {
          knowledgeBank: knowledgeBankPrompt(gumroadPrompt.map((content) => ({ content }))),
        },
        tools: {
          request_human_support: tool,
        },
      }),
      expected: "The AI should escalate to a human.",
      assert: () => {
        expect(tool.execute).toHaveBeenCalledOnce();
      },
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});
