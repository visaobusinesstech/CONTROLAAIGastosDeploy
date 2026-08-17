/**
 * Governança — auditoria, campos LGPD e níveis de usuário (ativar/inativar).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/index.js";
import { auditLogs, lgpdSensitiveFields, users } from "./db/schema.js";
import { authPreHandler } from "./auth.js";
import { isAdminEmail, staffPreHandler } from "./utils/admin.js";
import { requestAuditMeta, writeAuditLog } from "./audit.js";
import { applyLgpdMask, isAdminLevel, loadLgpdRules, type AccessLevel } from "./lgpd.js";

const fieldPatchBody = z.object({
  label: z.string().min(2).max(120).optional(),
  hideFromOperator: z.boolean().optional(),
  hideFromViewer: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const fieldCreateBody = z.object({
  entity: z.string().min(2).max(64),
  fieldName: z.string().min(1).max(64),
  label: z.string().min(2).max(120),
  hideFromOperator: z.boolean().optional(),
  hideFromViewer: z.boolean().optional(),
});

const userPatchBody = z.object({
  accessLevel: z.enum(["user", "viewer", "operator", "admin"]).optional(),
  isActive: z.boolean().optional(),
});

/** Rotas /api/admin/audit-logs, /lgpd/fields e PATCH usuários. */
export async function registerGovernanceRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (r) => {
    r.addHook("preHandler", authPreHandler);
    r.addHook("preHandler", staffPreHandler); // admin, operator ou viewer

    /** GET /api/admin/audit-logs — inclusão/alteração/inativação. */
    r.get("/audit-logs", async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as { limit?: string; entity?: string };
      const limit = Math.min(Number(q.limit) || 100, 300);
      const rows = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          actorName: users.name,
          actorEmail: users.email,
          routine: auditLogs.routine,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          occurredAt: auditLogs.occurredAt,
          ipAddress: auditLogs.ipAddress,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.occurredAt))
        .limit(limit);

      const filtered = q.entity ? rows.filter((row) => row.entity === q.entity) : rows;
      const rules = await loadLgpdRules();
      const level = request.user!.accessLevel;
      return reply.send({
        logs: filtered.map((row) => {
          const maskedUser = applyLgpdMask(
            { email: row.actorEmail } as Record<string, unknown>,
            "users",
            level,
            rules,
          );
          const maskedAudit = applyLgpdMask(
            { ipAddress: row.ipAddress } as Record<string, unknown>,
            "audit_logs",
            level,
            rules,
          );
          return {
            ...row,
            actorEmail: maskedUser.email,
            ipAddress: maskedAudit.ipAddress,
            occurredAt: row.occurredAt.toISOString(),
          };
        }),
      });
    });

    /** GET /api/admin/lgpd/fields — cadastro de campos sensíveis. */
    r.get("/lgpd/fields", async (_request, reply) => {
      const rows = await db.select().from(lgpdSensitiveFields).orderBy(lgpdSensitiveFields.entity);
      return reply.send({ fields: rows });
    });

    /** POST /api/admin/lgpd/fields — cadastra campo a mascarar. */
    r.post("/lgpd/fields", async (request: FastifyRequest, reply: FastifyReply) => {
      if (!isAdminLevel(request.user!.accessLevel)) {
        return reply.status(403).send({ error: "Somente admin altera cadastro LGPD" });
      }
      const parsed = fieldCreateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const [row] = await db
        .insert(lgpdSensitiveFields)
        .values({
          entity: parsed.data.entity,
          fieldName: parsed.data.fieldName,
          label: parsed.data.label,
          hideFromOperator: parsed.data.hideFromOperator ?? false,
          hideFromViewer: parsed.data.hideFromViewer ?? true,
        })
        .returning();
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId: request.user!.id,
        routine: "lgpd_sensitive_fields.create",
        action: "insert",
        entity: "lgpd_sensitive_fields",
        entityId: row.id,
        ...meta,
      });
      return reply.status(201).send({ field: row });
    });

    /** PATCH /api/admin/lgpd/fields/:id — liga/desliga máscara por nível. */
    r.patch<{ Params: { id: string } }>("/lgpd/fields/:id", async (request, reply) => {
      if (!isAdminLevel(request.user!.accessLevel)) {
        return reply.status(403).send({ error: "Somente admin altera cadastro LGPD" });
      }
      const parsed = fieldPatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined));
      if (Object.keys(patch).length === 0) {
        return reply.status(400).send({ error: "Empty patch" });
      }
      const [row] = await db
        .update(lgpdSensitiveFields)
        .set(patch)
        .where(eq(lgpdSensitiveFields.id, request.params.id))
        .returning();
      if (!row) return reply.status(404).send({ error: "Not found" });
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId: request.user!.id,
        routine: "lgpd_sensitive_fields.update",
        action: "update",
        entity: "lgpd_sensitive_fields",
        entityId: row.id,
        ...meta,
        details: patch,
      });
      return reply.send({ field: row });
    });

    /** PATCH /api/admin/users/:id — nível de acesso e ativar/inativar cadastro. */
    r.patch<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
      if (!isAdminLevel(request.user!.accessLevel)) {
        return reply.status(403).send({ error: "Somente admin altera nível/status" });
      }
      const parsed = userPatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const { accessLevel, isActive } = parsed.data;
      if (accessLevel === undefined && isActive === undefined) {
        return reply.status(400).send({ error: "Empty patch" });
      }
      if (request.params.id === request.user!.id && isActive === false) {
        return reply.status(400).send({ error: "Não é possível inativar a própria conta" });
      }
      const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, request.params.id));
      if (!target) return reply.status(404).send({ error: "Not found" });
      if (isAdminEmail(target.email) && accessLevel && accessLevel !== "admin") {
        return reply.status(400).send({ error: "Conta admin do sistema permanece no nível admin" });
      }
      const patch: { accessLevel?: AccessLevel; isActive?: boolean } = {};
      if (accessLevel !== undefined) patch.accessLevel = accessLevel;
      if (isActive !== undefined) patch.isActive = isActive;
      const [row] = await db.update(users).set(patch).where(eq(users.id, request.params.id)).returning({
        id: users.id,
        name: users.name,
        email: users.email,
        accessLevel: users.accessLevel,
        isActive: users.isActive,
      });
      if (!row) return reply.status(404).send({ error: "Not found" });
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId: request.user!.id,
        routine: "users.update",
        action: isActive === false ? "inactivate" : isActive === true ? "activate" : "update",
        entity: "users",
        entityId: row.id,
        ...meta,
        details: patch,
      });
      return reply.send({ user: row });
    });
  }, { prefix: "/api/admin" });
}
