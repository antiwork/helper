--> statement-breakpoint
ALTER TABLE "cached_client_tools" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "cached_client_tools_customer_idx" ON "cached_client_tools" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "cached_client_tools_platform_customer_idx" ON "cached_client_tools" USING btree ("platform_customer_id");