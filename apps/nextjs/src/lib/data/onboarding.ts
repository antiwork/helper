import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";

export const OnboardingStepSchema = z.enum(["website", "email", "widget"]);
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;

export async function completeOnboardingStep(mailboxId: number, stepId: OnboardingStep) {
  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.id, mailboxId),
  });

  if (!mailbox) {
    throw new Error(`Mailbox with id ${mailboxId} not found`);
  }

  const onboardingMetadata = mailbox.onboardingMetadata || { completed: false };
  let updatedMetadata;

  switch (stepId) {
    case "website":
      updatedMetadata = { ...onboardingMetadata, knowledgeAddedAt: new Date() };
      break;
    case "email":
      updatedMetadata = { ...onboardingMetadata, emailConnectedAt: new Date() };
      break;
    case "widget":
      updatedMetadata = { ...onboardingMetadata, widgetAddedAt: new Date() };
      break;
  }

  const allStepsCompleted =
    updatedMetadata.knowledgeAddedAt && (updatedMetadata.emailConnectedAt || updatedMetadata.widgetAddedAt);

  if (allStepsCompleted) {
    updatedMetadata.completed = true;
  }

  await db.update(mailboxes).set({ onboardingMetadata: updatedMetadata }).where(eq(mailboxes.id, mailbox.id));

  return { success: true };
}
