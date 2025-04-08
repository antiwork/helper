import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { authenticateWidget, corsResponse } from "../widget/utils";

const PROMPT = `You are an AI guide planner for Helper. Your task is to create a concise, clear 5-step guide plan based on the user's request.

# RULES:
1. Create EXACTLY 5 steps - not more, not less
2. Each step should be a single, clear action
3. Steps should be specific and actionable
4. Focus on the core workflow, avoiding unnecessary details
5. Make steps sequential and logical
6. Use natural, friendly language
7. Remember this is for a browser automation guide

# USER REQUEST:
{{USER_REQUEST}}

Respond using the GuidePlan tool with your 5-step plan.
`;

export async function POST(request: Request) {
  const { guideRequest } = await request.json();

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const { mailbox } = authResult;
  const sessionId = uuidv4();
  
  const systemPrompt = PROMPT.replace("{{USER_REQUEST}}", guideRequest || "Help me navigate this website");

  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: systemPrompt,
      schema: z.object({
        sessionId: z.string(),
        title: z.string(),
        steps: z.array(z.string()).length(5),
      }),
    });

    return corsResponse({
      sessionId,
      title: result.object.title,
      steps: result.object.steps,
    });
  } catch (error) {
    console.error("AI error:", error);
    return corsResponse({ error: "Failed to generate guide plan" }, { status: 500 });
  }
}
