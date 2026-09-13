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
export type ResolvedSender = { // Exporta um tipo de dados para outros arquivos usarem
  phone: string | null; // Instrução do programa — parte da lógica deste arquivo
  replyJid: string; // JID original do chat (pode ser LID)
}; // Fecha bloco de objeto ou estrutura

/** Retorna pasta da sessão Baileys (env ou padrão backend/.baileys-session). */
function sessionDir(): string { // Bloco de código reutilizável com um nome
  const envDir = process.env.BAILEYS_SESSION_DIR?.trim(); // Guarda um valor que não muda durante a execução deste trecho
  if (envDir) return envDir; // Só executa o bloco abaixo se esta condição for verdadeira
  const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // Guarda um valor que não muda durante a execução deste trecho
  return resolve(root, ".baileys-session"); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Lê mapeamento LID → telefone salvo pelo Baileys (ex: lid-mapping-XXX_reverse.json). */
function phoneFromLidMapping(lidUser: string): string | null { // Bloco de código reutilizável com um nome
  const file = resolve(sessionDir(), `lid-mapping-${lidUser}_reverse.json`); // Guarda um valor que não muda durante a execução deste trecho
  if (!existsSync(file)) return null; // Só executa o bloco abaixo se esta condição for verdadeira
  try { // Tenta executar código que pode falhar
    const raw = readFileSync(file, "utf8").trim().replace(/^"|"$/g, ""); // JSON string com aspas
    return normalizePhone(raw); // Devolve um valor e encerra a função aqui
  } catch { // Fecha bloco iniciado anteriormente
    return null; // Arquivo corrompido
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Extrai telefone e JID de resposta a partir da chave da mensagem Baileys. */
export function resolveWhatsAppSender(key: WAMessageKey): ResolvedSender | null { // Função exportada — pode ser usada em outros arquivos
  const remoteJid = key.remoteJid; // Guarda um valor que não muda durante a execução deste trecho
  if (!remoteJid) return null; // Só executa o bloco abaixo se esta condição for verdadeira

  let pnJid = remoteJid; // JID preferido com número de telefone (PN)
  const alt = key.remoteJidAlt; // JID alternativo (LID ↔ PN)

  if (isLidUser(remoteJid) && alt && isPnUser(alt)) { // Só executa o bloco abaixo se esta condição for verdadeira
    pnJid = alt; // Usa PN quando principal é LID
  } else if (!isPnUser(remoteJid) && alt && isPnUser(alt)) { // Fecha bloco iniciado anteriormente
    pnJid = alt; // Atribui ou calcula um valor para usar adiante
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const userPart = jidDecode(pnJid)?.user ?? pnJid.split("@")[0]; // Parte numérica do JID
  let phone = normalizePhone(userPart); // Variável que pode mudar de valor conforme o programa roda

  if (!phone && isLidUser(remoteJid)) { // Só executa o bloco abaixo se esta condição for verdadeira
    const lidUser = jidDecode(remoteJid)?.user ?? remoteJid.split("@")[0]; // Guarda um valor que não muda durante a execução deste trecho
    phone = phoneFromLidMapping(lidUser); // Fallback: arquivo de mapeamento
  } // Fecha um bloco de código (if, função, objeto, etc.)

  return { phone, replyJid: remoteJid }; // Resposta sempre no JID original do chat
} // Fecha um bloco de código (if, função, objeto, etc.)
