import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { savedReplies } from "../../../db/schema";

export async function deleteSavedReplyByName(name: string) {
  try {
    const result = await db.delete(savedReplies).where(eq(savedReplies.name, name));

    return result.rowCount || 0;
  } catch (error) {}
}
