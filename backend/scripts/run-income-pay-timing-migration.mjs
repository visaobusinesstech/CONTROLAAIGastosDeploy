/**
 * Migration 0003 — income_pay_day / income_pay_weekday em user_settings.
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
if (!url.includes("sslmode=")) {
  url += url.includes("?") ? "&sslmode=require" : "?sslmode=require";
}

const sql = postgres(url, { max: 1, ssl: "require" });
const migration = readFileSync(resolve(root, "drizzle/0003_income_pay_timing.sql"), "utf8");

try {
  await sql.unsafe(migration.replace(/--[^\n]*/g, "").trim());
  console.log("Migration 0003 (income_pay_timing) aplicada.");
  await sql.end();
} catch (e) {
  console.error("FALHA:", e.message ?? e);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
