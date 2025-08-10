/* eslint-disable no-console */
import { and, eq, gt, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, gmailSupportEmails, toolApis, tools } from "@/db/schema";

const BATCH_SIZE = 1000;

const migrateEncryptedToPlaintext = async () => {
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
  let lastId = 3085616;
  let processed = 0;
  let errors = 0;
  let isFirst = true;

  while (true) {
    const batch = await db
      .select({
        id: conversationMessages.id,
        body: conversationMessages.body,
        cleanedUpText: conversationMessages.cleanedUpText,
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
      .limit(isFirst ? 10 : 50);

    isFirst = false;

    if (batch.length === 0) break;

    try {
      const bodyConditions = batch.reduce((acc, m) => sql`${acc} WHEN id = ${m.id} THEN ${m.body}`, sql.empty());
      const cleanedUpTextConditions = batch.reduce(
        (acc, m) => sql`${acc} WHEN id = ${m.id} THEN ${m.cleanedUpText}`,
        sql.empty(),
      );

      await db.execute(sql`
        UPDATE messages 
        SET 
          body = CASE ${bodyConditions} END,
          cleaned_up_text = CASE ${cleanedUpTextConditions} END
        WHERE id IN ${batch.map((m) => m.id)}
      `);

      processed += batch.length;
    } catch (error) {
      console.error(`Failed to migrate batch starting at ID ${batch[0]?.id}:`, error);
      errors += batch.length;
    }

    lastId = batch[batch.length - 1]?.id ?? lastId;
    console.log(`  Migrated ${processed} conversation messages up to ${lastId} (${errors} errors)`);
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
        subject: conversations.subject,
      })
      .from(conversations)
      .where(
        and(gt(conversations.id, lastId), isNotNull(conversations.subject), isNull(conversations.subjectPlaintext)),
      )
      .orderBy(conversations.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const conversation of batch) {
      try {
        await db
          .update(conversations)
          .set({
            subjectPlaintext: conversation.subject,
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
        authenticationToken: tools.authenticationToken,
      })
      .from(tools)
      .where(
        and(gt(tools.id, lastId), isNotNull(tools.authenticationToken), isNull(tools.authenticationTokenPlaintext)),
      )
      .orderBy(tools.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const tool of batch) {
      try {
        await db
          .update(tools)
          .set({
            authenticationTokenPlaintext: tool.authenticationToken,
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
        authenticationToken: toolApis.authenticationToken,
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
        await db
          .update(toolApis)
          .set({
            authenticationTokenPlaintext: toolApi.authenticationToken,
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
        accessToken: gmailSupportEmails.accessToken,
        refreshToken: gmailSupportEmails.refreshToken,
      })
      .from(gmailSupportEmails)
      .where(
        and(
          gt(gmailSupportEmails.id, lastId),
          or(isNotNull(gmailSupportEmails.accessToken), isNotNull(gmailSupportEmails.refreshToken)),
          or(isNull(gmailSupportEmails.accessTokenPlaintext), isNull(gmailSupportEmails.refreshTokenPlaintext)),
        ),
      )
      .orderBy(gmailSupportEmails.id)
      .limit(BATCH_SIZE);

    if (batch.length === 0) break;

    // Process batch
    for (const email of batch) {
      try {
        await db
          .update(gmailSupportEmails)
          .set({
            accessTokenPlaintext: email.accessToken,
            refreshTokenPlaintext: email.refreshToken,
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
