-- Migration incremental: WhatsApp oficial, IA logs, memória financeira, importações
-- Compatível com schema existente — não recria tabelas

DO $$ BEGIN
  CREATE TYPE "public"."whatsapp_connection_status" AS ENUM('disconnected', 'connecting', 'qr', 'connected', 'error');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."whatsapp_message_direction" AS ENUM('inbound', 'outbound');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."whatsapp_message_type" AS ENUM('text', 'audio', 'image', 'document', 'video', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ai_log_status" AS ENUM('success', 'error', 'pending');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "installments" integer;

CREATE TABLE IF NOT EXISTS "whatsapp_connection" (
  "id" text PRIMARY KEY DEFAULT 'main',
  "status" "whatsapp_connection_status" NOT NULL DEFAULT 'disconnected',
  "session_data" jsonb,
  "qr_code" text,
  "phone_number" text,
  "last_activity_at" timestamptz,
  "connected_at" timestamptz,
  "error_message" text,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "remote_phone" text NOT NULL,
  "direction" "whatsapp_message_direction" NOT NULL,
  "message_type" "whatsapp_message_type" NOT NULL DEFAULT 'text',
  "content" text,
  "media_url" text,
  "media_mime_type" text,
  "whatsapp_message_id" text,
  "processed" boolean NOT NULL DEFAULT false,
  "transaction_id" uuid REFERENCES "transactions"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "whatsapp_messages_remote_phone_idx" ON "whatsapp_messages" ("remote_phone");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_created_at_idx" ON "whatsapp_messages" ("created_at");
CREATE INDEX IF NOT EXISTS "whatsapp_messages_user_id_idx" ON "whatsapp_messages" ("user_id");

CREATE TABLE IF NOT EXISTS "ai_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "source" text NOT NULL,
  "operation" text NOT NULL,
  "prompt" text,
  "response" text,
  "model" text,
  "input_tokens" integer,
  "output_tokens" integer,
  "cost_usd" numeric(10, 6),
  "processing_ms" integer,
  "status" "ai_log_status" NOT NULL DEFAULT 'success',
  "error_message" text,
  "metadata" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ai_logs_user_id_idx" ON "ai_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "ai_logs_created_at_idx" ON "ai_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "ai_logs_source_idx" ON "ai_logs" ("source");

CREATE TABLE IF NOT EXISTS "financial_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_name" text,
  "preference_key" text NOT NULL,
  "preference_value" jsonb NOT NULL,
  "frequency" integer NOT NULL DEFAULT 1,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "financial_memory_user_key" UNIQUE("user_id", "preference_key")
);

CREATE TABLE IF NOT EXISTS "document_imports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "file_name" text NOT NULL,
  "file_type" text NOT NULL,
  "status" "import_status" NOT NULL DEFAULT 'pending',
  "extracted_text" text,
  "transactions_created" integer DEFAULT 0,
  "metadata" jsonb,
  "error_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "document_imports_user_id_idx" ON "document_imports" ("user_id");

INSERT INTO "whatsapp_connection" ("id", "status") VALUES ('main', 'disconnected')
ON CONFLICT ("id") DO NOTHING;
