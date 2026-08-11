-- Controla.ai — schema completo PostgreSQL (DBeaver / postgres local)
-- Execute este script em um banco vazio (ex.: controlaai) antes de rodar o backend.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'premium'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."category_type" AS ENUM('expense', 'income'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'income'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."transaction_source" AS ENUM('whatsapp', 'web', 'recurring', 'manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."goal_period" AS ENUM('monthly', 'quarterly', 'yearly'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."goal_kind" AS ENUM('limit', 'saving'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."recurring_frequency" AS ENUM('weekly', 'monthly', 'yearly'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."whatsapp_connection_status" AS ENUM('disconnected', 'connecting', 'qr', 'connected', 'error'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."whatsapp_message_direction" AS ENUM('inbound', 'outbound'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."whatsapp_message_type" AS ENUM('text', 'audio', 'image', 'document', 'video', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."ai_log_status" AS ENUM('success', 'error', 'pending'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- users
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "phone" text UNIQUE,
  "plan" "plan" NOT NULL DEFAULT 'free',
  "stripe_customer_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- user_settings
CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "alert_at_80" boolean NOT NULL DEFAULT true,
  "alert_at_100" boolean NOT NULL DEFAULT true,
  "weekly_report" boolean NOT NULL DEFAULT false,
  "theme_preference" text NOT NULL DEFAULT 'dark',
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text NOT NULL,
  "type" "category_type" NOT NULL,
  "color" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false
);

-- transactions
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "amount" numeric(12, 2) NOT NULL,
  "type" "transaction_type" NOT NULL,
  "description" text,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "source" "transaction_source" NOT NULL DEFAULT 'whatsapp',
  "raw_message" text,
  "payment_method" text,
  "installments" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- goals
CREATE TABLE IF NOT EXISTS "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#6366f1',
  "limit_amount" numeric(12, 2) NOT NULL,
  "period_type" "goal_period" NOT NULL DEFAULT 'monthly',
  "goal_type" "goal_kind" NOT NULL DEFAULT 'limit',
  "target_amount" numeric(12, 2),
  "alert_at_80" boolean NOT NULL DEFAULT true,
  "alert_at_100" boolean NOT NULL DEFAULT true,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- goal_checkpoints
CREATE TABLE IF NOT EXISTS "goal_checkpoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "goal_id" uuid NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "month" text NOT NULL,
  "spent_amount" numeric(12, 2) NOT NULL,
  "limit_snapshot" numeric(12, 2) NOT NULL,
  "percentage" numeric(5, 2) NOT NULL,
  "exceeded" boolean NOT NULL DEFAULT false,
  "alert_80_sent" boolean NOT NULL DEFAULT false,
  "alert_100_sent" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "goal_checkpoints_goal_month" UNIQUE("goal_id", "month")
);

-- budgets
CREATE TABLE IF NOT EXISTS "budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "month" text NOT NULL,
  "total_income_expected" numeric(12, 2),
  "total_expense_limit" numeric(12, 2),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "budgets_user_month" UNIQUE("user_id", "month")
);

-- recurring_transactions
CREATE TABLE IF NOT EXISTS "recurring_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "type" "transaction_type" NOT NULL,
  "frequency" "recurring_frequency" NOT NULL DEFAULT 'monthly',
  "day_of_month" integer NOT NULL DEFAULT 1,
  "next_due" date NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- ai_conversations
CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text,
  "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "context_month" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- whatsapp_sessions
CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- subscriptions
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "stripe_sub_id" text UNIQUE,
  "stripe_price_id" text,
  "plan" "plan" NOT NULL,
  "status" "subscription_status" NOT NULL DEFAULT 'active',
  "current_period_end" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- whatsapp_connection (singleton id = main)
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

-- whatsapp_messages
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

-- ai_logs
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

-- financial_memory
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

-- document_imports
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

-- Registro inicial WhatsApp
INSERT INTO "whatsapp_connection" ("id", "status") VALUES ('main', 'disconnected')
ON CONFLICT ("id") DO NOTHING;


