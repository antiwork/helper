import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db, Transaction } from "@/db/client";
import { gmailSupportEmails, mailboxes } from "@/db/schema";
import "server-only";
import { takeUniqueOrThrow } from "@/components/utils/arrays";

export const getGmailSupportEmail = async (
  mailbox: typeof mailboxes.$inferSelect,
): Promise<typeof gmailSupportEmails.$inferSelect | null> => {
  if (!mailbox.gmailSupportEmailId) {
    return null;
  }

  const gmailSupportEmail = await db.query.gmailSupportEmails.findFirst({
    where: eq(gmailSupportEmails.id, mailbox.gmailSupportEmailId),
  });

  return gmailSupportEmail ?? null;
};

export const createGmailSupportEmail = async (
  info: {
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  },
  tx: Transaction | typeof db = db,
): Promise<typeof gmailSupportEmails.$inferSelect> => {
  const gmailSupportEmail = await tx
    .insert(gmailSupportEmails)
    .values({
      email: info.email,
      accessToken: info.accessToken,
      refreshToken: info.refreshToken,
      expiresAt: info.expiresAt,
    })
    .returning()
    .then(takeUniqueOrThrow);

  await tx.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id });

  return assertDefined(gmailSupportEmail);
};

export const deleteGmailSupportEmail = async (tx: Transaction, id: number): Promise<void> => {
  await tx.update(mailboxes).set({ gmailSupportEmailId: null }).where(eq(mailboxes.gmailSupportEmailId, id));
  await tx.delete(gmailSupportEmails).where(eq(gmailSupportEmails.id, id));
};
