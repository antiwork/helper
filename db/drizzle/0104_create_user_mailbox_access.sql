CREATE TABLE "user_mailbox_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"mailbox_id" bigint,
	"role" text NOT NULL,
	"keywords" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_mailbox_access_userId_mailboxId_unique" UNIQUE("user_id","mailbox_id")
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "inviter_user_id" uuid;--> statement-breakpoint
ALTER TABLE "user_mailbox_access" ADD CONSTRAINT "user_mailbox_access_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_mailbox_access" ADD CONSTRAINT "user_mailbox_access_mailbox_id_mailboxes_mailbox_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."mailboxes_mailbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" DROP COLUMN "access";