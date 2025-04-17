ALTER TABLE "agent_messages_message" DROP CONSTRAINT "agent_messages_agent_thread_id_fkey";
--> statement-breakpoint
ALTER TABLE "agent_threads_thread" DROP CONSTRAINT "agent_threads_mailbox_id_fkey";
