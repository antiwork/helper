import { eq } from "drizzle-orm";
import Fuse from "fuse.js";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { savedReplies, SavedReply } from "@/db/schema";

export const fuzzySearchSavedRepliesByName = (savedReplies: Pick<SavedReply, "id" | "name">[], searchTerm: string) => {
  if (!searchTerm.trim()) return [];

  const fuse = new Fuse(savedReplies, {
    keys: [{ name: "name", weight: 1.0 }],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    includeScore: true,
    ignoreLocation: true,
  });
  const results = fuse.search(searchTerm);

  return results.map((result) => result.item);
};

export const fuzzyFindSavedReply = async (searchTerm: string) => {
  const allSavedReplies = await db.query.savedReplies.findMany({
    where: eq(savedReplies.isActive, true),
    columns: { id: true, name: true },
  });

  const exactMatch = allSavedReplies.find((savedReply) => savedReply.name === searchTerm);
  if (exactMatch) return assertDefined(db.query.savedReplies.findFirst({ where: eq(savedReplies.id, exactMatch.id) }));

  const fuzzyResults = fuzzySearchSavedRepliesByName(allSavedReplies, searchTerm);

  return fuzzyResults[0]
    ? assertDefined(db.query.savedReplies.findFirst({ where: eq(savedReplies.id, fuzzyResults[0].id) }))
    : null;
};
