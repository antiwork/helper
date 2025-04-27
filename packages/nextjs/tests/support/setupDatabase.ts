/* eslint-disable no-console */
// Adapted from https://www.answeroverflow.com/m/1128519076952682517

import path from "path";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";

export async function setupDockerTestDb() {
  console.log("Starting Docker test database setup...");

  const POSTGRES_USER = "username";
  const POSTGRES_PASSWORD = "password";
  const POSTGRES_DB = "helperai_development";
  const POSTGRES_PORT = 5445;

  console.log("Initializing PostgreSQL container...");
  const container = await new PostgreSqlContainer("pgvector/pgvector:0.7.4-pg15")
    .withEnvironment({
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      POSTGRES_DB,
    })
    .withExposedPorts(POSTGRES_PORT)
    .start();

  console.log("PostgreSQL container started successfully.");

  const connectionString = container.getConnectionUri();
  console.log("Connecting to database...");
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Applying migrations...");
  const migrationPath = path.join(__dirname, "..", "..", "db", "drizzle");
  console.log("Migration path:", migrationPath);
  await migrate(db, {
    migrationsFolder: migrationPath,
  });
  console.log("Migrations applied successfully.");

  console.log("Confirming database connection...");
  const confirmDatabaseReady = await db.execute(sql`SELECT 1`);
  console.log("Database connection confirmed.");

  console.log("Docker test database setup completed.");

  return { container, db, confirmDatabaseReady, client, connectionString };
}

export const truncateDb = async () => {
  // eslint-disable-next-line no-restricted-properties
  if (process.env.NODE_ENV !== "test") {
    throw new Error("This function should only be called in test environments.");
  }

  const { db } = await import("@/db/client");
  const tablenames = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
  const tables = tablenames.rows
    .map(({ tablename }) => tablename)
    .filter((name) => name !== "__drizzle_migrations")
    .map((name) => `"public"."${name}"`)
    .join(", ");
  try {
    await db.execute(sql`TRUNCATE TABLE ${sql.raw(tables)} CASCADE;`);
  } catch (error) {
    console.log(error);
  }
};
