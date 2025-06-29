import FirecrawlApp from "@mendable/firecrawl-js";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { websiteCrawls, websites } from "@/db/schema";
import { env } from "@/lib/env";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

const PAGE_LIMIT = 150;
const firecrawl = env.FIRECRAWL_API_KEY ? new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY }) : null;

export const crawlWebsite = async ({ websiteId, crawlId }: { websiteId: number; crawlId: number }): Promise<void> => {
  if (!firecrawl) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }

  const website = assertDefinedOrRaiseNonRetriableError(
    await db.query.websites.findFirst({
      where: eq(websites.id, websiteId),
    }),
  );

  try {
    const crawlIdentifier = crypto.randomUUID();
    const webhookUrl = new URL("/api/webhooks/firecrawl", env.AUTH_URL);
    webhookUrl.searchParams.set("identifier", crawlIdentifier);

    await db
      .update(websiteCrawls)
      .set({
        status: "pending",
        metadata: {
          crawlIdentifier,
        },
      })
      .where(eq(websiteCrawls.id, crawlId));

    await firecrawl.asyncCrawlUrl(website.url, {
      limit: PAGE_LIMIT,
      scrapeOptions: {
        formats: ["markdown", "html"],
        onlyMainContent: true,
      },
      webhook: webhookUrl.toString(),
    });
  } catch (error) {
    await db
      .update(websiteCrawls)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(websiteCrawls.id, crawlId));

    throw error;
  }
};
