/**
 * Aplica migration 0008 — reset de senha, e-mail verificado e 2FA.
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
const fileSql = readFileSync(resolve(root, "drizzle", "0008_auth_email_2fa.sql"), "utf8");

try {
  const info = await sql`SELECT current_database() AS db`;
  console.log("[auth-email] Banco:", info[0].db);
  await sql.unsafe(fileSql);
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('token_version', 'email_verified', 'email_verified_at')
    ORDER BY column_name
  `;
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('password_reset_tokens', 'two_factor_secrets', 'two_factor_challenges')
    ORDER BY table_name
  `;
  const settings = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_settings'
      AND column_name = 'two_factor_enabled'
  `;
  console.log("[auth-email] users:", cols.map((r) => r.column_name).join(", "));
  console.log("[auth-email] tabelas:", tables.map((r) => r.table_name).join(", "));
  console.log("[auth-email] user_settings.two_factor_enabled:", settings.length ? "ok" : "AUSENTE");
  console.log("[auth-email] migration 0008 aplicada.");
} catch (err) {
  console.error("[auth-email] FALHA:", err.message ?? err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
