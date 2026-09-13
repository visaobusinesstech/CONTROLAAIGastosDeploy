/**
 * DRIZZLE CONFIG — Configuração do Drizzle Kit (ferramenta de banco de dados).
 *
 * O que é: arquivo que diz ao Drizzle onde está o schema SQL do projeto e como conectar
 * ao PostgreSQL. Não roda sozinho — é usado pelos comandos npm db:push, db:setup etc.
 *
 * Para que serve: sincronizar as tabelas do Controla.AI (usuários, gastos, metas…) com o
 * banco real. Em desenvolvimento aponta para o .env local; em produção usa DATABASE_URL
 * da Railway (Postgres hospedado na nuvem).
 *
 * Conexões: lê backend/.env → schema em src/db/schema.ts → migrations em drizzle/.
 * Railway usa a mesma DATABASE_URL no deploy. O frontend (Vercel) NÃO usa este arquivo.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)));
config({ path: resolve(backendRoot, ".env") });

function dbUrl(): string {
  let url = process.env.DATABASE_URL?.trim() ?? "";
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  if (!url) throw new Error("DATABASE_URL is required");
  return url;
}

const url = dbUrl();
const isRemote = !/localhost|127\.0\.0\.1/.test(url);
// Node 22: sslmode=require na URL vira verify-full e quebra no proxy Railway
const cleanUrl = url.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/[?&]$/, "");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: cleanUrl,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
