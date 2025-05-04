import { isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { websiteCrawls, websites } from "@/db/schema";
import { inngest } from "@/inngest/client";

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

    await inngest.send({
      name: "websites/crawl.create",
      data: {
        websiteId: website.id,
        crawlId: crawl[0].id,
      },
    });
  }
};

export default inngest.createFunction(
  { id: "scheduled-website-crawl" },
  { cron: "0 0 * * 0" }, // Run at midnight every Sunday
  async ({ step }) => {
    await step.run("trigger-website-crawls", async (): Promise<void> => {
      await scheduledWebsiteCrawl();
    });

    return { success: true };
  },
);
