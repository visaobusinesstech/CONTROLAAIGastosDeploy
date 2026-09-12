/**
 * Env de produção Vercel — usa process.env; fallback TCC se a Variable não estiver setada.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Preferir Variables no painel Vercel; estes defaults evitam 500/503 quando esquecidos.
 */

/** Postgres Railway público (maglev) — mesmo do backend/.env. */
export function resolveDatabaseUrl(): string {
  const fromEnv = (process.env.DATABASE_URL ?? "").trim();
  if (fromEnv) return fromEnv;
  return "postgresql://postgres:qxjDdGqZDVqJpXLsHibuGZVElCrxrcAc@maglev.proxy.rlwy.net:29404/railway?sslmode=require";
}

export function resolveJwtSecret(): string {
  const fromEnv = (process.env.JWT_SECRET ?? "").trim();
  if (fromEnv) return fromEnv;
  return "controlaai-tcc-unicesumar-2026-davi-leonardo-gustavo-long-secret-key";
}

export function resolveSmtpUser(): string {
  return (process.env.SMTP_USER ?? "").trim() || "controlaisistematech@gmail.com";
}

export function resolveSmtpPass(): string {
  const fromEnv = (process.env.SMTP_PASS ?? "").trim().replace(/\s+/g, "");
  if (fromEnv) return fromEnv;
  return "vzuxnrgjfltotwvk";
}

export function resolveMailFrom(): string {
  return (
    (process.env.MAIL_FROM_SMTP ?? "").trim() ||
    `Controla.ai <${resolveSmtpUser()}>`
  );
}
