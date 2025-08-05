import { faker } from "@faker-js/faker";
import { htmlToText } from "html-to-text";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";

export const conversationMessagesFactory = {
  create: async (conversationId: number, overrides: Partial<typeof conversationMessages.$inferInsert> = {}) => {
    const body = faker.lorem.paragraph();
    const cleanedUpText = faker.lorem.sentence();

    const message = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        body,
        cleanedUpText,
        role: "user",
        status: "sent",
        emailFrom: faker.internet.email(),
        emailTo: null,
        emailCc: [],
        emailBcc: [],
        isPinned: false,
        isPerfect: false,
        isFlaggedAsBad: false,
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { message };
  },
  createDraft: async (
    conversationId: number,
    responseToId: number,
    overrides: Partial<typeof conversationMessages.$inferInsert> = {},
  ) => {
    const body = faker.lorem.paragraph();
    const cleanedUpText = htmlToText(body);

    const message = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        responseToId,
        body,
        cleanedUpText,
        role: "ai_assistant",
        status: "draft",
        emailCc: [],
        emailBcc: [],
        isPinned: false,
        isPerfect: false,
        isFlaggedAsBad: false,
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { message };
  },
  createEnqueued: async (conversationId: number, overrides: Partial<typeof conversationMessages.$inferInsert> = {}) => {
    const message = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        role: "staff",
        status: "queueing",
        isPerfect: false,
        isFlaggedAsBad: false,
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { message };
  },
};
