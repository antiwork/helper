/// <reference types="@vitest/browser/context" />

/* eslint-disable no-console */
import type { TestProject } from "vitest/node";
import { setupDockerTestDb } from "./setupDatabase";

let testDatabase: Awaited<ReturnType<typeof setupDockerTestDb>> | undefined;

export async function setup({ provide }: TestProject) {
  console.log("Starting global setup...");
  console.log("Setting up Docker test database...");
  testDatabase = await setupDockerTestDb();
  console.log("Docker test database setup completed successfully.");
  provide("TEST_DATABASE_URL", testDatabase.connectionString);
}

export async function teardown() {
  console.log("Starting global teardown...");
  try {
    if (testDatabase?.client && "end" in testDatabase.client) {
      console.log("Closing database connection...");
      await testDatabase.client.end();
      console.log("Database connection closed.");
    }
    if (testDatabase?.container) {
      console.log("Stopping Docker container...");
      await testDatabase.container.stop();
      console.log("Docker container stopped.");
    }
  } catch (error) {
    console.error("Failed to clean up after tests:", error);
  }
  console.log("Global teardown completed.");
}

declare module "vitest" {
  export interface ProvidedContext {
    TEST_DATABASE_URL: string;
  }
}
