import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { generateEmbedding } from "@/lib/ai";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

const CONCURRENCY_LIMIT = 10;

export const embeddingFaq = async (faqId: number): Promise<void> => {
  const faq = assertDefinedOrRaiseNonRetriableError(
    await db.query.faqs.findFirst({
      where: eq(faqs.id, faqId),
    }),
  );

  const embedding = await generateEmbedding(faq.content, "embedding-faq", { skipCache: true });

  await db
    .update(faqs)
    .set({
      embedding,
    })
    .where(eq(faqs.id, faqId));
};

export default inngest.createFunction(
  { id: "embedding-faq", concurrency: CONCURRENCY_LIMIT, retries: 1 },
  { event: "faqs/embedding.create" },
  async ({ event, step }) => {
    const { faqId } = event.data;

    await step.run("create-embedding", async (): Promise<void> => {
      await embeddingFaq(faqId);
    });

    return { success: true };
  },
);
