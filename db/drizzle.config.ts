import type { Config } from "drizzle-kit";
import { env } from "@/lib/env";

const parsedUrl = new URL(env.DATABASE_URL || env.POSTGRES_URL);
// https://github.com/drizzle-team/drizzle-orm/discussions/881
// `sslmode=require` results in a `Error: self-signed certificate` error when
// attempting to run migrations during a production build.
if (env.NODE_ENV === "production") {
  parsedUrl.searchParams.set("sslmode", "no-verify");
}
const updatedUrl = parsedUrl.toString();

export default {
  schemaFilter: ["public"],
  schema: "db/schema",
  out: "db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: updatedUrl,
  },
  casing: "snake_case",
} satisfies Config;
