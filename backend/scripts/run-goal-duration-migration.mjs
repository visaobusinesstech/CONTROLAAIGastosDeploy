/**
 * Migration 0004 — duration_months e deadline_at em goals.
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
const migration = readFileSync(resolve(root, "drizzle/0004_goal_duration_months.sql"), "utf8");

try {
  await sql.unsafe(migration.replace(/--[^\n]*/g, "").trim());
  console.log("Migration 0004 (goal_duration_months) aplicada.");
  await sql.end();
} catch (e) {
  console.error("FALHA:", e.message ?? e);
  await sql.end({ timeout: 1 }).catch(() => {});
  process.exit(1);
}
