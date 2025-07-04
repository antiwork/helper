import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { tools } from "@/db/schema";
import { ToolAuthenticationMethod, ToolRequestMethod } from "@/db/schema/tools";

type Tool = typeof tools.$inferInsert;

export const toolsFactory = {
  create: async (overrides: Partial<Tool>) => {
    const defaultTool = {
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      slug: faker.helpers.slugify(faker.company.name().toLowerCase()),
      url: faker.internet.url(),
      requestMethod: "POST" as ToolRequestMethod,
      headers: {},
      parameters: [],
      authenticationMethod: "bearer_token" as ToolAuthenticationMethod,
      authenticationToken: faker.string.alphanumeric(32),
    };

    const toolData = { ...defaultTool, ...overrides };

    const tool = await db.insert(tools).values(toolData).returning().then(takeUniqueOrThrow);

    return { tool };
  },
};
