/**
 * Aplica migration 0010 — remove UNIQUE de users.phone (cadastro não bloqueia WhatsApp).
 * Doc TCC: TCC_DOCUMENTACAO.md
 */
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env"), override: true });

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

const sql = postgres(url, { ssl: { rejectUnauthorized: false }, max: 1 });
const fileSql = readFileSync(resolve(root, "drizzle", "0010_drop_users_phone_unique.sql"), "utf8");

try {
  const info = await sql`SELECT current_database() AS db`;
  console.log("[phone-unique] Banco:", info[0].db);
  await sql.unsafe(fileSql);
  const cons = await sql`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND contype = 'u'
  `;
  console.log("[phone-unique] uniques restantes:", cons);
  console.log("[phone-unique] migration 0010 aplicada.");
} catch (err) {
  console.error("[phone-unique] FALHA:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
