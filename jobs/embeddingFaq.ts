import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { generateEmbedding } from "@/lib/ai";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

export const embeddingFaq = async ({ faqId }: { faqId: number }): Promise<void> => {
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
