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
export function isLocalDatabaseUrl(url: string): boolean { // Função exportada — pode ser usada em outros arquivos
  return /(?:localhost|127\.0\.0\.1|\[::1\]|::1)(?::|\/|$)/i.test(url); // Regex para host local
} // Fecha um bloco de código (if, função, objeto, etc.)

/** True quando o processo roda dentro do Railway (qualquer serviço). */
export function isRailwayRuntime(): boolean { // Função exportada — pode ser usada em outros arquivos
  return Boolean( // Devolve um valor e encerra a função aqui
    process.env.RAILWAY_ENVIRONMENT || // Instrução do programa — parte da lógica deste arquivo
      process.env.RAILWAY_SERVICE_NAME || // Instrução do programa — parte da lógica deste arquivo
      process.env.RAILWAY_PROJECT_ID || // Instrução do programa — parte da lógica deste arquivo
      process.env.RAILWAY_REPLICA_ID, // Qualquer variável Railway indica deploy remoto
  ); // Fecha parêntese e encerra instrução
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Remove aspas e garante sslmode=require para Neon/Railway. */
export function normalizeDatabaseUrl(raw: string | undefined): string { // Função exportada — pode ser usada em outros arquivos
  if (!raw?.trim()) { // Só executa o bloco abaixo se esta condição for verdadeira
    if (isRailwayRuntime()) { // Só executa o bloco abaixo se esta condição for verdadeira
      throw new Error( // Sinaliza erro e interrompe o fluxo normal
        "DATABASE_URL não configurada no Railway. " + // Instrução do programa — parte da lógica deste arquivo
          "New → Database → PostgreSQL, depois Variables do backend → DATABASE_URL " + // Instrução do programa — parte da lógica deste arquivo
          "(use ${{NomeDoPostgres.DATABASE_URL}} ou cole a URL pública rlwy.net).", // Instrução do programa — parte da lógica deste arquivo
      ); // Fecha parêntese e encerra instrução
    } // Fecha um bloco de código (if, função, objeto, etc.)
    throw new Error("DATABASE_URL is required"); // Banco é obrigatório para o sistema
  } // Fecha um bloco de código (if, função, objeto, etc.)

  let url = raw.trim(); // Remove espaços nas extremidades

  if ( // Só executa o bloco abaixo se esta condição for verdadeira
    (url.startsWith('"') && url.endsWith('"')) || // Instrução do programa — parte da lógica deste arquivo
    (url.startsWith("'") && url.endsWith("'")) // Instrução do programa — parte da lógica deste arquivo
  ) { // Fecha parêntese aberto antes
    url = url.slice(1, -1).trim(); // Remove aspas que alguns painéis adicionam à URL
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const isProd = process.env.NODE_ENV === "production" || isRailwayRuntime(); // Guarda um valor que não muda durante a execução deste trecho
  if (isProd && isLocalDatabaseUrl(url)) { // Só executa o bloco abaixo se esta condição for verdadeira
    console.error( // Escreve mensagem no terminal para diagnóstico
      "[db] AVISO: DATABASE_URL aponta para localhost — no Railway/Vercel isso não funciona. " + // Instrução do programa — parte da lógica deste arquivo
        "Configure a URL do Postgres Railway (rlwy.net) em Variables → DATABASE_URL.", // Instrução do programa — parte da lógica deste arquivo
    ); // Fecha parêntese e encerra instrução
  } // Fecha um bloco de código (if, função, objeto, etc.)

  if (url.includes("neon.tech") && !url.includes("sslmode=")) { // Só executa o bloco abaixo se esta condição for verdadeira
    url += url.includes("?") ? "&sslmode=require" : "?sslmode=require"; // Neon exige SSL
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if ((url.includes("railway.app") || url.includes("rlwy.net")) && !url.includes("sslmode=")) { // Só executa o bloco abaixo se esta condição for verdadeira
    url += url.includes("?") ? "&sslmode=require" : "?sslmode=require"; // Railway Postgres exige SSL
  } // Fecha um bloco de código (if, função, objeto, etc.)

  return url; // URL pronta para o driver postgres
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Retorna DATABASE_URL normalizada ou lança erro. */
export function getDatabaseUrl(): string { // Função exportada — pode ser usada em outros arquivos
  return normalizeDatabaseUrl(process.env.DATABASE_URL); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Oculta senha da URL para exibir em logs sem vazar credencial. */
export function maskDatabaseUrl(url: string): string { // Função exportada — pode ser usada em outros arquivos
  try { // Tenta executar código que pode falhar
    const u = new URL(url); // Parser de URL padrão
    if (u.password) u.password = "***"; // Substitui senha por asteriscos
    return u.toString(); // URL segura para log
  } catch { // Fecha bloco iniciado anteriormente
    return "(invalid DATABASE_URL)"; // Fallback se URL malformada
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)
