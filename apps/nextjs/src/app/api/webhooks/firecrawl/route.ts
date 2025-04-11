import { and, eq, isNull, not } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { CrawlMetadata, websiteCrawls, websitePages } from "@/db/schema";
import { generateEmbedding } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const crawlIdentifier = searchParams.get("identifier");
  const { type, id: firecrawlJobId, data, success, error } = body;

  // eslint-disable-next-line no-console
  console.log(`Processing webhook (${type} - ${firecrawlJobId}) for crawl ${crawlIdentifier}`);

  const crawl = assertDefined(
    await db.query.websiteCrawls.findFirst({
      where: (crawls, { sql }) => sql`${crawls.metadata}->>'crawlIdentifier' = ${crawlIdentifier}`,
    }),
  );

  const crawlMetadata = crawl.metadata!;

  switch (type) {
    case "crawl.started":
      await db
        .update(websiteCrawls)
        .set({ status: "loading", startedAt: new Date() })
        .where(eq(websiteCrawls.id, crawl.id));
      break;

    case "crawl.page":
      if (success && data?.[0]) {
        const page = data[0];
        if (!page.markdown || !page.html) break;

        const embedding = await generateEmbedding(page.markdown, "embedding-website-page", {
          skipCache: true,
        });

        await db.insert(websitePages).values({
          websiteId: crawl.websiteId,
          websiteCrawlId: crawl.id,
          url: page.metadata?.sourceURL ?? page.url,
          rawHtml: page.html,
          markdown: page.markdown,
          pageTitle: page.metadata?.title ?? "",
          metadata: page.metadata ?? {},
          embedding,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      break;

    case "crawl.completed":
      await db
        .update(websitePages)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(websitePages.websiteId, crawl.websiteId),
            not(eq(websitePages.websiteCrawlId, crawl.id)),
            isNull(websitePages.deletedAt),
          ),
        );

      const updatedMetadata: CrawlMetadata = {
        firecrawlJobId,
        pageCount: data?.length ?? 0,
        creditsUsed: body.creditsUsed,
        ...crawlMetadata,
      };

      await db
        .update(websiteCrawls)
        .set({
          status: "completed",
          completedAt: new Date(),
          metadata: updatedMetadata,
        })
        .where(eq(websiteCrawls.id, crawl.id));
      break;

    case "crawl.failed":
      await db
        .update(websiteCrawls)
        .set({
          status: "failed",
          completedAt: new Date(),
          errorMessage: error ?? "Unknown error",
        })
        .where(eq(websiteCrawls.id, crawl.id));
      break;
  }

  return new Response("OK");
}
