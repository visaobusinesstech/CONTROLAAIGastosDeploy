/**
 * Aplica migration 0011 — UNIQUE no hash do token de reset de senha.
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
const fileSql = readFileSync(resolve(root, "drizzle", "0011_password_reset_token_unique.sql"), "utf8");

try {
  const info = await sql`SELECT current_database() AS db`;
  console.log("[reset-token] Banco:", info[0].db);
  await sql.unsafe(fileSql);
  const idx = await sql`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'password_reset_tokens'
    ORDER BY indexname
  `;
  console.log("[reset-token] índices:", idx.map((r) => r.indexname).join(", "));
  console.log("[reset-token] migration 0011 aplicada.");
} catch (err) {
  console.error("[reset-token] FALHA:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
