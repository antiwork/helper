import { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { PgTransaction } from "drizzle-orm/pg-core";
import { Pool, PoolConfig } from "pg";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/supabaseSchema/auth";
import { env } from "@/lib/env";

const fullSchema = { ...schema, ...authSchema };

export const createDbClient = (url: string, options: PoolConfig = {}) => {
  // https://github.com/brianc/node-postgres/issues/2558
  const urlWithoutVerification = url.replace("?sslmode=require", "?sslmode=no-verify");
  const pool = new Pool({ connectionString: urlWithoutVerification, ...options });
  return drizzle({ client: pool, schema: fullSchema, casing: "snake_case", logger: !!env.DRIZZLE_LOGGING });
};

type DrizzleClientType = ReturnType<typeof createDbClient>;

declare global {
  // eslint-disable-next-line no-var
  var drizzleGlobal: DrizzleClientType | undefined;
}

const db = global.drizzleGlobal ?? createDbClient(env.POSTGRES_URL);

export { db };

if (env.NODE_ENV !== "production") global.drizzleGlobal = db;

export type Transaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof fullSchema,
  ExtractTablesWithRelations<typeof fullSchema>
>;

export type TransactionOrDb = Transaction | typeof db;
