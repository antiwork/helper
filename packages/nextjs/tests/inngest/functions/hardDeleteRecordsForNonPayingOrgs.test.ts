import { Organization } from "@clerk/nextjs/server";
import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { messageNotificationFactory } from "@tests/support/factories/messageNotifications";
import { noteFactory } from "@tests/support/factories/notes";
import { platformCustomerFactory } from "@tests/support/factories/platformCustomers";
import { subscriptionFactory } from "@tests/support/factories/subscriptions";
import { userFactory } from "@tests/support/factories/users";
import { subDays } from "date-fns";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversations, files, mailboxes, messageNotifications, notes } from "@/db/schema";
import { conversationMessages } from "@/db/schema/conversationMessages";
import { hardDeleteRecordsForNonPayingOrgs } from "@/inngest/functions/hardDeleteRecordsForNonPayingOrgs";
import { FREE_TRIAL_PERIOD_DAYS } from "@/lib/auth/account";
import { getClerkOrganization } from "@/lib/data/organization";

vi.mock("@/lib/data/organization", async () => {
  const actual = await vi.importActual("@/lib/data/organization");
  return {
    ...actual,
    getClerkOrganization: vi.fn(),
  };
});

const createEligibleOrganizationForConversationDeletion = async () => {
  const { user, mailbox, organization } = await userFactory.createRootUser({
    organizationOverrides: {
      privateMetadata: {
        freeTrialEndsAt: subDays(new Date(), 32).toISOString(),
      },
    },
    mailboxOverrides: {
      createdAt: subDays(new Date(), FREE_TRIAL_PERIOD_DAYS + 32),
    },
  });

  const { conversation } = await conversationFactory.create(mailbox.id);
  const { message } = await conversationMessagesFactory.create(conversation.id);
  const { note } = await noteFactory.create(conversation.id);
  const { file } = await fileFactory.create(message.id);
  const { platformCustomer } = await platformCustomerFactory.create(mailbox.id);
  const { messageNotification } = await messageNotificationFactory.create(
    message.id,
    conversation.id,
    platformCustomer.id,
  );

  return {
    user,
    mailbox,
    organization,
    conversation,
    message,
    note,
    file,
    messageNotification,
  };
};

const exists = async (table: any, id: number) => {
  const [result] = await db.select().from(table).where(eq(table.id, id));
  return !!result;
};

describe("hardDeleteRecordsForNonPayingOrgs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ignores organizations with a subscription record", async () => {
    const { mailbox, organization, conversation, message, note, file } =
      await createEligibleOrganizationForConversationDeletion();
    await subscriptionFactory.create(organization.id);

    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    await hardDeleteRecordsForNonPayingOrgs();

    expect(await exists(mailboxes, mailbox.id)).toBe(true);
    expect(await exists(conversations, conversation.id)).toBe(true);
    expect(await exists(conversationMessages, message.id)).toBe(true);
    expect(await exists(notes, note.id)).toBe(true);
    expect(await exists(files, file.id)).toBe(true);
  });

  it("ignores organizations whose free trial has not ended more than 30 days ago", async () => {
    const { mailbox, organization, conversation, message, note, file } =
      await createEligibleOrganizationForConversationDeletion();

    vi.mocked(getClerkOrganization).mockResolvedValue({
      // eslint-disable-next-line @typescript-eslint/no-misused-spread
      ...organization,
      privateMetadata: {
        freeTrialEndsAt: subDays(new Date(), 29).toISOString(),
      },
    } as Organization);

    await hardDeleteRecordsForNonPayingOrgs();

    expect(await exists(mailboxes, mailbox.id)).toBe(true);
    expect(await exists(conversations, conversation.id)).toBe(true);
    expect(await exists(conversationMessages, message.id)).toBe(true);
    expect(await exists(notes, note.id)).toBe(true);
    expect(await exists(files, file.id)).toBe(true);
  });

  it(
    "hard deletes records associated to conversations/messages for eligible organizations",
    {
      timeout: 10000,
    },
    async () => {
      const { mailbox, organization, conversation, message, note, file, messageNotification } =
        await createEligibleOrganizationForConversationDeletion();

      vi.mocked(getClerkOrganization).mockResolvedValue(organization);

      const { mailbox: secondMailbox } = await mailboxFactory.create(organization.id, {
        createdAt: subDays(new Date(), FREE_TRIAL_PERIOD_DAYS + 32),
      });
      const { conversation: secondMailboxConversation } = await conversationFactory.create(secondMailbox.id);
      const { message: secondMailboxMessage } = await conversationMessagesFactory.create(secondMailboxConversation.id);

      // Assert that queries are properly scoped and do not hard delete unwanted records
      // by creating a different organization ineligible for deletion
      const ineligibleOrganizationRecords = await createEligibleOrganizationForConversationDeletion();
      await subscriptionFactory.create(ineligibleOrganizationRecords.organization.id);

      await hardDeleteRecordsForNonPayingOrgs();

      expect(await exists(mailboxes, mailbox.id)).toBe(true);
      expect(await exists(mailboxes, secondMailbox.id)).toBe(true);

      expect(await exists(conversations, secondMailboxConversation.id)).toBe(false);
      expect(await exists(conversationMessages, secondMailboxMessage.id)).toBe(false);
      expect(await exists(conversations, conversation.id)).toBe(false);
      expect(await exists(conversationMessages, message.id)).toBe(false);
      expect(await exists(notes, note.id)).toBe(false);
      expect(await exists(messageNotifications, messageNotification.id)).toBe(false);

      const updatedFile = await db.query.files
        .findFirst({
          where: eq(files.id, file.id),
        })
        .then(assertDefined);
      expect(updatedFile?.messageId).toBeNull();

      expect(await exists(mailboxes, ineligibleOrganizationRecords.mailbox.id)).toBe(true);
      expect(await exists(conversations, ineligibleOrganizationRecords.conversation.id)).toBe(true);
      expect(await exists(conversationMessages, ineligibleOrganizationRecords.message.id)).toBe(true);
      expect(await exists(conversations, ineligibleOrganizationRecords.conversation.id)).toBe(true);
      expect(await exists(conversationMessages, ineligibleOrganizationRecords.message.id)).toBe(true);
      expect(await exists(notes, ineligibleOrganizationRecords.note.id)).toBe(true);
    },
  );
});
