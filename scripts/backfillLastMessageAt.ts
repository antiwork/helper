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
      WITH candidates AS (
        SELECT c."id", MAX(m."created_at") AS last_message_at
        FROM "conversations_conversation" c
        JOIN "messages" m ON m."conversation_id" = c."id"
        WHERE c."last_message_at" IS NULL
          AND m."status" != 'draft'
        GROUP BY c."id"
        ORDER BY c."id"
        LIMIT ${BATCH_SIZE}
      )
      UPDATE "conversations_conversation" AS c
      SET "last_message_at" = candidates.last_message_at
      FROM candidates
      WHERE c."id" = candidates."id";
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
