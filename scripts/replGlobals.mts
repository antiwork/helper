import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { createDbClient } from "@/db/client";
import { explainAnalyze } from "@/db/lib/debug";
import * as schemas from "@/db/schema";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/server";

const db = createDbClient(env.POSTGRES_URL_NON_POOLING, { max: 1 });

Object.entries({
  env,
  db,
  explainAnalyze,
  sql,
  ...schemas,
  eq,
  ne,
  and,
  or,
  not,
  isNull,
  isNotNull,
  inArray,
  lte,
  gte,
  lt,
  gt,
  asc,
  desc,
  count,
  like,
  ilike,
  exists,
  notExists,
  createAdminClient,
}).forEach(([key, value]) => {
  (globalThis as any)[key] = value;
});

if (env.VERCEL_ENV === "production") {
  console.log("\x1b[31mProduction environment, setting database connection to read-only.\x1b[0m");
  console.log(
    "\x1b[31mFor a read-write connection, run: await db.execute(sql`SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE`)\x1b[0m",
  );
  await db.execute(sql`SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY`);
}
