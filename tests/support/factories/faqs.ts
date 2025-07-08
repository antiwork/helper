import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";

export const faqsFactory = {
  create: async (overrides: Partial<typeof faqs.$inferInsert> = {}) => {
    const defaultValues = {
      content: faker.lorem.paragraph(),
    };

    const values = { ...defaultValues, ...overrides };
    const faq = await db.insert(faqs).values(values).returning().then(takeUniqueOrThrow);

    return { faq };
  },
};
