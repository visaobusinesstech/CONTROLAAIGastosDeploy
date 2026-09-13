/**
 * =============================================================================
 * WHATSAPP / BAILEYS — sessão e credenciais
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * =============================================================================
 *
 * Esta pasta concentra TODA a conexão com WhatsApp via Baileys.
 * A sessão fica em backend/.baileys-session (ou BAILEYS_SESSION_DIR no .env).
 * =============================================================================
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"; // Operações de arquivo da sessão
import { dirname, join, resolve } from "node:path"; // Caminhos absolutos multiplataforma
import { fileURLToPath } from "node:url"; // Converte import.meta.url em path

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // Pasta backend/ (pai de whatsapp/)

/** Resolve pasta da sessão: env > backend/.baileys-session */
function resolveSessionDir(): string { // Bloco de código reutilizável com um nome
  const raw = process.env.BAILEYS_SESSION_DIR?.trim(); // Ex: /data/.baileys-session no Railway
  if (!raw) return join(backendRoot, ".baileys-session"); // Padrão local para TCC/dev
  if (raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw)) return raw; // Caminho absoluto
  return resolve(backendRoot, raw); // Caminho relativo ao backend
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Pasta onde o Baileys guarda credenciais após escanear o QR. */
export const SESSION_DIR = resolveSessionDir(); // Constante exportada — valor fixo compartilhado com o resto do sistema

/** True quando admin já escaneou QR e creds.json contém registered: true. */
export function hasRegisteredSession(dir = SESSION_DIR): boolean { // Função exportada — pode ser usada em outros arquivos
  if (!existsSync(dir)) return false; // Pasta ainda não criada
  try { // Tenta executar código que pode falhar
    const credsPath = join(dir, "creds.json"); // Arquivo principal de credenciais Baileys
    if (!existsSync(credsPath)) return false; // Só executa o bloco abaixo se esta condição for verdadeira
    const creds = JSON.parse(readFileSync(credsPath, "utf8")) as { registered?: boolean }; // Guarda um valor que não muda durante a execução deste trecho
    return creds.registered === true; // Baileys marca true após pareamento
  } catch { // Fecha bloco iniciado anteriormente
    return false; // JSON corrompido ou ilegível
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Apaga sessão — usado no primeiro pareamento ou logout explícito do admin. */
export function clearSessionDir(dir = SESSION_DIR): void { // Função exportada — pode ser usada em outros arquivos
  if (existsSync(dir)) { // Só executa o bloco abaixo se esta condição for verdadeira
    rmSync(dir, { recursive: true, force: true }); // Remove pasta inteira
  } // Fecha um bloco de código (if, função, objeto, etc.)
  mkdirSync(dir, { recursive: true }); // Recria vazia para novo QR
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Garante que a pasta existe antes do Baileys gravar arquivos de auth. */
export function ensureSessionDir(dir = SESSION_DIR): void { // Função exportada — pode ser usada em outros arquivos
  if (!existsSync(dir)) { // Só executa o bloco abaixo se esta condição for verdadeira
    mkdirSync(dir, { recursive: true }); // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)
