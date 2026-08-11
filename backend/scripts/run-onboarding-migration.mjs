/**
 * Aplica migration 0001 (onboarding_completed + initial_balance).
 * Uso: node scripts/run-onboarding-migration.mjs
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

let url = process.env.DATABASE_URL?.trim() ?? "";
if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
  url = url.slice(1, -1).trim();
}
if (!url) {
  console.error("DATABASE_URL ausente em backend/.env");
  process.exit(1);
}
if (!url.includes("sslmode=")) {
  url += url.includes("?") ? "&sslmode=require" : "?sslmode=require";
}

const sqlFile = resolve(root, "drizzle/0001_onboarding_settings.sql");
const migration = readFileSync(sqlFile, "utf8");

const sql = postgres(url, { max: 1, ssl: "require" });

try {
  console.log("Conectando ao banco...");
  const [info] = await sql`SELECT current_database() AS db`;
  console.log("Database:", info.db);

  const statements = migration
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql.unsafe(stmt);
    console.log("OK:", stmt.split("\n")[0].slice(0, 70) + "...");
  }

  const [cols] = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings'
      AND column_name IN ('onboarding_completed', 'initial_balance')
  `;
  console.log("\nColunas verificadas:", cols ? "ok" : "verificar manualmente");

  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings'
      AND column_name IN ('onboarding_completed', 'initial_balance')
  `;
  console.log(
    "user_settings:",
    rows.map((r) => r.column_name).join(", ") || "(nenhuma)",
  );

  console.log("\nMigration 0001 aplicada com sucesso.");
  await sql.end();
  process.exit(0);
} catch (e) {
  console.error("FALHA:", e.message ?? e);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
