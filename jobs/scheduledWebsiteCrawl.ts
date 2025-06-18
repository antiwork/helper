import { isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { websiteCrawls, websites } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";

export const scheduledWebsiteCrawl = async (): Promise<void> => {
  const websitesToCrawl = await db.query.websites.findMany({
    where: isNull(websites.deletedAt),
  });

  for (const website of websitesToCrawl) {
    const crawl = await db
      .insert(websiteCrawls)
      .values({
        websiteId: website.id,
        name: `Weekly crawl for ${website.name}`,
        status: "pending",
        startedAt: new Date(),
      })
      .returning();

    if (!crawl[0]) {
      throw new Error("Failed to create crawl record");
    }

    await triggerEvent("websites/crawl.create", {
      websiteId: website.id,
      crawlId: crawl[0].id,
    });
  }
};
