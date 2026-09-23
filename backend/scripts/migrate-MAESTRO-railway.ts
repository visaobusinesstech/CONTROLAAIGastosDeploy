/**
 * SCRIPT MAESTRO DEFINITIVO — CONTROLA.AI → BANCO RAILWAY (URL PÚBLICA)
 *
 * Tudo inline:
 *   1. Dropa TUDO (clean start)
 *   2. Cria extensão pgcrypto + 13 enums (nomes SIMPLES oficiais do drizzle/0000_full_schema.sql)
 *   3. Cria 16 TABELAS OFICIAIS do arquivo SQL versionado + índices + FKs
 *   4. Seeds: categorias, 8 usuários (bcrypt 10 rounds), 210+ transações Leonardo,
 *             5 metas + checkpoints, 6 budgets, WhatsApp msgs, AI logs, singleton WA
 *
 *  NÃO DEPENDE de ler nenhum arquivo externo (evita bugs de path/search_path)
 *
 *  Como rodar: cd backend && npx tsx scripts/migrate-MAESTRO-railway.ts
 */
import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const DB_URL = (process.env.DATABASE_URL || "").trim();
if (!DB_URL) { console.error("DATABASE_URL vazio"); process.exit(1); }
console.log("🔗 Conectando em:", DB_URL.replace(/(:\/\/[^:]+:)[^@]+(@)/, "$1***$2").split("?")[0]);
const sql = postgres(DB_URL, { max: 1, connect_timeout: 30, idle_timeout: 30, ssl: "require" });

/** =============================================================
 *  SCHEMA DDL COMPLETO — 100% baseado no drizzle/0000_full_schema.sql
 *  NOMES DE ENUMS SIMPLES (plan, category_type, ...) — NÃO user_plan_enum
 * ============================================================== */
const SCHEMA_DDL = /* sql */ `
-- 1. Extensão
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. 13 enums oficiais (DO block: idempotentes)
DO $$ BEGIN CREATE TYPE "public"."plan" AS ENUM('free','pro','premium'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."category_type" AS ENUM('expense','income'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."transaction_type" AS ENUM('expense','income'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."transaction_source" AS ENUM('whatsapp','web','recurring','manual'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."goal_period" AS ENUM('monthly','quarterly','yearly'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."goal_kind" AS ENUM('limit','saving'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."recurring_frequency" AS ENUM('weekly','monthly','yearly'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."subscription_status" AS ENUM('active','canceled','past_due','trialing'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."whatsapp_connection_status" AS ENUM('disconnected','connecting','qr','connected','error'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."whatsapp_message_direction" AS ENUM('inbound','outbound'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."whatsapp_message_type" AS ENUM('text','audio','image','document','video','other'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."ai_log_status" AS ENUM('success','error','pending'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."import_status" AS ENUM('pending','processing','completed','failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. 16 TABELAS
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

CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" uuid PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "alert_at_80" boolean NOT NULL DEFAULT true,
  "alert_at_100" boolean NOT NULL DEFAULT true,
  "weekly_report" boolean NOT NULL DEFAULT false,
  "theme_preference" text NOT NULL DEFAULT 'dark',
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "icon" text NOT NULL,
  "type" "category_type" NOT NULL,
  "color" text NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "amount" numeric(12,2) NOT NULL,
  "type" "transaction_type" NOT NULL,
  "description" text,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "source" "transaction_source" NOT NULL DEFAULT 'whatsapp',
  "raw_message" text,
  "payment_method" text,
  "installments" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#6366f1',
  "limit_amount" numeric(12,2) NOT NULL,
  "period_type" "goal_period" NOT NULL DEFAULT 'monthly',
  "goal_type" "goal_kind" NOT NULL DEFAULT 'limit',
  "target_amount" numeric(12,2),
  "alert_at_80" boolean NOT NULL DEFAULT true,
  "alert_at_100" boolean NOT NULL DEFAULT true,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "goal_checkpoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "goal_id" uuid NOT NULL REFERENCES "goals"("id") ON DELETE CASCADE,
  "month" text NOT NULL,
  "spent_amount" numeric(12,2) NOT NULL,
  "limit_snapshot" numeric(12,2) NOT NULL,
  "percentage" numeric(5,2) NOT NULL,
  "exceeded" boolean NOT NULL DEFAULT false,
  "alert_80_sent" boolean NOT NULL DEFAULT false,
  "alert_100_sent" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "goal_checkpoints_goal_month" UNIQUE("goal_id","month")
);

CREATE TABLE IF NOT EXISTS "budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "month" text NOT NULL,
  "total_income_expected" numeric(12,2),
  "total_expense_limit" numeric(12,2),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "budgets_user_month" UNIQUE("user_id","month")
);

CREATE TABLE IF NOT EXISTS "recurring_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
  "description" text NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "type" "transaction_type" NOT NULL,
  "frequency" "recurring_frequency" NOT NULL DEFAULT 'monthly',
  "day_of_month" integer NOT NULL DEFAULT 1,
  "next_due" date NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ai_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text,
  "messages" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "context_month" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "session_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

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
  "cost_usd" numeric(10,6),
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
  CONSTRAINT "financial_memory_user_key" UNIQUE("user_id","preference_key")
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
`;

