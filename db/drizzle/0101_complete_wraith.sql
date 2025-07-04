CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text DEFAULT '',
	"permissions" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"access" jsonb DEFAULT '{"role":"afk","keywords":[]}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;