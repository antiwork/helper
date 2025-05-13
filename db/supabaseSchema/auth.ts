import { pgSchema } from "drizzle-orm/pg-core";

const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", (t) => ({
  id: t.text().primaryKey(),
  email: t.text(),
  // snake_case to match what the Supabase client returns
  user_metadata: t.jsonb("raw_user_meta_data").$type<Record<string, any>>(),
  created_at: t.timestamp().defaultNow(),
  updated_at: t
    .timestamp()
    .defaultNow()
    .$onUpdate(() => new Date()),
}));

export type DbOrAuthUser = {
  id: string;
  email?: string | null;
  user_metadata: Record<string, any> | null;
};
