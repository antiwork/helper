ALTER TABLE "mailboxes_pinnedreply" RENAME TO "faqs";--> statement-breakpoint
ALTER INDEX "mailboxes_pinnedreply_pkey" RENAME TO "faqs_pkey";--> statement-breakpoint
ALTER INDEX "mailboxes_pinnedreply_created_at_845e5873" RENAME TO "faqs_mailbox_created_at_idx";--> statement-breakpoint
ALTER INDEX "mailboxes_pinnedreply_mailbox_id_75fd0196" RENAME TO "faqs_mailbox_id_idx";--> statement-breakpoint
ALTER INDEX "pinned_reply_embedding_index" RENAME TO "faqs_embedding_index";--> statement-breakpoint
ALTER INDEX "mailboxes_pinnedreply_message_id_key" RENAME TO "faqs_message_id_key";--> statement-breakpoint
