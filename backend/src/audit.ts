/**
 * Auditoria de cadastros — insert/update/inactivate/activate.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { FastifyRequest } from "fastify";
import { db } from "./db/index.js";
import { auditLogs } from "./db/schema.js";

export type AuditAction = "insert" | "update" | "inactivate" | "activate";

/** Extrai IP e user-agent para gravar no log de auditoria. */
export function requestAuditMeta(request: FastifyRequest): { ipAddress: string | null; userAgent: string | null } {
  const forwarded = request.headers["x-forwarded-for"];
  const ipAddress =
    typeof forwarded === "string" && forwarded.length > 0
      ? (forwarded.split(",")[0]?.trim() ?? null)
      : (request.ip ?? null);
  const userAgent = typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : null;
  return { ipAddress, userAgent };
}

/** Persiste uma linha em audit_logs (falha não quebra a rotina de negócio). */
export async function writeAuditLog(opts: {
  userId?: string | null;
  routine: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: unknown;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: opts.userId ?? null,
      routine: opts.routine,
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId ?? null,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
      details: opts.details ?? null,
    });
  } catch (err) {
    console.error("[audit] falha ao gravar log:", err);
  }
}
