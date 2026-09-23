/**
 * Aplica migration 0013 — income_frequency em transactions.
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

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

const cleanUrl = url.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "");
const isLocal = /localhost|127\.0\.0\.1/.test(cleanUrl);

const client = new pg.Client({
  connectionString: cleanUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const migration = readFileSync(resolve(root, "drizzle/0013_transaction_income_frequency.sql"), "utf8");

try {
  await client.connect();
  await client.query(migration);
  const check = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions'
      AND column_name = 'income_frequency'
  `);
  if (check.rows.length === 0) {
    throw new Error("Coluna income_frequency não encontrada após migration");
  }
  console.log("Migration 0013 (transaction_income_frequency) aplicada.");
} catch (e) {
  console.error("FALHA:", e.message ?? e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
