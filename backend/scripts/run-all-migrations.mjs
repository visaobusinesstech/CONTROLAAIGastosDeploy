/**
 * Aplica todas as migrations incrementais (0001 → 0009) em ordem.
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });

const MIGRATIONS = [
  "0001_onboarding_settings.sql",
  "0001_whatsapp_ai_modules.sql",
  "0002_income_recurrence.sql",
  "0003_income_pay_timing.sql",
  "0004_goal_duration_months.sql",
  "0005_income_type_freelance.sql",
  "0006_billing_trial.sql",
  "0007_user_consents.sql",
  "0008_auth_email_2fa.sql",
  "0009_audit_lgpd_soft_delete.sql",
  "0010_drop_users_phone_unique.sql",
];

function normalizeUrl(raw) {
  let url = raw?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  return url;
}

const url = normalizeUrl(process.env.DATABASE_URL);
if (!url) {
  console.error("DATABASE_URL ausente em backend/.env");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const infoRes = await client.query("SELECT current_database() AS db");
  console.log("[migrate:all] Banco:", infoRes.rows[0].db);

  for (const file of MIGRATIONS) {
    const filePath = path.join(root, "drizzle", file);
    if (!fs.existsSync(filePath)) {
      console.warn("[migrate:all] SKIP (arquivo ausente):", file);
      continue;
    }
    const sql = fs.readFileSync(filePath, "utf8");
    console.log("[migrate:all] Aplicando", file, "…");
    await client.query(sql);
    console.log("[migrate:all] OK:", file);
  }

  const checks = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('user_consents', 'users', 'user_settings', 'budgets', 'transactions')
    ORDER BY table_name
  `);
  const cols = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings'
      AND column_name IN (
        'initial_balance', 'income_recurrence', 'income_pay_day',
        'income_type', 'onboarding_completed'
      )
    ORDER BY column_name
  `);
  console.log("\n[migrate:all] Tabelas core:", checks.rows.map((r) => r.table_name).join(", "));
  console.log("[migrate:all] Colunas user_settings:", cols.rows.map((r) => r.column_name).join(", "));
  console.log("\n[migrate:all] Todas as migrations incrementais aplicadas.");
} catch (err) {
  console.error("[migrate:all] FALHA:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await client.end();
}
