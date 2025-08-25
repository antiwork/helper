import { waitUntil } from "@vercel/functions";
import { and, desc, eq } from "drizzle-orm";
import { corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { generateGuidePlan } from "@/lib/ai/guide";
import { createConversation, getConversationBySlug } from "@/lib/data/conversation";
import { createGuideSession, createGuideSessionEvent } from "@/lib/data/guide";
import { findOrCreatePlatformCustomerByEmail } from "@/lib/data/platformCustomer";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const POST = withWidgetAuth(async ({ request }, { session }) => {
  const { title, instructions, conversationSlug } = await request.json();

  const platformCustomer = assertDefined(await findOrCreatePlatformCustomerByEmail(assertDefined(session.email)));

  try {
    const result = await generateGuidePlan(title, instructions);
    let conversationId: number | null = null;

    if (conversationSlug) {
      const conversation = await getConversationBySlug(conversationSlug);
      conversationId = assertDefined(conversation?.id);
    } else {
      const conversation = await createConversation({
        emailFrom: session.email,
        isPrompt: false,
        source: "chat",
        assignedToAI: true,
        status: "closed",
        closedAt: new Date(),
        subject: result.title,
      });

      conversationId = conversation.id;
    }

    const lastAIMessage = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.role, "ai_assistant"),
      ),
      orderBy: desc(conversationMessages.createdAt),
    });

    const guideSession = await createGuideSession({
      platformCustomerId: platformCustomer.id,
      title: result.title,
      instructions,
      conversationId,
      messageId: lastAIMessage?.id ?? null,
      steps: result.next_steps.map((description) => ({ description, completed: false })),
    });

    waitUntil(
      createGuideSessionEvent({
        guideSessionId: guideSession.id,
        type: "session_started",
        data: {
          steps: result.next_steps,
          state_analysis: result.state_analysis,
          progress_evaluation: result.progress_evaluation,
          challenges: result.challenges,
          reasoning: result.reasoning,
        },
      }),
    );

    return corsResponse({
      sessionId: guideSession.uuid,
      steps: result.next_steps,
      conversationId,
    });
  } catch (error) {
    captureExceptionAndLog(error);
    return corsResponse({ error: "Failed to create guide session" }, { status: 500 });
  }
});
