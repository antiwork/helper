import { waitUntil } from "@vercel/functions";
import { corsResponse, withAuth } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { generateGuidePlan } from "@/lib/ai/guide";
import { createConversation, getConversationBySlug } from "@/lib/data/conversation";
import { createGuideSession, createGuideSessionEvent } from "@/lib/data/guide";
import { findOrCreatePlatformCustomerByEmail } from "@/lib/data/platformCustomer";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";

export const POST = withAuth(async ({ request }, { session, mailbox }) => {
  const { title, instructions, conversationSlug } = await request.json();
  const platformCustomer = assertDefined(
    await findOrCreatePlatformCustomerByEmail(mailbox.id, assertDefined(session.email)),
  );

  try {
    const result = await generateGuidePlan(title, instructions);
    let conversationId: number | null = null;

    if (conversationSlug) {
      const conversation = await getConversationBySlug(conversationSlug);
      conversationId = conversation?.id ?? null;
    } else {
      const conversation = await createConversation({
        emailFrom: session.email,
        isPrompt: false,
        mailboxId: mailbox.id,
        source: "chat",
        assignedToAI: true,
        status: "closed",
        closedAt: new Date(),
        subject: result.title,
      });

      conversationId = conversation.id;
    }

    const guideSession = await createGuideSession({
      platformCustomerId: platformCustomer.id,
      title: result.title,
      instructions,
      mailboxId: mailbox.id,
      conversationId: assertDefined(conversationId),
      steps: result.next_steps.map((description) => ({ description, completed: false })),
    });

    waitUntil(
      createGuideSessionEvent({
        guideSessionId: guideSession.id,
        type: "session_started",
        mailboxId: mailbox.id,
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
    captureExceptionAndLogIfDevelopment(error);
    return corsResponse({ error: "Failed to create guide session" }, { status: 500 });
  }
});
