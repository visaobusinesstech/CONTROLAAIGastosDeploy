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
function resolveSessionDir(): string {
  const raw = process.env.BAILEYS_SESSION_DIR?.trim(); // Ex: /data/.baileys-session no Railway
  if (!raw) return join(backendRoot, ".baileys-session"); // Padrão local para TCC/dev
  if (raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw)) return raw; // Caminho absoluto
  return resolve(backendRoot, raw); // Caminho relativo ao backend
}

/** Pasta onde o Baileys guarda credenciais após escanear o QR. */
export const SESSION_DIR = resolveSessionDir();

/** True quando admin já escaneou QR e creds.json contém registered: true. */
export function hasRegisteredSession(dir = SESSION_DIR): boolean {
  if (!existsSync(dir)) return false; // Pasta ainda não criada
  try {
    const credsPath = join(dir, "creds.json"); // Arquivo principal de credenciais Baileys
    if (!existsSync(credsPath)) return false;
    const creds = JSON.parse(readFileSync(credsPath, "utf8")) as { registered?: boolean };
    return creds.registered === true; // Baileys marca true após pareamento
  } catch {
    return false; // JSON corrompido ou ilegível
  }
}

/** Apaga sessão — usado no primeiro pareamento ou logout explícito do admin. */
export function clearSessionDir(dir = SESSION_DIR): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true }); // Remove pasta inteira
  }
  mkdirSync(dir, { recursive: true }); // Recria vazia para novo QR
}

/** Garante que a pasta existe antes do Baileys gravar arquivos de auth. */
export function ensureSessionDir(dir = SESSION_DIR): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
