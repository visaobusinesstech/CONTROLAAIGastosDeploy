/**
 * Buffer circular de logs Baileys — exposto no painel admin /admin/whatsapp.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */import { randomUUID } from "node:crypto"; // ID único para cada entrada de log

/** Níveis de severidade compatíveis com pino/Baileys. */
export type BaileysLogLevel = "debug" | "info" | "warn" | "error";

/** Estrutura de uma entrada de log exibida no frontend admin. */
export type BaileysLogEntry = {
  id: string; // UUID da entrada
  level: BaileysLogLevel; // Severidade
  message: string; // Texto legível
  meta?: Record<string, unknown>; // Dados extras (JSON) opcionais
  createdAt: string; // ISO timestamp
};

const MAX_LOGS = 500; // Limite do buffer em memória (não persiste no banco)
const buffer: BaileysLogEntry[] = []; // Array usado como fila circular (unshift + truncate)

/** Adiciona log no início do buffer; descarta os mais antigos se passar MAX_LOGS. */
export function appendBaileysLog(
  level: BaileysLogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  buffer.unshift({
    id: randomUUID(), // Identificador único para React key
    level,
    message,
    meta: meta && Object.keys(meta).length > 0 ? meta : undefined, // Omite meta vazio
    createdAt: new Date().toISOString(), // Momento do evento
  });
  if (buffer.length > MAX_LOGS) buffer.length = MAX_LOGS; // Trunca mantendo os MAX_LOGS mais recentes
}

/** Retorna os N logs mais recentes para GET /api/admin/whatsapp/baileys-logs. */
export function getBaileysLogs(limit = 100): BaileysLogEntry[] {
  const n = Math.min(Math.max(limit, 1), MAX_LOGS); // Clamp entre 1 e MAX_LOGS
  return buffer.slice(0, n); // Primeiros N (mais recentes por unshift)
}

/** Limpa buffer — útil em testes ou reset manual admin. */
export function clearBaileysLogs(): void {
  buffer.length = 0; // Esvazia array in-place
}
