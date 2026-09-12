/**
 * Cliente Postgres para rotas Vercel auth.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { resolveDatabaseUrl } from "./_env";

type SqlClient = ReturnType<typeof import("postgres").default>;

let sql: SqlClient | null = null;

/** URL pública do Postgres (Railway) — env ou fallback TCC. */
export async function getSql(): Promise<SqlClient> {
  if (sql) return sql;
  const raw = resolveDatabaseUrl();
  if (!raw) throw new Error("DATABASE_URL missing on Vercel");

  const mod = await import("postgres");
  const postgres = mod.default;
  const url = raw.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  const needsSsl = /rlwy\.net|railway\.app|neon\.tech|sslmode=require/i.test(raw);
  sql = postgres(url, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  return sql;
}
