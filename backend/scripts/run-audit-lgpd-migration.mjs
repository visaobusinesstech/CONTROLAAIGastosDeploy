/**
 * Aplica migration 0009 — auditoria, inativação e campos LGPD.
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
const fileSql = readFileSync(resolve(root, "drizzle", "0009_audit_lgpd_soft_delete.sql"), "utf8");

try {
  const info = await sql`SELECT current_database() AS db`;
  console.log("[audit-lgpd] Banco:", info[0].db);
  await sql.unsafe(fileSql);
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('audit_logs', 'lgpd_sensitive_fields')
    ORDER BY table_name
  `;
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('access_level', 'is_active')
    ORDER BY column_name
  `;
  const fields = await sql`SELECT count(*)::int AS n FROM lgpd_sensitive_fields`;
  console.log("[audit-lgpd] tabelas:", tables.map((r) => r.table_name).join(", "));
  console.log("[audit-lgpd] users:", cols.map((r) => r.column_name).join(", "));
  console.log("[audit-lgpd] campos LGPD:", fields[0].n);
  console.log("[audit-lgpd] migration 0009 aplicada.");
} catch (err) {
  console.error("[audit-lgpd] FALHA:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
