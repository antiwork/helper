import { and, eq, gt, isNotNull, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db/client";
import { decryptFieldValue } from "@/db/lib/encryptedField";
import { conversationMessages, conversations, gmailSupportEmails, toolApis, tools } from "@/db/schema";

const BATCH_SIZE = 100;

export const migrateEncryptedToPlaintext = async () => {
  console.log("Starting migration of encrypted data to plaintext columns...");

  try {
    await migrateConversationMessages();
    await migrateConversations();
    await migrateTools();
    await migrateToolApis();
    await migrateGmailSupportEmails();

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
};

const migrateConversationMessages = async () => {
  console.log("🔄 Migrating conversation messages...");
  let lastId = 0;
  let processed = 0;
  let errors = 0;

  while (true) {
    const batch = await db
      .select({
        id: conversationMessages.id,
        encryptedBody: conversationMessages.body,
        encryptedCleanedUpText: conversationMessages.cleanedUpText,
      })
      .from(conversationMessages)
      .where(
        and(
          gt(conversationMessages.id, lastId),
          isNotNull(conversationMessages.body), // Has encrypted data
          isNull(conversationMessages.bodyPlaintext), // Plaintext not populated yet
        ),
      )
      .orderBy(conversationMessages.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const message of batch) {
      try {
        const decryptedBody = message.encryptedBody ? decryptFieldValue(message.encryptedBody) : null;
        const decryptedCleanedUpText = message.encryptedCleanedUpText
          ? decryptFieldValue(message.encryptedCleanedUpText)
          : null;

        await db
          .update(conversationMessages)
          .set({
            bodyPlaintext: decryptedBody,
            cleanedUpTextPlaintext: decryptedCleanedUpText,
          })
          .where(eq(conversationMessages.id, message.id));
      } catch (error) {
        console.error(`Failed to migrate message ${message.id}:`, error);
        errors++;
      }
    }

    processed += batch.length;
    lastId = batch[batch.length - 1]?.id ?? lastId;
    console.log(`  Migrated ${processed} conversation messages (${errors} errors)`);
  }

  console.log(`✅ Conversation messages migration complete: ${processed} processed, ${errors} errors`);
};

const migrateConversations = async () => {
  console.log("🔄 Migrating conversations...");
  let lastId = 0;
  let processed = 0;
  let errors = 0;

  while (true) {
    const batch = await db
      .select({
        id: conversations.id,
        encryptedSubject: conversations.subject,
      })
      .from(conversations)
      .where(
        and(
          gt(conversations.id, lastId),
          isNotNull(conversations.subject), // Has encrypted data
          isNull(conversations.subjectPlaintext), // Plaintext not populated yet
        ),
      )
      .orderBy(conversations.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const conversation of batch) {
      try {
        const decryptedSubject = conversation.encryptedSubject
          ? decryptFieldValue(conversation.encryptedSubject)
          : null;

        await db
          .update(conversations)
          .set({
            subjectPlaintext: decryptedSubject,
          })
          .where(eq(conversations.id, conversation.id));
      } catch (error) {
        console.error(`Failed to migrate conversation ${conversation.id}:`, error);
        errors++;
      }
    }

    processed += batch.length;
    lastId = batch[batch.length - 1]?.id ?? lastId;
    console.log(`  Migrated ${processed} conversations (${errors} errors)`);
  }

  console.log(`✅ Conversations migration complete: ${processed} processed, ${errors} errors`);
};

const migrateTools = async () => {
  console.log("🔄 Migrating tools...");
  let lastId = 0;
  let processed = 0;
  let errors = 0;

  while (true) {
    const batch = await db
      .select({
        id: tools.id,
        encryptedAuthenticationToken: tools.authenticationToken,
      })
      .from(tools)
      .where(
        and(
          gt(tools.id, lastId),
          isNotNull(tools.authenticationToken), // Has encrypted data
          isNull(tools.authenticationTokenPlaintext), // Plaintext not populated yet
        ),
      )
      .orderBy(tools.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const tool of batch) {
      try {
        const decryptedToken = tool.encryptedAuthenticationToken
          ? decryptFieldValue(tool.encryptedAuthenticationToken)
          : null;

        await db
          .update(tools)
          .set({
            authenticationTokenPlaintext: decryptedToken,
          })
          .where(eq(tools.id, tool.id));
      } catch (error) {
        console.error(`Failed to migrate tool ${tool.id}:`, error);
        errors++;
      }
    }

    processed += batch.length;
    lastId = batch[batch.length - 1]?.id ?? lastId;
    console.log(`  Migrated ${processed} tools (${errors} errors)`);
  }

  console.log(`✅ Tools migration complete: ${processed} processed, ${errors} errors`);
};

const migrateToolApis = async () => {
  console.log("🔄 Migrating tool APIs...");
  let lastId = 0;
  let processed = 0;
  let errors = 0;

  while (true) {
    const batch = await db
      .select({
        id: toolApis.id,
        encryptedAuthenticationToken: toolApis.authenticationToken,
      })
      .from(toolApis)
      .where(
        and(
          gt(toolApis.id, lastId),
          isNotNull(toolApis.authenticationToken), // Has encrypted data
          isNull(toolApis.authenticationTokenPlaintext), // Plaintext not populated yet
        ),
      )
      .orderBy(toolApis.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const toolApi of batch) {
      try {
        const decryptedToken = toolApi.encryptedAuthenticationToken
          ? decryptFieldValue(toolApi.encryptedAuthenticationToken)
          : null;

        await db
          .update(toolApis)
          .set({
            authenticationTokenPlaintext: decryptedToken,
          })
          .where(eq(toolApis.id, toolApi.id));
      } catch (error) {
        console.error(`Failed to migrate tool API ${toolApi.id}:`, error);
        errors++;
      }
    }

    processed += batch.length;
    lastId = batch[batch.length - 1]?.id ?? lastId;
    console.log(`  Migrated ${processed} tool APIs (${errors} errors)`);
  }

  console.log(`✅ Tool APIs migration complete: ${processed} processed, ${errors} errors`);
};

const migrateGmailSupportEmails = async () => {
  console.log("🔄 Migrating Gmail support emails...");
  let lastId = 0;
  let processed = 0;
  let errors = 0;

  while (true) {
    const batch = await db
      .select({
        id: gmailSupportEmails.id,
        encryptedAccessToken: gmailSupportEmails.accessToken,
        encryptedRefreshToken: gmailSupportEmails.refreshToken,
      })
      .from(gmailSupportEmails)
      .where(
        and(
          gt(gmailSupportEmails.id, lastId),
          or(
            isNotNull(gmailSupportEmails.accessToken), // Has encrypted access token
            isNotNull(gmailSupportEmails.refreshToken), // Has encrypted refresh token
          ),
          or(
            isNull(gmailSupportEmails.accessTokenPlaintext), // Access token plaintext not populated yet
            isNull(gmailSupportEmails.refreshTokenPlaintext), // Refresh token plaintext not populated yet
          ),
        ),
      )
      .orderBy(gmailSupportEmails.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const email of batch) {
      try {
        const decryptedAccessToken = email.encryptedAccessToken ? decryptFieldValue(email.encryptedAccessToken) : null;
        const decryptedRefreshToken = email.encryptedRefreshToken
          ? decryptFieldValue(email.encryptedRefreshToken)
          : null;

        await db
          .update(gmailSupportEmails)
          .set({
            accessTokenPlaintext: decryptedAccessToken,
            refreshTokenPlaintext: decryptedRefreshToken,
          })
          .where(eq(gmailSupportEmails.id, email.id));
      } catch (error) {
        console.error(`Failed to migrate Gmail support email ${email.id}:`, error);
        errors++;
      }
    }

    processed += batch.length;
    lastId = batch[batch.length - 1]?.id ?? lastId;
    console.log(`  Migrated ${processed} Gmail support emails (${errors} errors)`);
  }

  console.log(`✅ Gmail support emails migration complete: ${processed} processed, ${errors} errors`);
};

// CLI entry point
if (process.argv[1] === new URL(import.meta.url).pathname) {
  migrateEncryptedToPlaintext()
    .then(() => {
      console.log("Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}
