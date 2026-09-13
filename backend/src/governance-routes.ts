/**
 * Governança — auditoria, campos LGPD e CRUD de usuários (Assinantes).
 *
 * Papel no sistema: Módulo backend Fastify — registrado ou importado por index.ts.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Importa apenas tipos TypeScript (não vira código no programa final)
import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/index.js";
import { auditLogs, lgpdSensitiveFields, userSettings, users } from "./db/schema.js";
import { authPreHandler } from "./auth.js";
import { isAdminEmail, staffPreHandler, systemAdminPreHandler } from "./utils/admin.js";
import { requestAuditMeta, writeAuditLog } from "./audit.js";
import { applyLgpdMask, isAdminLevel, loadLgpdRules, type AccessLevel } from "./lgpd.js";
import { defaultTrialEndsAt } from "../api/billing-access.js";

const SALT_ROUNDS = 10;
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
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().max(320).optional(),
  password: z.string().min(6).max(128).optional(),
  plan: z.enum(["free", "pro", "premium"]).optional(),
  accessLevel: z.enum(["user", "viewer", "operator", "admin"]).optional(),
  isActive: z.boolean().optional(),
  trialEndsAt: z.union([z.string().min(1), z.null()]).optional(),
  billingGrandfathered: z.boolean().optional(),
});

const userCreateBody = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(320),
  password: z.string().min(6).max(128),
  plan: z.enum(["free", "pro", "premium"]).optional(),
  accessLevel: z.enum(["user", "viewer", "operator", "admin"]).optional(),
  isActive: z.boolean().optional(),
  trialEndsAt: z.union([z.string().min(1), z.null()]).optional(),
  billingGrandfathered: z.boolean().optional(),
});

/** Rotas /api/admin/audit-logs, /lgpd/fields e CRUD usuários (Assinantes). */
export async function registerGovernanceRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
    r.addHook("preHandler", staffPreHandler); // admin, operator ou viewer
    /** GET /api/admin/audit-logs — inclusão/alteração/inativação. */
    r.get("/audit-logs", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
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
        .leftJoin(users, eq(auditLogs.userId, users.id)) // Junta outra tabela trazendo dados relacionados
        .orderBy(desc(auditLogs.occurredAt)) // Ordena o resultado (mais recente, alfabético, etc.)
        .limit(limit); // Limita quantos registros voltam da consulta
      const filtered = q.entity ? rows.filter((row) => row.entity === q.entity) : rows;
      const rules = await loadLgpdRules();
      const level = request.user!.accessLevel;
      return reply.send({
        logs: filtered.map((row) => {
          const maskedUser = applyLgpdMask(
            { email: row.actorEmail } as Record<string, unknown>, // Abre bloco ou objeto com vários campos
            "users",
            level,
            rules,
          );
          const maskedAudit = applyLgpdMask(
            { ipAddress: row.ipAddress } as Record<string, unknown>, // Abre bloco ou objeto com vários campos
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
    r.get("/lgpd/fields", async (_request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const rows = await db.select().from(lgpdSensitiveFields).orderBy(lgpdSensitiveFields.entity);
      return reply.send({ fields: rows });
    });
    /** POST /api/admin/lgpd/fields — cadastra campo a mascarar. */
    r.post("/lgpd/fields", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
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
    r.patch<{ Params: { id: string } }>("/lgpd/fields/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
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
  }, { prefix: "/api/admin" }); // Fecha registro de rotas informando o prefixo da URL
  /** CRUD Assinantes — exclusivo admin@admin.com */
  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
    r.addHook("preHandler", systemAdminPreHandler); // Middleware — roda antes de cada rota deste grupo
    /** POST /api/admin/users — cria assinante/usuário. */
    r.post("/users", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = userCreateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const email = parsed.data.email.toLowerCase();
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      if (exists) return reply.status(409).send({ error: "Email already registered" });
      const accessLevel = (parsed.data.accessLevel ?? "user") as AccessLevel;
      const plan = parsed.data.plan ?? "free";
      const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS);
      const trialEndsAt =
        parsed.data.trialEndsAt === null
          ? null
          : parsed.data.trialEndsAt
            ? new Date(parsed.data.trialEndsAt)
            : isAdminEmail(email)
              ? null
              : defaultTrialEndsAt();
      const [row] = await db
        .insert(users)
        .values({
          name: parsed.data.name.trim(),
          email,
          passwordHash,
          plan,
          accessLevel: isAdminEmail(email) ? "admin" : accessLevel,
          isActive: parsed.data.isActive ?? true,
          trialEndsAt,
          billingGrandfathered: parsed.data.billingGrandfathered ?? false,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          plan: users.plan,
          accessLevel: users.accessLevel,
          isActive: users.isActive,
          trialEndsAt: users.trialEndsAt,
          billingGrandfathered: users.billingGrandfathered,
          createdAt: users.createdAt,
        });
      await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing(); // Grava um registro novo no banco PostgreSQL
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId: request.user!.id,
        routine: "users.admin_create",
        action: "insert",
        entity: "users",
        entityId: row.id,
        ...meta,
        details: { email: row.email, accessLevel: row.accessLevel, plan: row.plan },
      });
      return reply.status(201).send({
        user: {
          ...row,
          trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
        },
      });
    });
    /** PATCH /api/admin/users/:id — edita nome, e-mail, senha, plano, nível, trial, status. */
    r.patch<{ Params: { id: string } }>("/users/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = userPatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const data = parsed.data;
      if (Object.values(data).every((v) => v === undefined)) {
        return reply.status(400).send({ error: "Empty patch" });
      }
      if (request.params.id === request.user!.id && data.isActive === false) {
        return reply.status(400).send({ error: "Não é possível inativar a própria conta" });
      }
      const [target] = await db.select().from(users).where(eq(users.id, request.params.id));
      if (!target) return reply.status(404).send({ error: "Not found" });
      if (isAdminEmail(target.email) && data.accessLevel && data.accessLevel !== "admin") {
        return reply.status(400).send({ error: "Conta admin do sistema permanece no nível admin" });
      }
      if (isAdminEmail(target.email) && data.isActive === false) {
        return reply.status(400).send({ error: "Conta admin@admin.com não pode ser inativada" });
      }
      if (data.email) {
        const nextEmail = data.email.toLowerCase();
        if (nextEmail !== target.email) {
          if (isAdminEmail(target.email)) {
            return reply.status(400).send({ error: "E-mail admin@admin.com é imutável" });
          }
          const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, nextEmail));
          if (dup) return reply.status(409).send({ error: "Email already registered" });
        }
      }
      const patch: Record<string, unknown> = {};
      if (data.name !== undefined) patch.name = data.name.trim();
      if (data.email !== undefined) patch.email = data.email.toLowerCase();
      if (data.plan !== undefined) patch.plan = data.plan;
      if (data.accessLevel !== undefined) patch.accessLevel = data.accessLevel;
      if (data.isActive !== undefined) patch.isActive = data.isActive;
      if (data.billingGrandfathered !== undefined) patch.billingGrandfathered = data.billingGrandfathered;
      if (data.trialEndsAt !== undefined) {
        patch.trialEndsAt = data.trialEndsAt === null ? null : new Date(data.trialEndsAt);
      }
      if (data.password) patch.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
      const [row] = await db
        .update(users)
        .set(patch)
        .where(eq(users.id, request.params.id))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          plan: users.plan,
          accessLevel: users.accessLevel,
          isActive: users.isActive,
          trialEndsAt: users.trialEndsAt,
          billingGrandfathered: users.billingGrandfathered,
        });
      if (!row) return reply.status(404).send({ error: "Not found" });
      const meta = requestAuditMeta(request);
      const action =
        data.isActive === false ? "inactivate" : data.isActive === true ? "activate" : "update";
      await writeAuditLog({
        userId: request.user!.id,
        routine: "users.update",
        action,
        entity: "users",
        entityId: row.id,
        ...meta,
        details: { ...data, password: data.password ? "[set]" : undefined },
      });
      return reply.send({
        user: {
          ...row,
          trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
        },
      });
    });
    /** DELETE /api/admin/users/:id — exclusão física (exceto admin@admin.com). */
    r.delete<{ Params: { id: string } }>("/users/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      if (request.params.id === request.user!.id) {
        return reply.status(400).send({ error: "Não é possível excluir a própria conta" });
      }
      const [target] = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, request.params.id));
      if (!target) return reply.status(404).send({ error: "Not found" });
      if (isAdminEmail(target.email)) {
        return reply.status(400).send({ error: "Conta admin@admin.com não pode ser excluída" });
      }
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId: request.user!.id,
        routine: "users.delete",
        action: "delete",
        entity: "users",
        entityId: target.id,
        ...meta,
        details: { email: target.email, name: target.name },
      });
      await db.delete(users).where(eq(users.id, target.id)); // Apaga registros do banco (quando permitido)
      return reply.send({ ok: true, deletedId: target.id });
    });
  }, { prefix: "/api/admin" }); // Fecha registro de rotas informando o prefixo da URL
}
