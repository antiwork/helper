import fs, { existsSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { faker } from "@faker-js/faker";
import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { faqsFactory } from "@tests/support/factories/faqs";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { styleLinterFactory } from "@tests/support/factories/styleLinters";
import { toolsFactory } from "@tests/support/factories/tools";
import { userFactory } from "@tests/support/factories/users";
import { addDays, addHours, subDays, subHours } from "date-fns";
import { and, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { htmlToText } from "html-to-text";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { env } from "@/env";
import { indexMessage } from "@/inngest/functions/indexConversation";
import { getClerkUser } from "@/lib/data/user";
import {
  conversationMessages,
  conversations,
  conversationsTopics,
  mailboxes,
  mailboxesMetadataApi,
  topics,
} from "../schema";

const getTables = async () => {
  const result = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  return result.map((row) => row.table_name as string);
};

const checkIfAllTablesAreEmpty = async () => {
  const isEmpty = async (tableName: string) => {
    const result = await db.execute(sql`
    SELECT EXISTS (SELECT 1 FROM ${sql.identifier(tableName)} LIMIT 1)
  `);
    return !result[0]?.exists;
  };

  const tables = await getTables();
  for (const table of tables) {
    if (!(await isEmpty(table))) {
      return false;
    }
  }
  return true;
};

const INITIAL_ORGANIZATION_ID = env.CLERK_INITIAL_ORGANIZATION_ID;
const INITIAL_USER_IDS = env.CLERK_INITIAL_USER_IDS?.split(",") ?? [];

export const seedDatabase = async () => {
  if (!INITIAL_ORGANIZATION_ID || !INITIAL_USER_IDS) {
    throw new Error("CLERK_INITIAL_ORGANIZATION_ID and CLERK_INITIAL_USER_IDS must be set for seeds to run.");
  }

  if (await checkIfAllTablesAreEmpty()) {
    console.log("All tables are empty. Starting seed process...");
    const {
      organization,
      mailbox,
      user: rootUser,
    } = await userFactory.createRootUser({
      userOverrides: {
        id: INITIAL_USER_IDS[0],
      },
      organizationOverrides: {
        id: INITIAL_ORGANIZATION_ID,
      },
      mailboxOverrides: {
        name: "Gumroad",
        slug: "gumroad",
        responseGeneratorPrompt: ["You are a helpful customer support assistant."],
        promptUpdatedAt: addDays(new Date(), 1),
        widgetHMACSecret: "9cff9d28-7333-4e29-8f01-c2945f1a887f",
      },
    });

    const users = await Promise.all(INITIAL_USER_IDS.map(async (userId) => await getClerkUser(userId)!));

    await createSettingsPageRecords(mailbox);

    const { mailbox: mailbox2 } = await mailboxFactory.create(organization.id, {
      name: "Flexile",
      slug: "flexile",
    });

    const { mailbox: mailbox3 } = await mailboxFactory.create(organization.id, {
      name: "Helper",
      slug: "helper",
    });

    await generateSeedsFromFixtures(mailbox.id);
    await generateSeedsFromFixtures(mailbox2.id);
    await generateSeedsFromFixtures(mailbox3.id);
    const conversationRecords = await db.select().from(conversations);
    for (const conversation of conversationRecords) {
      if (conversation.emailFrom) {
        try {
          await platformCustomerFactory.create(mailbox.id, { email: conversation.emailFrom });
        } catch (e) {}
      }

      const lastUserMessage = await db.query.conversationMessages.findFirst({
        where: and(eq(conversationMessages.conversationId, conversation.id), eq(conversationMessages.role, "staff")),
        orderBy: desc(conversationMessages.createdAt),
      });
      if (lastUserMessage) await conversationMessagesFactory.createDraft(conversation.id, lastUserMessage.id);
      if (conversation.id % 2 === 0) {
        await db
          .update(conversations)
          .set({ assignedToClerkId: assertDefined(users[Math.floor(Math.random() * users.length)]).id })
          .where(eq(conversations.id, conversation.id));
      }

      const staffMessages = await db.query.conversationMessages.findMany({
        where: and(eq(conversationMessages.conversationId, conversation.id), eq(conversationMessages.role, "staff")),
      });
      const messagePromises = staffMessages.map(async (message, index) => {
        if (index % 2 === 0) {
          await db
            .update(conversationMessages)
            .set({ clerkUserId: assertDefined(users[(index / 2) % users.length]).id })
            .where(eq(conversationMessages.id, message.id));
        }
      });
      await Promise.all(messagePromises);

      const nonDraftMessages = await db.query.conversationMessages.findMany({
        where: and(
          eq(conversationMessages.conversationId, conversation.id),
          isNull(conversationMessages.deletedAt),
          ne(conversationMessages.role, "ai_assistant"),
        ),
      });
      console.log(`Indexing ${nonDraftMessages.length} messages for conversation ${conversation.id}`);
      await Promise.all(
        nonDraftMessages.map(async (message) => {
          await indexMessage(message.id);
          console.log(`Indexed message ${message.id}`);
        }),
      );
    }

    // Optionally create this file to do any additional seeding, e.g. setting up integrations with local credentials
    if (existsSync(path.join(__dirname, "localSeeds.ts"))) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - localSeeds.ts is optional
      await import("./localSeeds").then((module: any) => module.default());
    }
    console.log("Seed done");
  } else {
    console.log("Some tables already contain data. Skipping seed process...");
  }
};

type ConversationDetail = {
  subject: string;
  emailFrom: string;
  status: "open" | "closed" | "spam" | null;
  emailFromName: string;
  conversationProvider: "gmail" | "helpscout" | "chat" | null;
  isClosed: boolean;
};

type MessageDetail = {
  id: number;
  role: "user" | "staff";
  body: string;
  emailTo: string | null;
  emailFrom: string | null;
  emailCc: string[] | null;
  emailBcc: string[] | null;
  metadata: Record<string, string> | null;
  status: "queueing" | "sent" | "failed" | "draft" | "discarded" | null;
};

type Fixtures = Record<
  string, // mailboxId
  Record<
    string, // conversationId
    {
      messages: MessageDetail[];
      conversation: ConversationDetail;
    }
  >
>;

const fixturesPath = path.join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const fixtureData = fs.readdirSync(fixturesPath).reduce<Fixtures>((acc, file) => {
  const content = JSON.parse(fs.readFileSync(path.join(fixturesPath, file), "utf8")) as Fixtures;
  const [mailboxId, conversations] = Object.entries(content)[0]!;
  return {
    ...acc,
    [mailboxId]: {
      ...(acc[mailboxId] ?? {}),
      ...conversations,
    },
  };
}, {});

const generateSeedsFromFixtures = async (mailboxId: number) => {
  const fixtures = Object.entries(assertDefined(fixtureData[mailboxId]));
  const topicMap = new Map<typeof topics.$inferSelect, (typeof topics.$inferSelect)[]>();
  const createTopic = async (name: string, subtopicNames: string[]) => {
    const topic = await db.insert(topics).values({ name, mailboxId }).returning().then(takeUniqueOrThrow);
    const subtopics = await Promise.all(
      subtopicNames.map(async (name) => {
        const subTopic = await db
          .insert(topics)
          .values({ name, parentId: topic.id, mailboxId })
          .returning()
          .then(takeUniqueOrThrow);
        return subTopic;
      }),
    );
    topicMap.set(topic, subtopics);
  };
  await Promise.all([
    createTopic("Account Access", ["Login Issues", "Account Suspension", "Password Reset"]),
    createTopic("Product Access", ["Download Issues", "Content Availability", "Purchase Recovery"]),
    createTopic("Billing", ["Refunds", "Payment Issues", "Invoices"]),
    createTopic("Creator Support", ["Product Questions", "Technical Issues", "Content Guidelines"]),
    createTopic("Platform Issues", ["Website Problems", "App Issues", "Integration Problems"]),
  ]);

  await Promise.all(
    fixtures
      .sort(([keyA], [keyB]) => parseInt(keyA) - parseInt(keyB))
      .map(async ([, fixture], fixtureIndex) => {
        const lastUserEmailCreatedAt = subHours(new Date(), (fixtures.length - fixtureIndex) * 8);
        const { conversation } = await conversationFactory.create(mailboxId, {
          ...fixture.conversation,
          lastUserEmailCreatedAt,
          closedAt: fixture.conversation.isClosed ? addHours(lastUserEmailCreatedAt, 8) : null,
          createdAt: subDays(lastUserEmailCreatedAt, fixture.messages.length - 1),
        });

        for (const [idx, message] of fixture.messages.toSorted((a, b) => a.id - b.id).entries()) {
          const createdAt = subDays(lastUserEmailCreatedAt, fixture.messages.length - idx);
          await conversationMessagesFactory.create(conversation.id, {
            role: message.role,
            body: message.body,
            cleanedUpText: htmlToText(message.body),
            emailTo: message.emailTo,
            emailFrom: message.emailFrom,
            emailCc: message.emailCc,
            emailBcc: message.emailBcc,
            metadata: message.metadata,
            status: message.status,
            createdAt,
            ...(message.role === "staff" && fixtureIndex % 2 === 0
              ? {
                  reactionCreatedAt: addHours(createdAt, 1),
                  reactionType: fixtureIndex % 4 === 0 ? "thumbs-up" : "thumbs-down",
                  reactionFeedback: faker.lorem.sentence(),
                }
              : {}),
          });
        }

        const topic = [...topicMap.keys()][fixtureIndex % topicMap.size]!;
        const subTopic = [...topicMap.get(topic)!][fixtureIndex % topicMap.get(topic)!.length]!;
        await db.insert(conversationsTopics).values({
          conversationId: conversation.id,
          topicId: topic.id,
          subTopicId: subTopic.id,
          mailboxId,
          createdAt: conversation.createdAt,
        });
      }),
  );
};

const createSettingsPageRecords = async (mailbox: typeof mailboxes.$inferSelect) => {
  const gumroadDevToken = "36a9bb0b88ad771ead2ada56a9be84e4";

  await toolsFactory.create({
    mailboxId: mailbox.id,
    name: "Send reset password",
    description: "Send reset password email to the user",
    slug: "reset_password",
    requestMethod: "POST",
    url: "http://app.gumroad.dev/internal/helper/users/send_reset_password_instructions",
    parameters: [
      {
        in: "body",
        name: "email",
        type: "string",
        required: true,
      },
    ],
    authenticationMethod: "bearer_token",
    authenticationToken: gumroadDevToken,
  });

  await toolsFactory.create({
    mailboxId: mailbox.id,
    name: "Resend last receipt",
    description: "Resend the last receipt email to the user",
    slug: "resend_last_receipt",
    requestMethod: "POST",
    url: "http://app.gumroad.dev/internal/helper/purchases/resend_last_receipt",
    parameters: [
      {
        in: "body",
        name: "email",
        type: "string",
        required: true,
      },
    ],
    authenticationMethod: "bearer_token",
    authenticationToken: gumroadDevToken,
  });

  await faqsFactory.create(mailbox.id, {
    content: "Deleting your account can be done from Settings > Account > Delete Account.",
  });

  await styleLinterFactory.create(mailbox.clerkOrganizationId, {
    before:
      "Hello, Great question! When you unpublish a product on Gumroad, it simply removes the product from the public view and the Gumroad marketplace. However, customers who have already purchased the product will still be able to access their files. They can do this through the download link in their email receipt or from their Gumroad library if they created an account at the time of purchase. So, to answer your question, yes, your customers will still be able to read and open the ebook from their email even if you unpublish it. Let me know if you have any other questions!",
    after:
      "Hello, Yes, your customers will still be able to read and open the ebook from their email even if you unpublish it. Let me know if you have any other questions!",
  });

  await db
    .insert(mailboxesMetadataApi)
    .values({
      mailboxId: mailbox.id,
      url: faker.internet.url(),
      isEnabled: true,
      hmacSecret: crypto.randomUUID().replace(/-/g, ""),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    })
    .returning()
    .then(takeUniqueOrThrow);
};
