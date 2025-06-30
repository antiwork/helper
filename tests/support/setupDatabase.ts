/* eslint-disable no-console */
// Adapted from https://www.answeroverflow.com/m/1128519076952682517

import path from "path";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { GenericContainer } from "testcontainers";
import * as schema from "@/db/schema";

async function waitForDatabase(connectionString: string, maxRetries = 30, delay = 250) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempting database connection (attempt ${i + 1}/${maxRetries})...`);
      const testDb = drizzle(connectionString, { schema });
      await testDb.execute(sql`SELECT 1`);
      await (testDb.$client as any).end();
      console.log("Database connection successful!");
      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`Database connection failed (attempt ${i + 1}/${maxRetries}): ${errorMessage}`);

      if (i === maxRetries - 1) {
        throw new Error(`Database failed to become ready after ${maxRetries} attempts. Last error: ${errorMessage}`);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function setupDockerTestDb() {
  console.log("Starting Docker test database setup...");

  const POSTGRES_PORT = 5445;

  console.log("Initializing PostgreSQL container...");
  const container = await new GenericContainer("supabase/postgres:15.8.1.100")
    .withEnvironment({ POSTGRES_PASSWORD: "password" })
    .withExposedPorts({ host: POSTGRES_PORT, container: 5432 })
    .withCommand(["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"])
    .withHealthCheck({
      test: ["CMD-SHELL", `PGPASSWORD=password pg_isready --host localhost --username postgres --dbname postgres`],
      interval: 250,
      timeout: 3000,
      retries: 1000,
    })
    .start();

  console.log("PostgreSQL container started successfully.");

  const adminConnectionString = `postgres://supabase_admin:password@${container.getHost()}:${container.getMappedPort(5432)}/postgres`;

  console.log("Waiting for database to be ready...");
  await waitForDatabase(adminConnectionString);

  const adminDb = drizzle(adminConnectionString, { schema });

  console.log("Applying patches ...");
  // Fix the Docker image's default schema to be closer to the real Supabase schema
  // We should ideally run Supabase default migrations here
  await adminDb.execute(sql`ALTER TABLE storage.buckets ADD COLUMN public boolean NOT NULL DEFAULT false`);
  await (adminDb.$client as any).end();

  const connectionString = `postgres://postgres:password@${container.getHost()}:${container.getMappedPort(5432)}/postgres`;
  console.log(`Connecting to database: ${connectionString}`);
  const db = drizzle(connectionString, { schema });

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

  return { container, db, confirmDatabaseReady, client: db.$client, connectionString };
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
    await db.execute(sql`TRUNCATE TABLE ${sql.raw(tables)}, auth.users CASCADE;`);
  } catch (error) {
    console.log(error);
  }
};
