CREATE TABLE IF NOT EXISTS "cached_client_tools" (
    "id" bigserial PRIMARY KEY,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "customer_email" text,
    "platform_customer_id" bigint,
    "tools" jsonb NOT NULL
);

CREATE INDEX "cached_client_tools_customer_idx" ON "cached_client_tools" ("customer_email");
CREATE INDEX "cached_client_tools_platform_customer_idx" ON "cached_client_tools" ("platform_customer_id");

ALTER TABLE "cached_client_tools" ENABLE ROW LEVEL SECURITY;
