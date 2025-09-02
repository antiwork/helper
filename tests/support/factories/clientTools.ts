import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { storedTools } from "@/db/schema";

type ClientTool = typeof storedTools.$inferInsert;

export const clientToolsFactory = {
  create: async (overrides: Partial<ClientTool>) => {
    const defaultTool: ClientTool = {
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      serverRequestUrl: faker.internet.url(),
      parameters: [],
      customerEmail: null,
    };

    const toolData = { ...defaultTool, ...overrides };

    const tool = await db.insert(storedTools).values(toolData).returning().then(takeUniqueOrThrow);

    return { tool };
  },
};
