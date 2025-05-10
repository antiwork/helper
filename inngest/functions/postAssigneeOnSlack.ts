import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { AssignEvent, inngest } from "@/inngest/client";
import { getClerkUser } from "@/lib/data/user";
import { postSlackDM, postSlackMessage } from "@/lib/slack/client";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

export const notifySlackAssignment = async (conversationId: number, assignEvent: AssignEvent) => {
  return "Assignment notifications disabled";
};

export default inngest.createFunction(
  { id: "post-assignee-to-slack" },
  { event: "conversations/assigned" },
  async ({ event, step }) => {
    const {
      data: { conversationId },
    } = event;

    await step.run("handle", async () => {
      return await notifySlackAssignment(conversationId, event.data.assignEvent);
    });
  },
);
