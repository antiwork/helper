ALTER TABLE "workflows_workflowrun" DROP CONSTRAINT "workflows_workflowru_mailbox_id_f4c91218_fk_mailboxes";
--> statement-breakpoint
ALTER TABLE "workflows_workflowrun" DROP CONSTRAINT "workflows_workflowru_workflow_id_51c8c945_fk_workflows";
--> statement-breakpoint
ALTER TABLE "workflows_workflowrun" DROP CONSTRAINT "workflows_workflowru_conversation_id_2c4060e5_fk_conversat";
--> statement-breakpoint
ALTER TABLE "workflows_workflowrun" DROP CONSTRAINT "workflows_workflowru_email_id_8a2979e0_fk_conversat";
