/* eslint-disable no-console */
import { env } from "@/lib/env";
import { seedDatabase } from "./seedDatabase";

if (env.NODE_ENV !== "development" && env.VERCEL_ENV !== "preview") {
  console.log("Skipping seed generation for non-development and non-preview environments.");
  process.exit(1);
}

seedDatabase()
  .then(() => {
    console.log("Seed process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed process failed:", error);
    process.exit(1);
  });
