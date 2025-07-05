import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { mailboxes, mailboxesMetadataApi } from "@/db/schema";
import { getMetadata, MetadataAPIError, timestamp } from "../metadataApiClient";
import { DataError } from "./dataError";
import { getMailbox } from "./mailbox";

export const METADATA_API_HMAC_SECRET_PREFIX = "hlpr_";

export const getMetadataApiByMailbox = async (mailbox: typeof mailboxes.$inferSelect) => {
  const metadataApi = await db
    .select()
    .from(mailboxesMetadataApi)
    .where(
      and(
        eq(mailboxesMetadataApi.unused_mailboxId, mailbox.id),
        eq(mailboxesMetadataApi.isEnabled, true),
        isNull(mailboxesMetadataApi.deletedAt),
      ),
    );
  return metadataApi[0] ?? null;
};

export const getMetadataApi = async () => {
  const mailbox = await getMailbox();
  if (!mailbox) {
    throw new Error("Mailbox not found");
  }
  return { mailbox, metadataApi: await getMetadataApiByMailbox(mailbox) };
};

export const createMailboxMetadataApi = async (params: { url: string }): Promise<void> => {
  const { mailbox, metadataApi } = await getMetadataApi();
  if (metadataApi) {
    throw new DataError("Mailbox already has a metadata endpoint");
  }

  const { url } = params;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new DataError("URL must start with http:// or https://");
  }

  const hmacSecret = `${METADATA_API_HMAC_SECRET_PREFIX}${crypto.randomUUID().replace(/-/g, "")}`;
  await db.insert(mailboxesMetadataApi).values({
    unused_mailboxId: mailbox.id,
    url,
    hmacSecret,
    isEnabled: true,
  });
};

export const deleteMailboxMetadataApi = async (): Promise<void> => {
  const { metadataApi } = await getMetadataApi();
  if (!metadataApi) {
    throw new DataError("Mailbox does not have a metadata endpoint");
  }

  await db.delete(mailboxesMetadataApi).where(eq(mailboxesMetadataApi.id, metadataApi.id));
};

export const testMailboxMetadataApiURL = async () => {
  const { metadataApi } = await getMetadataApi();
  if (!metadataApi) {
    throw new DataError("Mailbox does not have a metadata endpoint");
  }

  try {
    await getMetadata(metadataApi, {
      email: "helpertest@example.com",
      timestamp: timestamp(),
    });
  } catch (e) {
    const error = e instanceof MetadataAPIError ? e.message : "Error testing metadata endpoint";
    throw new DataError(error, { cause: e });
  }
};
