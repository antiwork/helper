import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { clientTools } from "@/db/schema";

type ClientTool = typeof clientTools.$inferInsert;

export const clientToolsFactory = {
  create: async (overrides: Partial<ClientTool>) => {
    const defaultTool: ClientTool = {
      tool_name: faker.company.name(),
      tool: {
        description: faker.lorem.sentence(),
        serverRequestUrl: faker.internet.url(),
        parameters: {},
      },
      customer_email: null
    };

    const toolData = { ...defaultTool, ...overrides };

    const tool = await db.insert(clientTools).values(toolData).returning().then(takeUniqueOrThrow);

    return { tool };
  },
};
