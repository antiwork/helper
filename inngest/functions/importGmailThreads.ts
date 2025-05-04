import { addDays, differenceInWeeks } from "date-fns";
import { eq } from "drizzle-orm";
import { chunk } from "lodash-es";
import { db } from "@/db/client";
import { gmailSupportEmails } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { createConversationEmbedding, PromptTooLongError } from "@/lib/ai/conversationEmbedding";
import { getGmailService, listGmailThreads } from "@/lib/gmail/client";
import { captureExceptionAndLogIfDevelopment, captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";
import { assertSuccessResponseOrThrow } from "./handleGmailWebhookEvent";
import { excludeExistingGmailThreads, processGmailThreadWithClient } from "./importRecentGmailThreads";

// Hard limit to avoid accidentally importing too many emails
const MAX_WEEKS = 52;
const GMAIL_THREAD_CONCURRENCY_LIMIT = 20;

export default inngest.createFunction(
  {
    id: "import-gmail-threads",
    // If a step fails, it's likely due to an issue on our end (instead of a temporary network/database issue)
    // so we should short-circuit and look to fix the issue
    retries: 0,
    concurrency: 1,
  },
  { event: "gmail/import-gmail-threads" },
  async ({ event, step }) => {
    const {
      data: { gmailSupportEmailId, fromInclusive, toInclusive },
    } = event;
    const fromInclusiveDate = new Date(fromInclusive);
    const toInclusiveDate = new Date(toInclusive);
    const weekStartDates = generateStartDates(fromInclusiveDate, toInclusiveDate);

    const steps = weekStartDates.map((date) => {
      return step.run(`import-${date.toISOString()}`, async () => {
        return await processGmailThreads(gmailSupportEmailId, date, toInclusiveDate);
      });
    });

    await Promise.all(steps);
  },
);

export const processGmailThreads = async (gmailSupportEmailId: number, weekStartDate: Date, toInclusiveDate: Date) => {
  const gmailSupportEmail = await db.query.gmailSupportEmails
    .findFirst({
      where: eq(gmailSupportEmails.id, gmailSupportEmailId),
    })
    .then(assertDefinedOrRaiseNonRetriableError);
  const client = await getGmailService(gmailSupportEmail);

  const before = new Date(Math.min(addDays(weekStartDate, 7).getTime(), toInclusiveDate.getTime()));

  const weekStartSeconds = Math.floor(weekStartDate.getTime() / 1000);
  const beforeSeconds = Math.floor(addDays(before, 1).getTime() / 1000);

  const result = await listGmailThreads(client, {
    maxResults: 500,
    // `after` is inclusive, `before` is exclusive
    q: `after:${weekStartSeconds} before:${beforeSeconds}`,
    includeSpamTrash: false,
  });
  assertSuccessResponseOrThrow(result);
  if (result.data.nextPageToken) {
    captureExceptionAndLogIfDevelopment(new Error("Pagination not supported by this function"));
  }
  const threads = await excludeExistingGmailThreads(gmailSupportEmailId, result.data.threads ?? []);

  for (const threadChunk of chunk(threads, GMAIL_THREAD_CONCURRENCY_LIMIT)) {
    await Promise.all(
      threadChunk.map(async (thread) => {
        try {
          const result = await processGmailThreadWithClient(
            client,
            gmailSupportEmail,
            assertDefinedOrRaiseNonRetriableError(thread.id),
            { status: "closed" },
          );
          if (result.conversationId) {
            // This takes up the bulk of the step execution.
            await createConversationEmbedding(result.conversationId);
          }
        } catch (e) {
          if (e instanceof PromptTooLongError) return;
          captureExceptionAndThrowIfDevelopment(e);
        }
      }),
    );
  }
  return { threads: threads.map((t) => t.id), weekStartDate, toInclusiveDate };
};

/**
 * Generates an array of dates, each representing the start
 * of a 7-day period between [startDate, endDate].
 *
 * Example output: (startDate is 2023-01-01, endDate is 2023-01-22)
 *
 * [
 *   2023-01-01T00:00:00.000Z,
 *   2023-01-08T00:00:00.000Z,
 *   2023-01-15T00:00:00.000Z
 * ]
 */
export const generateStartDates = (fromInclusiveDate: Date, toInclusiveDate: Date) => {
  if (fromInclusiveDate.getTime() === toInclusiveDate.getTime()) {
    return [fromInclusiveDate];
  }

  const weekCount = Math.min(MAX_WEEKS, differenceInWeeks(toInclusiveDate, fromInclusiveDate) + 1);

  const weekStartDates = Array.from({ length: weekCount }, (_, i) => i)
    .map((i) => addDays(fromInclusiveDate, i * 7))
    .filter((date) => date.getTime() <= toInclusiveDate.getTime());

  return weekStartDates;
};
