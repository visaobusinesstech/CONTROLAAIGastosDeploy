/**
 * Buffer circular de logs Baileys — exposto no painel admin /admin/whatsapp.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

import { randomUUID } from "node:crypto"; // Gera identificador único para cada entrada de log

/** Níveis de severidade compatíveis com pino/Baileys. */
export type BaileysLogLevel = "debug" | "info" | "warn" | "error"; // Exporta um tipo de dados para outros arquivos usarem

/** Estrutura de uma entrada de log exibida no frontend admin. */
export type BaileysLogEntry = { // Exporta um tipo de dados para outros arquivos usarem
  id: string; // UUID da entrada
  level: BaileysLogLevel; // Severidade
  message: string; // Texto legível
  meta?: Record<string, unknown>; // Dados extras (JSON) opcionais
  createdAt: string; // ISO timestamp
}; // Fecha bloco de objeto ou estrutura

const MAX_LOGS = 500; // Limite do buffer em memória (não persiste no banco)
const buffer: BaileysLogEntry[] = []; // Array usado como fila circular (unshift + truncate)

/** Adiciona log no início do buffer; descarta os mais antigos se passar MAX_LOGS. */
export function appendBaileysLog( // Função exportada — pode ser usada em outros arquivos
  level: BaileysLogLevel, // Instrução do programa — parte da lógica deste arquivo
  message: string, // Instrução do programa — parte da lógica deste arquivo
  meta?: Record<string, unknown>, // Instrução do programa — parte da lógica deste arquivo
): void { // Fecha parêntese aberto antes
  buffer.unshift({ // Instrução do programa — parte da lógica deste arquivo
    id: randomUUID(), // Identificador único para React key
    level, // Instrução do programa — parte da lógica deste arquivo
    message, // Instrução do programa — parte da lógica deste arquivo
    meta: meta && Object.keys(meta).length > 0 ? meta : undefined, // Omite meta vazio
    createdAt: new Date().toISOString(), // Momento do evento
  }); // Fecha chamada de função ou método
  if (buffer.length > MAX_LOGS) buffer.length = MAX_LOGS; // Trunca mantendo os MAX_LOGS mais recentes
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Retorna os N logs mais recentes para GET /api/admin/whatsapp/baileys-logs. */
export function getBaileysLogs(limit = 100): BaileysLogEntry[] { // Função exportada — pode ser usada em outros arquivos
  const n = Math.min(Math.max(limit, 1), MAX_LOGS); // Clamp entre 1 e MAX_LOGS
  return buffer.slice(0, n); // Primeiros N (mais recentes por unshift)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Limpa buffer — útil em testes ou reset manual admin. */
export function clearBaileysLogs(): void { // Função exportada — pode ser usada em outros arquivos
  buffer.length = 0; // Esvazia array in-place
} // Fecha um bloco de código (if, função, objeto, etc.)
