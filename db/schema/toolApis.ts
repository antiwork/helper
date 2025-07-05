import { relations } from "drizzle-orm";
import { bigint, pgTable, text } from "drizzle-orm/pg-core";
import { encryptedField } from "../lib/encryptedField";
import { withTimestamps } from "../lib/with-timestamps";
import { tools } from "./tools";

const toolApis = pgTable("tool_apis", {
  ...withTimestamps,
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
  baseUrl: text(),
  schema: text(),
  authenticationToken: encryptedField(),
}).enableRLS();

export const toolApisRelations = relations(toolApis, ({ many }) => ({
  tools: many(tools),
}));

export { toolApis };
export type ToolApi = typeof toolApis.$inferSelect;
