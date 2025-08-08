import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { MINI_MODEL } from "./core";

const PLAN_PROMPT = `You are a planning agent that helps break down tasks into smaller steps and reason about the current state. Your role is to:

1. Analyze the user request, current state and history
2. Evaluate progress towards the ultimate goal
3. Identify potential challenges or roadblocks
4. Suggest the next high-level steps to take
5. Don't use more than 6 words for each step

## Knowledge base
{{KNOWLEDGE_BASE}}

Inside your messages, there will be AI messages from different agents with different formats.

Keep your responses concise and focused on actionable insights.`;

const PlanResultSchema = z.object({
  state_analysis: z.string().describe("Brief analysis of the current state and what has been done so far"),
  progress_evaluation: z
    .string()
    .describe("Evaluation of progress towards the ultimate goal (as percentage and description)"),
  challenges: z.string().describe("List any potential challenges or roadblocks"),
  next_steps: z
    .array(z.string())
    .describe(
      "List 3-4 concrete next steps to take, filling several fields in the same form can be considered as one step",
    ),
  reasoning: z.string().describe("Explain your reasoning for the suggested next steps"),
  title: z.string().describe("Title of the guide session"),
});

type PlanResult = z.infer<typeof PlanResultSchema>;

export async function generateGuidePlan(title: string, instructions: string): Promise<PlanResult> {
  const prompt = `# USER REQUEST:
  ${title}
  ${instructions}`;

  try {
    const result = await generateObject({
      model: openai(MINI_MODEL),
      system: PLAN_PROMPT,
      prompt,
      schema: PlanResultSchema,
    });

    return result.object;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to generate plan");
  }
}
