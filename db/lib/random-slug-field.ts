import { varchar } from "drizzle-orm/pg-core";
import { generateSlug } from "@/lib/shared/slug";

export const randomSlugField = (columnName: string) =>
  varchar(columnName, { length: 50 }).notNull().$defaultFn(generateSlug);
