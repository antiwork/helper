import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { clientTools } from "@/db/schema";

type ClientTool = typeof clientTools.$inferInsert;

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

    const tool = await db.insert(clientTools).values(toolData).returning().then(takeUniqueOrThrow);

    return { tool };
  },
};
