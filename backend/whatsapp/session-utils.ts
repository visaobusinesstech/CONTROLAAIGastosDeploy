/**
 * =============================================================================
 *
 * Papel no sistema: Módulo WhatsApp/Baileys — canal alternativo ao frontend web.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"; // Operações de arquivo da sessão
import { join, resolve } from "node:path";

/** Resolve pasta da sessão a partir do cwd (/app no container), não de dist/. */
function resolveSessionDir(): string {
  const raw = process.env.BAILEYS_SESSION_DIR?.trim(); // Ex: /data/.baileys-session no Railway
  // cwd é /app no container. O arquivo compilado fica em dist/, então o pai do módulo não é a raiz.
  if (!raw) return join(process.cwd(), ".baileys-session");
  if (raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw)) return raw;
  return resolve(process.cwd(), raw);
}

/** Pasta onde o Baileys guarda credenciais após escanear o QR. */
export const SESSION_DIR = resolveSessionDir(); // Constante exportada — valor fixo compartilhado com o resto do sistema

/** True quando admin já escaneou QR e creds.json contém registered: true. */
export function hasRegisteredSession(dir = SESSION_DIR): boolean { // Função exportada — pode ser usada em outros arquivos
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
export function clearSessionDir(dir = SESSION_DIR): void { // Função exportada — pode ser usada em outros arquivos
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true }); // Remove pasta inteira
  }
  mkdirSync(dir, { recursive: true }); // Recria vazia para novo QR
}

/** Garante que a pasta existe antes do Baileys gravar arquivos de auth. */
export function ensureSessionDir(dir = SESSION_DIR): void { // Função exportada — pode ser usada em outros arquivos
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
