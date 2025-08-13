/* eslint-disable no-console */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const BATCH_SIZE = 1000;

export const backfillLastMessageAt = async () => {
  try {
    await backfillConversationsLastMessageAt();
    console.log("✅ Backfill completed successfully!");
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    throw error;
  }
};

const backfillConversationsLastMessageAt = async () => {
  console.log("🔄 Backfilling last_message_at for conversations...");

  let totalProcessed = 0;
  let batchNumber = 0;

  while (true) {
    batchNumber++;

    const result = await db.execute(sql`
      UPDATE "conversations_conversation" 
      SET "last_message_at" = (
        SELECT MAX("created_at") 
        FROM "messages" 
        WHERE "messages"."conversation_id" = "conversations_conversation"."id"
        AND "messages"."status" != 'draft'
      )
      WHERE EXISTS (
        SELECT 1 
        FROM "messages" 
        WHERE "messages"."conversation_id" = "conversations_conversation"."id"
        AND "messages"."status" != 'draft'
      )
      AND "id" IN (
        SELECT "id" 
        FROM "conversations_conversation" 
        WHERE "last_message_at" IS NULL 
        ORDER BY "id" 
        LIMIT ${BATCH_SIZE}
      )
    `);

    const batchProcessed = result.rowCount || 0;
    totalProcessed += batchProcessed;

    console.log(`Batch ${batchNumber}: Updated ${batchProcessed} conversations (Total: ${totalProcessed})`);

    if (batchProcessed === 0) break;
  }

  console.log(`✅ Backfill complete: ${totalProcessed} conversations updated`);
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  backfillLastMessageAt()
    .then(() => {
      console.log("Backfill script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Backfill script failed:", error);
      process.exit(1);
    });
}
