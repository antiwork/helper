import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { workflows } from "./workflows";

export const workflowActions = pgTable(
  "workflows_workflowaction",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().notNull().generatedByDefaultAsIdentity(),
    actionType: text()
      .notNull()
      .$type<
        | "send_email"
        | "send_auto_reply_from_metadata"
        | "change_status"
        | "change_helper_status"
        | "add_note"
        | "assign_user"
      >(),
    actionValue: text().notNull(),
    workflowId: bigint({ mode: "number" }).notNull(),
  },
  (table) => {
    return {
      createdAtIdx: index("workflows_workflowaction_created_at_6e3a55d9").on(table.createdAt),
      workflowIdIdx: index("workflows_workflowaction_workflow_id_fee44fb7").on(table.workflowId),
    };
  },
);

export const workflowActionsRelations = relations(workflowActions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowActions.workflowId],
    references: [workflows.id],
  }),
}));