-- =============================================================================
-- SEED COMPLETO: categorias, usuários, transações, metas, orçamentos, IA, WhatsApp
-- =============================================================================

-- ---- Categorias padrão ----
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Alimentação', 'utensils', 'expense', '#f97316', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Transporte', 'car', 'expense', '#3b82f6', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Moradia', 'home', 'expense', '#8b5cf6', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Saúde', 'heart-pulse', 'expense', '#ef4444', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Educação', 'book-open', 'expense', '#06b6d4', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Lazer', 'gamepad-2', 'expense', '#ec4899', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Roupas', 'shirt', 'expense', '#f59e0b', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Tecnologia', 'laptop', 'expense', '#6366f1', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Serviços', 'smartphone', 'expense', '#14b8a6', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Outros gastos', 'package', 'expense', '#94a3b8', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Salário', 'briefcase', 'income', '#22c55e', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Freelance', 'lightbulb', 'income', '#84cc16', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Investimentos', 'trending-up', 'income', '#10b981', TRUE);
INSERT INTO categories (user_id, name, icon, type, color, is_default) VALUES (NULL, 'Outras receitas', 'coins', 'income', '#34d399', TRUE);

-- ---- Usuários do sistema ----
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Administrador', 'admin@admin.com', '$2a$10$gm9/TIE/AOSaMNRDIfgW/uIk8PmWRMXoX3agnRPA/vu7i5iM6n4w2', NULL, 'premium', '2026-08-11T03:56:23.068Z') RETURNING id; -- admin@admin.com
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Davi Almeida', 'davi.almeida@unicesumar.edu.br', '$2a$10$3fhCSUJFItuENia/6Sv6zugHGDQXP4S1s2HFRwYyZc0aP5FyQ52Ra', '5541989046696', 'premium', '2026-08-11T03:56:23.156Z') RETURNING id; -- davi.almeida@unicesumar.edu.br
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Leonardo Sena', 'leonardo.sena@unicesumar.edu.br', '$2a$10$gQQs475844.oUIXoDMFjMu8nDeCDLUJuhiug3MHPqJcR4p0BYdXjC', '5511999998888', 'premium', '2026-08-11T03:56:23.239Z') RETURNING id; -- leonardo.sena@unicesumar.edu.br
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Gustavo Biscoto', 'gustavo.biscoto@unicesumar.edu.br', '$2a$10$h.0Nw1PlROkWuCAx9XLEb.iz6TVr.yGXpkSLhy1kcLDdF72yTA.Uu', '5544988887777', 'premium', '2026-08-11T03:56:23.388Z') RETURNING id; -- gustavo.biscoto@unicesumar.edu.br
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Marina Costa', 'marina.costa@email.com', '$2a$10$mIsAg4Ga6seiSxHg8MkU0.yCkmS0FldmTf5Y1FVjec7Hy6Emd.tdq', '5511987654321', 'free', '2026-08-11T03:56:23.472Z') RETURNING id; -- marina.costa@email.com
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Carlos Pereira', 'carlos.pereira@email.com', '$2a$10$Q9tKqWhcCnrcV7NHjKZfZOG2lbEi/i9Wi5YM3J00hoJUyCTRC13JK', '5521976543210', 'pro', '2026-08-11T03:56:23.555Z') RETURNING id; -- carlos.pereira@email.com
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Juliana Santos', 'juliana.santos@email.com', '$2a$10$W/iu//m8fMGQnRneY2KMEurk8Jtm5ulLxXmLIJxquFJtRasbNOWi.', '5531965432109', 'free', '2026-08-11T03:56:23.637Z') RETURNING id; -- juliana.santos@email.com
INSERT INTO users (name, email, password_hash, phone, plan, created_at) VALUES ('Roberto Lima', 'roberto.lima@email.com', '$2a$10$y6VwHSKp5blKx.ARToojN.5A8s4nSCzHeOBtw92s.mP2FcHnObVIa', NULL, 'pro', '2026-08-11T03:56:23.718Z') RETURNING id; -- roberto.lima@email.com
