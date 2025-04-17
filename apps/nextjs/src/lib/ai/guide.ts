import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { Mailbox } from "@/lib/data/mailbox";
import { fetchPromptRetrievalData } from "@/lib/data/retrieval";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const PLAN_PROMPT = `You are a planning agent that helps break down tasks into smaller steps and reason about the current state. Your role is to:

1. Analyze the user request, current state and history
2. Evaluate progress towards the ultimate goal
3. Identify potential challenges or roadblocks
4. Suggest the next high-level steps to take

## Knowledge base
{{KNOWLEDGE_BASE}}

Inside your messages, there will be AI messages from different agents with different formats.

Keep your responses concise and focused on actionable insights.`;

export type PlanResult = {
  state_analysis: string;
  progress_evaluation: string;
  challenges: string;
  next_steps: string[];
  reasoning: string;
  title: string;
};

export async function generateGuidePlan(title: string, instructions: string, mailbox: Mailbox): Promise<PlanResult> {
  const prompt = `# USER REQUEST:
  ${title}
  ${instructions}`;

  const { knowledgeBank, websitePagesPrompt } = await fetchPromptRetrievalData(mailbox, prompt, null);
  let knowledgeBase = "";
  if (knowledgeBank) {
    knowledgeBase += `\n${knowledgeBank}`;
  }
  if (websitePagesPrompt) {
    knowledgeBase += `\n${websitePagesPrompt}`;
  }

  try {
    const result = await generateObject({
      model: openai("gpt-4.1"),
      system: PLAN_PROMPT,
      prompt,
      schema: z.object({
        state_analysis: z.string().describe("Brief analysis of the current state and what has been done so far"),
        progress_evaluation: z
          .string()
          .describe("Evaluation of progress towards the ultimate goal (as percentage and description)"),
        challenges: z.string().describe("List any potential challenges or roadblocks"),
        next_steps: z
          .array(z.string())
          .max(4)
          .describe(
            "List 3-4 concrete next steps to take, filling several fields in the same form can be considered as one step",
          ),
        reasoning: z.string().describe("Explain your reasoning for the suggested next steps"),
        title: z.string().describe("Title of the guide session"),
      }),
    });

    return result.object;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to generate plan");
  }
}
