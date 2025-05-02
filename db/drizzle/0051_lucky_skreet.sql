CREATE EXTENSION IF NOT EXISTS pg_trgm;
COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "mailboxes_platformcustomer_email_ilike" ON "mailboxes_platformcustomer" USING gin ("email" gin_trgm_ops);