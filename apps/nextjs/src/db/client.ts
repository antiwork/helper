import { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import { PgTransaction } from "drizzle-orm/pg-core";
import { Pool, PoolConfig } from "pg";
import * as schema from "@/db/schema";
import { env } from "@/env";

export const createDbClient = (url: string, options: PoolConfig = {}) => {
  const pool = new Pool({ connectionString: url, ...options });
  return drizzle({ client: pool, schema, casing: "snake_case", logger: !!env.DRIZZLE_LOGGING });
};

type DrizzleClientType = ReturnType<typeof createDbClient>;

declare global {
  // eslint-disable-next-line no-var
  var drizzleGlobal: DrizzleClientType | undefined;
}

const db = global.drizzleGlobal ?? createDbClient(env.POSTGRES_URL);

export { db };

if (env.NODE_ENV !== "production") global.drizzleGlobal = db;

export type Transaction = PgTransaction<NodePgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export type TransactionOrDb = Transaction | typeof db;
