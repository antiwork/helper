export const takeUniqueOrThrow = <T>(values: T[]): T => {
  // Adapted from https://github.com/drizzle-team/drizzle-orm/discussions/1499#discussioncomment-8269091
  if (!values[0]) throw new Error("Found non-existent value");
  if (values.length > 1) throw new Error("Found non-unique value");
  return values[0];
};
