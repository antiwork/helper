ALTER TABLE "agent_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "agent_threads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes_aiusageevent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversation_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations_conversation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations_escalation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "faqs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations_file" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guide_session_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guide_session_replays" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "guide_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes_metadataapi" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes_subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes_platformcustomer" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations_note" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "message_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website_docs_crawls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website_docs_pages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "website_docs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tool_apis" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tools" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ALTER COLUMN "preferences" SET DEFAULT '{}'::jsonb;