/* =============================================================
 *  DADOS DEMO
 * ============================================================== */
const CATEGORIES = [
  { name: "Alimentação", icon: "utensils", type: "expense", color: "#f97316" },
  { name: "Transporte", icon: "car", type: "expense", color: "#3b82f6" },
  { name: "Moradia", icon: "home", type: "expense", color: "#8b5cf6" },
  { name: "Saúde", icon: "heart-pulse", type: "expense", color: "#ef4444" },
  { name: "Educação", icon: "book-open", type: "expense", color: "#06b6d4" },
  { name: "Lazer", icon: "gamepad-2", type: "expense", color: "#ec4899" },
  { name: "Roupas", icon: "shirt", type: "expense", color: "#f59e0b" },
  { name: "Tecnologia", icon: "laptop", type: "expense", color: "#6366f1" },
  { name: "Serviços", icon: "smartphone", type: "expense", color: "#14b8a6" },
  { name: "Outros gastos", icon: "package", type: "expense", color: "#94a3b8" },
  { name: "Salário", icon: "briefcase", type: "income", color: "#22c55e" },
  { name: "Freelance", icon: "lightbulb", type: "income", color: "#84cc16" },
  { name: "Investimentos", icon: "trending-up", type: "income", color: "#10b981" },
  { name: "Outras receitas", icon: "coins", type: "income", color: "#34d399" },
];
const USERS: { name: string; email: string; phone: string | null; plan: string; pwd: string }[] = [
  { name: "Administrador", email: "admin@admin.com", phone: null, plan: "premium", pwd: "123456" },
  { name: "Davi Almeida", email: "davi.almeida@unicesumar.edu.br", phone: "5541989046696", plan: "premium", pwd: "123456" },
  { name: "Leonardo Sena", email: "leonardo.sena@unicesumar.edu.br", phone: "5511999998888", plan: "premium", pwd: "123456" },
  { name: "Gustavo Biscoto", email: "gustavo.biscoto@unicesumar.edu.br", phone: "5544988887777", plan: "premium", pwd: "123456" },
  { name: "Marina Costa", email: "marina.costa@email.com", phone: "5511987654321", plan: "free", pwd: "123456" },
  { name: "Carlos Pereira", email: "carlos.pereira@email.com", phone: "5521976543210", plan: "pro", pwd: "123456" },
  { name: "Juliana Santos", email: "juliana.santos@email.com", phone: "5531965432109", plan: "free", pwd: "123456" },
  { name: "Roberto Lima", email: "roberto.lima@email.com", phone: null, plan: "pro", pwd: "123456" },
];

/** helpers */
const rnd = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
const amt = (s: number, min: number, max: number) => Number((min + rnd(s) * (max - min)).toFixed(2));

/* =============================================================
 *  MAIN
 * ============================================================== */
