import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema";

export const jobRunFactory = {
  create: async (overrides: Partial<typeof jobRuns.$inferInsert> = {}) => {
    const jobRun = await db
      .insert(jobRuns)
      .values({
        job: faker.lorem.word(),
        data: {},
        status: "success",
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return { jobRun };
  },
};
