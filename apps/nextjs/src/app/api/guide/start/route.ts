import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateWidget, corsResponse } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { guideSessionEvents, guideSessionEventTypeEnum, guideSessions } from "@/db/schema";
import { findOrCreatePlatformCustomerByEmail } from "@/lib/data/platformCustomer";
import { assertDefined } from "../../../../components/utils/assert";

const PROMPT = `You are an AI guide planner for Helper. Your task is to create a concise, clear 5-step guide plan based on the user's request.

# RULES:
1. Create MAX of 5 steps
2. Steps should be specific and actionable
3. Focus on the core workflow, avoiding unnecessary details
4. Make steps sequential and logical
5. Use natural, friendly language
6. Remember this is for a browser automation guide

# USER REQUEST:
{{TITLE}}
{{INSTRUCTIONS}}

Respond using the GuidePlan tool with your steps plan.
`;

export async function POST(request: Request) {
  const { title, instructions, conversationId } = await request.json();

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const { mailbox, session } = authResult;

  const platformCustomer = assertDefined(
    await findOrCreatePlatformCustomerByEmail(mailbox.id, assertDefined(session.email)),
  );

  const systemPrompt = PROMPT.replace("{{TITLE}}", title).replace("{{INSTRUCTIONS}}", instructions);

  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      system: systemPrompt,
      schema: z.object({
        steps: z.array(z.string()).max(5).describe("The steps that AI will take to complete the guide (max 5 steps)"),
      }),
    });

    const [guideSession] = await db
      .insert(guideSessions)
      .values({
        platformCustomerId: platformCustomer.id,
        title,
        instructions,
        conversationId,
        status: "planning",
        steps: result.object.steps.map((description) => ({ description, completed: false })),
      })
      .returning();

    if (!guideSession) {
      throw new Error("Failed to create guide session");
    }

    // Create the initial session started event
    await db.insert(guideSessionEvents).values({
      guideSessionId: guideSession.id,
      type: "session_started",
      data: { steps: guideSession.steps },
      timestamp: new Date(),
    });

    return corsResponse({
      sessionId: guideSession.uuid,
      steps: result.object.steps,
    });
  } catch (error) {
    console.error("Guide session creation error:", error);
    return corsResponse({ error: "Failed to create guide session" }, { status: 500 });
  }
}
