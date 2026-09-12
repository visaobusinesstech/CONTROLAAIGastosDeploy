/**
 * Cliente Postgres para rotas Vercel (forgot/reset) — independente do Railway.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

/** URL pública do Postgres (Railway maglev / DATABASE_URL na Vercel). */
export function getSql() {
  if (sql) return sql;
  const raw = (process.env.DATABASE_URL ?? "").trim();
  if (!raw) throw new Error("DATABASE_URL missing on Vercel");
  const url = raw.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  const needsSsl = /rlwy\.net|railway\.app|neon\.tech|sslmode=require/i.test(raw);
  sql = postgres(url, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
  return sql;
}
