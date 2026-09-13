/**
 * Auditoria de cadastros — insert/update/inactivate/activate.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { FastifyRequest } from "fastify"; // Importa apenas tipos TypeScript (não vira código no programa final)
import { db } from "./db/index.js"; // Importa código de outro arquivo para usar aqui
import { auditLogs } from "./db/schema.js"; // Importa código de outro arquivo para usar aqui

export type AuditAction = "insert" | "update" | "inactivate" | "activate" | "delete"; // Exporta um tipo de dados para outros arquivos usarem

/** Extrai IP e user-agent para gravar no log de auditoria. */
export function requestAuditMeta(request: FastifyRequest): { ipAddress: string | null; userAgent: string | null } { // Função exportada — pode ser usada em outros arquivos
  const forwarded = request.headers["x-forwarded-for"]; // Guarda um valor que não muda durante a execução deste trecho
  const ipAddress = // Guarda um valor que não muda durante a execução deste trecho
    typeof forwarded === "string" && forwarded.length > 0 // Instrução do programa — parte da lógica deste arquivo
      ? (forwarded.split(",")[0]?.trim() ?? null) // Instrução do programa — parte da lógica deste arquivo
      : (request.ip ?? null); // Instrução do programa — parte da lógica deste arquivo
  const userAgent = typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null; // Guarda um valor que não muda durante a execução deste trecho
  return { ipAddress, userAgent }; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Persiste uma linha em audit_logs (falha não quebra a rotina de negócio). */
export async function writeAuditLog(opts: { // Função assíncrona exportada — outros módulos podem chamar
  userId?: string | null; // Instrução do programa — parte da lógica deste arquivo
  routine: string; // Instrução do programa — parte da lógica deste arquivo
  action: AuditAction; // Instrução do programa — parte da lógica deste arquivo
  entity: string; // Instrução do programa — parte da lógica deste arquivo
  entityId?: string | null; // Instrução do programa — parte da lógica deste arquivo
  ipAddress?: string | null; // Instrução do programa — parte da lógica deste arquivo
  userAgent?: string | null; // Instrução do programa — parte da lógica deste arquivo
  details?: unknown; // Instrução do programa — parte da lógica deste arquivo
}): Promise<void> { // Fecha bloco iniciado anteriormente
  try { // Tenta executar código que pode falhar
    await db.insert(auditLogs).values({ // Grava um registro novo no banco PostgreSQL
      userId: opts.userId ?? null, // Instrução do programa — parte da lógica deste arquivo
      routine: opts.routine, // Instrução do programa — parte da lógica deste arquivo
      action: opts.action, // Instrução do programa — parte da lógica deste arquivo
      entity: opts.entity, // Instrução do programa — parte da lógica deste arquivo
      entityId: opts.entityId ?? null, // Instrução do programa — parte da lógica deste arquivo
      ipAddress: opts.ipAddress ?? null, // Instrução do programa — parte da lógica deste arquivo
      userAgent: opts.userAgent ?? null, // Instrução do programa — parte da lógica deste arquivo
      details: opts.details ?? null, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
  } catch (err) { // Fecha bloco iniciado anteriormente
    console.error("[audit] falha ao gravar log:", err); // Escreve mensagem no terminal para diagnóstico
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)