async function main() {
  /** 1. SETUP */
  await sql`SET search_path TO public`;
  console.log("✅ SET search_path = public");

  /** 2. DROP ALL (idempotente) */
  console.log("\n🧹 1/7 Dropando TUDO (tabelas, enums, extensão)...");
  const DROP_TABLES = `
    DROP TABLE IF EXISTS financial_memory, document_imports, ai_logs, whatsapp_messages,
    whatsapp_connection, subscriptions, whatsapp_sessions, ai_conversations,
    recurring_transactions, budgets, goal_checkpoints, goals, transactions,
    categories, user_settings, users CASCADE;
    DROP TYPE IF EXISTS plan, category_type, transaction_type, transaction_source,
      goal_period, goal_kind, recurring_frequency, subscription_status,
      whatsapp_connection_status, whatsapp_message_direction, whatsapp_message_type,
      ai_log_status, import_status CASCADE;
    DROP EXTENSION IF EXISTS pgcrypto CASCADE;
  `;
  await sql.unsafe(DROP_TABLES);
  console.log("   ✓ Drop completo");

  /** 3. SCHEMA DDL (inline, SEM depender de arquivo) */
  console.log("\n🏗️  2/7 Aplicando SCHEMA COMPLETO inline (extensão + 13 enums + 16 tabelas + índices)...");
  await sql.unsafe(SCHEMA_DDL);

  // Validação: quais tabelas realmente existem agora?
  const tabelas = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  console.log(`   ✓ ${tabelas.length} tabelas criadas:`);
  for (const t of tabelas) console.log(`      • ${t.tablename}`);

  /** 4. CATEGORIES */
  console.log("\n📂 3/7 Inserindo 14 categorias...");
  for (const c of CATEGORIES) {
    await sql`INSERT INTO categories (user_id, name, icon, type, color, is_default)
              VALUES (NULL, ${c.name}, ${c.icon}, ${c.type as any}, ${c.color}, true)`;
  }
  console.log("   ✓ 14 categorias (10 despesas + 4 receitas)");

  /** 5. USERS + user_settings */
  console.log("\n👥 4/7 Criando 8 usuários com bcrypt 10 rounds...");
  const created: { id: string; email: string; name: string; phone?: string }[] = [];
  for (const u of USERS) {
    const hash = await bcrypt.hash(u.pwd, 10);
    const [r] = await sql`
      INSERT INTO users (name, email, password_hash, phone, plan)
      VALUES (${u.name}, ${u.email.toLowerCase()}, ${hash}, ${u.phone ?? null as any}, ${u.plan as any})
      RETURNING id, name, email, phone`;
    created.push({ id: r.id, email: r.email, name: r.name, phone: r.phone ?? undefined });
    await sql`INSERT INTO user_settings (user_id) VALUES (${r.id}) ON CONFLICT DO NOTHING`;
  }
  for (const c of created) console.log(`      ✓ ${c.name} — ${c.email}`);

  /** map categorias */
  const catMap = new Map<string, string>();
  for (const r of await sql`SELECT id, name FROM categories`) catMap.set(r.name as string, r.id as string);

  /** 6. TRANSACTIONS (Leonardo) */
  const leo = created.find((u) => u.email.includes("leonardo"))!;
  console.log(`\n💰 5/7 Inserindo transações RICAS para ${leo.name} (6 meses)...`);
  const months = [
    { y: 2026, m: 3, sal: "8500.00", alug: "1800.00" },
    { y: 2026, m: 4, sal: "8500.00", alug: "1800.00" },
    { y: 2026, m: 5, sal: "9200.00", alug: "1800.00" },
    { y: 2026, m: 6, sal: "9200.00", alug: "1850.00" },
    { y: 2026, m: 7, sal: "9800.00", alug: "1850.00" },
    { y: 2026, m: 8, sal: "9800.00", alug: "1850.00" },
  ];
  const tpl = [
    { desc: "Supermercado Pão de Açúcar", min: 180, max: 580, cat: "Alimentação", src: "whatsapp" },
    { desc: "Padaria da esquina", min: 18, max: 65, cat: "Alimentação", src: "whatsapp" },
    { desc: "iFood – restaurante", min: 40, max: 210, cat: "Alimentação", src: "web" },
    { desc: "Uber / 99 POP", min: 15, max: 75, cat: "Transporte", src: "whatsapp" },
    { desc: "Combustível Shell", min: 220, max: 420, cat: "Transporte", src: "web" },
    { desc: "Farmácia Drogaria", min: 35, max: 280, cat: "Saúde", src: "whatsapp" },
    { desc: "Consulta médica", min: 180, max: 550, cat: "Saúde", src: "web" },
    { desc: "Netflix / Spotify", min: 40, max: 110, cat: "Serviços", src: "recurring" },
    { desc: "Academia Smart Fit", min: 90, max: 150, cat: "Lazer", src: "recurring" },
    { desc: "Uber Eats entrega", min: 35, max: 130, cat: "Alimentação", src: "web" },
    { desc: "Curso online / Udemy", min: 60, max: 380, cat: "Educação", src: "web" },
    { desc: "Roupas / Zara", min: 120, max: 480, cat: "Roupas", src: "web" },
    { desc: "Eletrônicos / Amazon", min: 80, max: 980, cat: "Tecnologia", src: "web" },
  ];

  let totalTx = 0;
  let s = 42;
  for (const { y, m, sal, alug } of months) {
    // Salário (receita)
    await sql`INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, payment_method, installments)
              VALUES (${leo.id}, ${catMap.get("Salário")}, ${sal}, 'income', 'Salário CLT – Controla.ai',
                      ${new Date(Date.UTC(y, m - 1, 5, 9))}, 'recurring', 'pix', 1)`;
    totalTx++;
    // Aluguel
    await sql`INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, payment_method, installments)
              VALUES (${leo.id}, ${catMap.get("Moradia")}, ${alug}, 'expense', 'Aluguel apartamento',
                      ${new Date(Date.UTC(y, m - 1, 1, 8))}, 'recurring', 'boleto', 1)`;
    totalTx++;
    // Extras
    const extras = 22 + Math.floor(rnd(s + m) * 10);
    for (let i = 0; i < extras; i++) {
      const t = tpl[(s + i + y + m * 7) % tpl.length];
      const day = 2 + Math.floor(rnd(s + i * 13) * 26);
      const hr = 8 + Math.floor(rnd(s + i * 5) * 12);
      const mn = Math.floor(rnd(s + i * 3) * 55);
      const val = amt(s * 1000 + i * 17 + y + m, t.min, t.max);
      await sql`INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, raw_message, payment_method, installments)
                VALUES (${leo.id}, ${catMap.get(t.cat)}, ${val}, 'expense', ${t.desc},
                        ${new Date(Date.UTC(y, m - 1, day, hr, mn))}, ${t.src as any},
                        ${`${t.desc.toLowerCase()} r$${val}`}, 'credit_card', 1)`;
      totalTx++;
      s++;
    }
  }

  // Destaques grandes
  const extras: any[] = [
    { cat: "Freelance", type: "income", amount: 2800, desc: "Projeto App Dashboard – freelance", date: "2026-06-15T14:30:00.000Z", src: "web", method: "pix" },
    { cat: "Investimentos", type: "income", amount: 612.45, desc: "Dividendos FIIs + ações", date: "2026-07-20T10:15:00.000Z", src: "web", method: "pix" },
    { cat: "Outras receitas", type: "income", amount: 1500, desc: "Reembolso viagem corporativa", date: "2026-04-28T11:20:00.000Z", src: "web", method: "pix" },
    { cat: "Tecnologia", type: "expense", amount: 4299, desc: "MacBook Air M2 – 1/6", date: "2026-05-10T19:40:00.000Z", src: "manual", method: "credit_card", install: 6 },
    { cat: "Lazer", type: "expense", amount: 1280, desc: "Viagem praia fim de semana", date: "2026-03-21T12:00:00.000Z", src: "manual", method: "pix" },
    { cat: "Educação", type: "expense", amount: 1597, desc: "Certificação AWS Cloud Practitioner", date: "2026-08-01T16:00:00.000Z", src: "web", method: "credit_card" },
  ];
  for (const e of extras) {
    await sql`INSERT INTO transactions (user_id, category_id, amount, type, description, occurred_at, source, payment_method, installments)
              VALUES (${leo.id}, ${catMap.get(e.cat)}, ${e.amount}, ${e.type as any}, ${e.desc},
                      ${new Date(e.date)}, ${e.src as any}, ${e.method}, ${e.install ?? 1})`;
    totalTx++;
  }
  console.log(`   ✓ ${totalTx} transações financeiras`);

  /** 7. BUDGETS + GOALS */
  console.log("\n🎯 6/7 Orçamentos (6) + Metas (5) + Checkpoints (30)...");
  for (let mm = 3; mm <= 8; mm++) {
    const month = `2026-${String(mm).padStart(2, "0")}`;
    const income = (mm === 6 || mm === 7) ? "11500" : mm === 8 ? "10000" : String(9000);
    const limit = String(7200 + mm * 20);
    await sql`INSERT INTO budgets (user_id, month, total_income_expected, total_expense_limit, notes)
              VALUES (${leo.id}, ${month}, ${income}, ${limit}, ${`Orçamento mensal TCC Controla.ai — ${month}`})
              ON CONFLICT (user_id, month) DO UPDATE SET
                total_income_expected = EXCLUDED.total_income_expected,
                total_expense_limit = EXCLUDED.total_expense_limit,
                notes = EXCLUDED.notes`;
  }
  const goals = [
    { name: "Meta Alimentação", cat: "Alimentação", limit: 1800, period: "monthly", kind: "limit", color: "#f97316" },
    { name: "Meta Transporte", cat: "Transporte", limit: 900, period: "monthly", kind: "limit", color: "#3b82f6" },
    { name: "Meta Lazer", cat: "Lazer", limit: 600, period: "monthly", kind: "limit", color: "#ec4899" },
    { name: "Reserva de Emergência", target: 15000, period: "yearly", kind: "saving", color: "#22c55e", months: 12 },
    { name: "Viagem de Férias", target: 8000, period: "yearly", kind: "saving", color: "#8b5cf6", months: 8 },
  ] as any[];
  for (const g of goals) {
    const deadline = g.months ? new Date(Date.now() + g.months * 30 * 86400 * 1000) : null;
    const [gr] = await sql`
      INSERT INTO goals (user_id, category_id, name, color, limit_amount, period_type, goal_type, target_amount)
      VALUES (${leo.id}, ${g.cat ? catMap.get(g.cat) : null as any}, ${g.name}, ${g.color}, ${Number(g.limit || 0)},
              ${g.period as any}, ${g.kind as any}, ${g.target ? Number(g.target) : null as any})
      RETURNING id`;
    for (let k = 3; k <= 8; k++) {
      const month = `2026-${String(k).padStart(2, "0")}`;
      const spent = 600 + k * 90 + Math.sin(k) * 120;
      const snap = Number(g.limit || g.target || 10000);
      const pct = Math.min(120, (spent / snap) * 100 + k * 3);
      await sql`INSERT INTO goal_checkpoints (goal_id, month, spent_amount, limit_snapshot, percentage, exceeded)
                VALUES (${gr.id}, ${month}, ${Number(spent.toFixed(2))}, ${snap}, ${Number(pct.toFixed(2))}, ${pct > 100})
                ON CONFLICT DO NOTHING`;
    }
  }
  console.log("   ✓ Orçamentos + metas prontos");

  /** 8. WhatsApp + AI logs + singleton connection */
  console.log("\n🤖 7/7 WhatsApp messages + AI logs + singleton conexão WhatsApp...");
  const wa = [
    { dir: "inbound" as const, remote: leo.phone, content: "Gastei 85 reais no mercado", need: "Supermercado" },
    { dir: "inbound" as const, remote: leo.phone, content: "Recebi salário de 9800", need: "Salário" },
    { dir: "outbound" as const, remote: leo.phone, content: "✅ Lançamento registrado! Alimentação R$ 85,00" },
    { dir: "inbound" as const, remote: leo.phone, content: "Quanto gastei esse mês?" },
    { dir: "outbound" as const, remote: leo.phone, content: "📊 Gastos Ago/2026: R$ 6.842,00 em 31 lançamentos." },
    { dir: "inbound" as const, remote: leo.phone, content: "Criar meta alimentacao 1800" },
  ];
  for (let i = 0; i < wa.length; i++) {
    const w = wa[i];
    let txId: string | null = null;
    if (w.need) {
      const [row] = await sql`SELECT id FROM transactions WHERE user_id=${leo.id} AND description ILIKE ${`%${w.need}%`} LIMIT 1`;
      if (row) txId = row.id as string;
    }
    await sql`INSERT INTO whatsapp_messages (user_id, remote_phone, direction, message_type, content, processed, transaction_id, created_at)
              VALUES (${leo.id}, ${w.remote}, ${w.dir as any}, 'text', ${w.content}, TRUE, ${txId ?? null as any},
                      ${new Date(Date.now() - (wa.length - i) * 3600 * 1000)})`;
  }
  const ops = [
    { op: "parse", model: "gpt-4o-mini", inp: 142, out: 58, cost: 0.00031, ms: 820 },
    { op: "chat", model: "gpt-4o-mini", inp: 1250, out: 430, cost: 0.00294, ms: 1680 },
    { op: "parse", model: "gpt-4o-mini", inp: 98, out: 42, cost: 0.00021, ms: 710 },
    { op: "transcribe", model: "whisper-1", inp: 0, out: 210, cost: 0.006, ms: 3200 },
    { op: "chat", model: "gpt-4o-mini", inp: 2100, out: 620, cost: 0.00485, ms: 2100 },
  ];
  for (const a of ops) {
    await sql`INSERT INTO ai_logs (user_id, source, operation, model, input_tokens, output_tokens, cost_usd, processing_ms, status)
              VALUES (${leo.id}, 'whatsapp', ${a.op}, ${a.model}, ${a.inp}, ${a.out}, ${a.cost}, ${a.ms}, 'success')`;
  }
  await sql`INSERT INTO whatsapp_connection (id, status) VALUES ('main', 'disconnected') ON CONFLICT DO NOTHING`;
  console.log(`   ✓ ${wa.length} mensagens WhatsApp · ${ops.length} logs IA · 1 conexão singleton`);

  /** 9. VALIDAÇÃO FINAL */
  console.log("\n" + "=".repeat(60));
  console.log("🏁 MIGRAÇÃO CONCLUÍDA — CONTAGEM FINAL DE LINHAS");
  console.log("=".repeat(60));
  const counts = await sql`
    SELECT 'users'::text t, COUNT(*)::int n FROM users UNION ALL
    SELECT 'user_settings', COUNT(*) FROM user_settings UNION ALL
    SELECT 'categories', COUNT(*) FROM categories UNION ALL
    SELECT 'transactions', COUNT(*) FROM transactions UNION ALL
    SELECT 'budgets', COUNT(*) FROM budgets UNION ALL
    SELECT 'goals', COUNT(*) FROM goals UNION ALL
    SELECT 'goal_checkpoints', COUNT(*) FROM goal_checkpoints UNION ALL
    SELECT 'whatsapp_messages', COUNT(*) FROM whatsapp_messages UNION ALL
    SELECT 'ai_logs', COUNT(*) FROM ai_logs UNION ALL
    SELECT 'whatsapp_connection', COUNT(*) FROM whatsapp_connection UNION ALL
    SELECT 'TABELAS CRIADAS', COUNT(*) FROM pg_tables WHERE schemaname='public'`;
  let total = 0;
  for (const c of counts) {
    console.log(`   ${String(c.t).padEnd(24)} ${String(c.n).padStart(6)} linhas`);
    if (c.t !== "TABELAS CRIADAS") total += c.n as number;
  }
  console.log(`   ${"(total linhas de dados)".padEnd(24)} ${String(total).padStart(6)} linhas`);

  console.log("\n✅ LOGINS PRONTOS:");
  console.log("   admin@admin.com  / 123456  [premium - acesso total]");
  console.log("   davi / leonardo / gustavo  @unicesumar.edu.br / 123456");
  console.log("   + 4 usuários demo (marina, carlos, juliana, roberto) / 123456");
  console.log(`\n✅ Conta Leonardo RICA: ${totalTx} transações 6 meses + 5 metas + 6 orçamentos\n`);
}

main()
  .catch((e) => {
    console.error("\n❌ ERRO FINAL:", e.message || e);
    if (e.code) console.error("Código PostgreSQL:", e.code, e.position ? `pos ${e.position}` : "");
    console.error(e.stack);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }).catch(() => {}));
