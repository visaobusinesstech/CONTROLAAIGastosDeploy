/**
 * Carrega e normaliza variáveis de ambiente (backend/.env ou Railway).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

import { config } from "dotenv"; // Biblioteca que lê arquivo .env para process.env
import { dirname, resolve } from "node:path"; // resolve = caminho absoluto; dirname = pasta pai
import { fileURLToPath } from "node:url"; // Converte import.meta.url em caminho de arquivo

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // Pasta backend/ (pai de src/)
config({ path: resolve(backendRoot, ".env"), override: true }); // .env local sobrescreve variáveis do sistema

/** Detecta URL apontando para máquina local (não funciona no Railway/Vercel). */
export function isLocalDatabaseUrl(url: string): boolean {
  return /(?:localhost|127\.0\.0\.1|\[::1\]|::1)(?::|\/|$)/i.test(url); // Regex para host local
}

/** True quando o processo roda dentro do Railway (qualquer serviço). */
export function isRailwayRuntime(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_SERVICE_NAME ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_REPLICA_ID, // Qualquer variável Railway indica deploy remoto
  );
}

/** Remove aspas e garante sslmode=require para Neon/Railway. */
export function normalizeDatabaseUrl(raw: string | undefined): string {
  if (!raw?.trim()) {
    if (isRailwayRuntime()) {
      throw new Error(
        "DATABASE_URL não configurada no Railway. " +
          "New → Database → PostgreSQL, depois Variables do backend → DATABASE_URL " +
          "(use ${{NomeDoPostgres.DATABASE_URL}} ou cole a URL pública rlwy.net).",
      );
    }
    throw new Error("DATABASE_URL is required"); // Banco é obrigatório para o sistema
  }

  let url = raw.trim(); // Remove espaços nas extremidades

  if (
    (url.startsWith('"') && url.endsWith('"')) ||
    (url.startsWith("'") && url.endsWith("'"))
  ) {
    url = url.slice(1, -1).trim(); // Remove aspas que alguns painéis adicionam à URL
  }

  const isProd = process.env.NODE_ENV === "production" || isRailwayRuntime();
  if (isProd && isLocalDatabaseUrl(url)) {
    console.error(
      "[db] AVISO: DATABASE_URL aponta para localhost — no Railway/Vercel isso não funciona. " +
        "Configure a URL do Postgres Railway (rlwy.net) em Variables → DATABASE_URL.",
    );
  }

  if (url.includes("neon.tech") && !url.includes("sslmode=")) {
    url += url.includes("?") ? "&sslmode=require" : "?sslmode=require"; // Neon exige SSL
  }
  if ((url.includes("railway.app") || url.includes("rlwy.net")) && !url.includes("sslmode=")) {
    url += url.includes("?") ? "&sslmode=require" : "?sslmode=require"; // Railway Postgres exige SSL
  }

  return url; // URL pronta para o driver postgres
}

/** Retorna DATABASE_URL normalizada ou lança erro. */
export function getDatabaseUrl(): string {
  return normalizeDatabaseUrl(process.env.DATABASE_URL);
}

/** Oculta senha da URL para exibir em logs sem vazar credencial. */
export function maskDatabaseUrl(url: string): string {
  try {
    const u = new URL(url); // Parser de URL padrão
    if (u.password) u.password = "***"; // Substitui senha por asteriscos
    return u.toString(); // URL segura para log
  } catch {
    return "(invalid DATABASE_URL)"; // Fallback se URL malformada
  }
}
