/**
 * Resolve telefone real e JID de resposta a partir da chave Baileys (suporte LID/PN).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

import { readFileSync, existsSync } from "node:fs"; // Lê mapeamento LID salvo em disco
import { resolve, dirname } from "node:path"; // Caminhos da pasta de sessão
import { fileURLToPath } from "node:url"; // __dirname em ESM
import { isLidUser, isPnUser, jidDecode, type WAMessageKey } from "@whiskeysockets/baileys"; // Tipos JID WhatsApp
import { normalizePhone } from "../src/utils/phone.js"; // Formato 55DDD9NUMERO

/** Resultado da resolução: telefone canônico + JID para enviar resposta. */
export type ResolvedSender = {
  phone: string | null;
  replyJid: string; // JID original do chat (pode ser LID)
};

/** Retorna pasta da sessão Baileys (env ou padrão backend/.baileys-session). */
function sessionDir(): string {
  const envDir = process.env.BAILEYS_SESSION_DIR?.trim();
  if (envDir) return envDir;
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  return resolve(root, ".baileys-session");
}

/** Lê mapeamento LID → telefone salvo pelo Baileys (ex: lid-mapping-XXX_reverse.json). */
function phoneFromLidMapping(lidUser: string): string | null {
  const file = resolve(sessionDir(), `lid-mapping-${lidUser}_reverse.json`);
  if (!existsSync(file)) return null;
  try {
    const raw = readFileSync(file, "utf8").trim().replace(/^"|"$/g, ""); // JSON string com aspas
    return normalizePhone(raw);
  } catch {
    return null; // Arquivo corrompido
  }
}

/** Extrai telefone e JID de resposta a partir da chave da mensagem Baileys. */
export function resolveWhatsAppSender(key: WAMessageKey): ResolvedSender | null {
  const remoteJid = key.remoteJid;
  if (!remoteJid) return null;

  let pnJid = remoteJid; // JID preferido com número de telefone (PN)
  const alt = key.remoteJidAlt; // JID alternativo (LID ↔ PN)

  if (isLidUser(remoteJid) && alt && isPnUser(alt)) {
    pnJid = alt; // Usa PN quando principal é LID
  } else if (!isPnUser(remoteJid) && alt && isPnUser(alt)) {
    pnJid = alt;
  }

  const userPart = jidDecode(pnJid)?.user ?? pnJid.split("@")[0]; // Parte numérica do JID
  let phone = normalizePhone(userPart);

  if (!phone && isLidUser(remoteJid)) {
    const lidUser = jidDecode(remoteJid)?.user ?? remoteJid.split("@")[0];
    phone = phoneFromLidMapping(lidUser); // Fallback: arquivo de mapeamento
  }

  return { phone, replyJid: remoteJid }; // Resposta sempre no JID original do chat
}
