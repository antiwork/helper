import { TRPCRouterRecord } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { websiteCrawls, websitePages, websites } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { assertDefined } from "../../../components/utils/assert";
import { mailboxProcedure } from "./procedure";

const fetchPageTitle = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Helper Website Crawler" },
    });
    const html = await response.text();

    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    return titleMatch?.[1] ? titleMatch[1].trim() : new URL(url).hostname;
  } catch (error) {
    captureExceptionAndLog(error);
    return new URL(url).hostname;
  }
};

export const websitesRouter = {
  list: mailboxProcedure.query(async () => {
    const websitesList = await db.query.websites.findMany({
      where: isNull(websites.deletedAt),
      orderBy: [asc(websites.createdAt)],
      with: {
        crawls: {
          limit: 1,
          orderBy: desc(websiteCrawls.createdAt),
        },
      },
    });

    const websiteIds = websitesList.map((w) => w.id);

    const pageCounts =
      websiteIds.length > 0
        ? await db
            .select({
              websiteId: websitePages.websiteId,
              count: sql<number>`count(*)::int`,
            })
            .from(websitePages)
            .where(and(inArray(websitePages.websiteId, websiteIds), isNull(websitePages.deletedAt)))
            .groupBy(websitePages.websiteId)
        : [];

    return websitesList.map((website) => ({
      ...website,
      latestCrawl: website.crawls[0],
      pagesCount: pageCounts.find((c) => c.websiteId === website.id)?.count ?? 0,
    }));
  }),

  create: mailboxProcedure
    .input(
      z.object({
        url: z.string().url(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const urlWithProtocol = /^https?:\/\//i.test(input.url) ? input.url : `https://${input.url}`;

      const name = input.name || (await fetchPageTitle(urlWithProtocol));

      const website = await db
        .insert(websites)
        .values({
          name,
          url: urlWithProtocol,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      // Trigger initial crawl
      const crawl = await db
        .insert(websiteCrawls)
        .values({
          websiteId: website.id,
          name: `Initial crawl for ${website.name}`,
          status: "pending",
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      await triggerEvent("websites/crawl.create", {
        websiteId: website.id,
        crawlId: crawl.id,
      });

      return website;
    }),

  delete: mailboxProcedure
    .input(
      z.object({
        websiteId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const now = new Date();

      await db
        .update(websitePages)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(websitePages.websiteId, input.websiteId));

      await db
        .update(websites)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(websites.id, input.websiteId));

      return { success: true };
    }),

  triggerCrawl: mailboxProcedure
    .input(
      z.object({
        websiteId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const website = assertDefined(
        await db.query.websites.findFirst({
          where: eq(websites.id, input.websiteId),
        }),
      );

      const existingCrawl = await db.query.websiteCrawls.findFirst({
        where: and(eq(websiteCrawls.websiteId, website.id), eq(websiteCrawls.status, "loading")),
      });

      if (existingCrawl) {
        throw new Error("A crawl is already in progress");
      }

      const crawl = await db
        .insert(websiteCrawls)
        .values({
          websiteId: website.id,
          name: `Manual crawl for ${website.name}`,
          status: "pending",
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      await triggerEvent("websites/crawl.create", {
        websiteId: website.id,
        crawlId: crawl.id,
      });

      return crawl;
    }),

  pages: mailboxProcedure.query(async () => {
    const pages = await db
      .select({
        url: websitePages.url,
        title: websitePages.pageTitle,
      })
      .from(websitePages)
      .innerJoin(websites, eq(websites.id, websitePages.websiteId))
      .where(and(isNull(websites.deletedAt), isNull(websitePages.deletedAt)))
      .orderBy(asc(websitePages.pageTitle));

    return pages;
  }),
} satisfies TRPCRouterRecord;
