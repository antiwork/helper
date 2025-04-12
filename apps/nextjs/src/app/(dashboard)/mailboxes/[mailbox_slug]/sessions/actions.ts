"use server";

import { getGuideSessionsForMailbox, PaginatedGuideSessions } from "@/lib/data/guide";

/**
 * Fetches a page of guide sessions for a given mailbox.
 * Server Action wrapper around the data fetching function.
 */
export async function fetchGuideSessionsPage(
  mailboxId: number,
  page: number,
  limit: number,
): Promise<PaginatedGuideSessions> {
  // Basic validation (can be enhanced)
  if (!mailboxId || page < 1 || limit < 1) {
    throw new Error("Invalid parameters for fetching guide sessions");
  }

  try {
    const result = await getGuideSessionsForMailbox(mailboxId, page, limit);
    return result;
  } catch (error) {
    // Log the error appropriately on the server (e.g., using a dedicated logging service)
    // console.error("Failed to fetch guide sessions page:", error);
    // Re-throw or return a specific error structure if needed
    throw new Error("Could not load more sessions.");
  }
} 
