import { subWeeks } from "date-fns";
import { lte } from "drizzle-orm";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema/jobRuns";

export const cleanupOldJobRuns = async () => {
  const twoWeeksAgo = subWeeks(new Date(), 2);

  const deleted = await db.delete(jobRuns).where(lte(jobRuns.createdAt, twoWeeksAgo)).returning({ id: jobRuns.id });

  return { deletedCount: deleted.length };
};
