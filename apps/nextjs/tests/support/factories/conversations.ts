import { faker } from "@faker-js/faker";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { generateSlug } from "@/lib/shared/slug";

export const conversationFactory = {
  create: async (mailboxId: number, overrides: Partial<typeof conversations.$inferInsert> = {}) => {
    const subject = overrides.subject || faker.lorem.sentence();

    const [conversation] = await db
      .insert(conversations)
      .values({
        mailboxId,
        emailFrom: faker.internet.email(),
        emailFromName: faker.person.fullName(),
        subject,
        status: "open",
        slug: generateSlug(),
        conversationProvider: "gmail",
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        lastUserEmailCreatedAt: faker.date.recent(),
        isPrompt: false,
        isVisitor: false,
        assignedToAI: false,
        ...overrides,
      })
      .returning();

    if (!conversation) {
      throw new Error("Conversation not created");
    }

    return { conversation };
  },
  createStaffEmail: async (
    conversationId: number,
    clerkUserId: string,
    overrides: Partial<typeof conversationMessages.$inferInsert> = {},
  ) => {
    const [message] = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        clerkUserId,
        body: faker.lorem.paragraph(),
        role: "staff",
        status: "sent",
        isPinned: false,
        isFlaggedAsBad: false,
        isPerfect: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
      .returning();
    return assertDefined(message);
  },
  createUserEmail: async (
    conversationId: number,
    overrides: Partial<typeof conversationMessages.$inferInsert> = {},
  ) => {
    const [message] = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        body: faker.lorem.paragraph(),
        emailFrom: faker.internet.email(),
        role: "user",
        status: "sent",
        isPinned: false,
        isFlaggedAsBad: false,
        isPerfect: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
      .returning();
    return assertDefined(message);
  },
};
