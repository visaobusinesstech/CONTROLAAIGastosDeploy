/**
 * Governança — auditoria, campos LGPD e CRUD de usuários (Assinantes).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Importa apenas tipos TypeScript (não vira código no programa final)
import bcrypt from "bcryptjs"; // Importa código de outro arquivo para usar aqui
import { desc, eq } from "drizzle-orm"; // Importa código de outro arquivo para usar aqui
import { z } from "zod"; // Importa código de outro arquivo para usar aqui
import { db } from "./db/index.js"; // Importa código de outro arquivo para usar aqui
import { auditLogs, lgpdSensitiveFields, userSettings, users } from "./db/schema.js"; // Importa código de outro arquivo para usar aqui
import { authPreHandler } from "./auth.js"; // Importa código de outro arquivo para usar aqui
import { isAdminEmail, staffPreHandler, systemAdminPreHandler } from "./utils/admin.js"; // Importa código de outro arquivo para usar aqui
import { requestAuditMeta, writeAuditLog } from "./audit.js"; // Importa código de outro arquivo para usar aqui
import { applyLgpdMask, isAdminLevel, loadLgpdRules, type AccessLevel } from "./lgpd.js"; // Importa código de outro arquivo para usar aqui
import { defaultTrialEndsAt } from "../api/billing-access.js"; // Importa código de outro arquivo para usar aqui

const SALT_ROUNDS = 10; // Guarda um valor que não muda durante a execução deste trecho

const fieldPatchBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  label: z.string().min(2).max(120).optional(), // Instrução do programa — parte da lógica deste arquivo
  hideFromOperator: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  hideFromViewer: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  isActive: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

const fieldCreateBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  entity: z.string().min(2).max(64), // Instrução do programa — parte da lógica deste arquivo
  fieldName: z.string().min(1).max(64), // Instrução do programa — parte da lógica deste arquivo
  label: z.string().min(2).max(120), // Instrução do programa — parte da lógica deste arquivo
  hideFromOperator: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  hideFromViewer: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

const userPatchBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  name: z.string().min(2).max(200).optional(), // Instrução do programa — parte da lógica deste arquivo
  email: z.string().email().max(320).optional(), // Instrução do programa — parte da lógica deste arquivo
  password: z.string().min(6).max(128).optional(), // Instrução do programa — parte da lógica deste arquivo
  plan: z.enum(["free", "pro", "premium"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  accessLevel: z.enum(["user", "viewer", "operator", "admin"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  isActive: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  trialEndsAt: z.union([z.string().min(1), z.null()]).optional(), // Instrução do programa — parte da lógica deste arquivo
  billingGrandfathered: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

const userCreateBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  name: z.string().min(2).max(200), // Instrução do programa — parte da lógica deste arquivo
  email: z.string().email().max(320), // Instrução do programa — parte da lógica deste arquivo
  password: z.string().min(6).max(128), // Instrução do programa — parte da lógica deste arquivo
  plan: z.enum(["free", "pro", "premium"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  accessLevel: z.enum(["user", "viewer", "operator", "admin"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  isActive: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  trialEndsAt: z.union([z.string().min(1), z.null()]).optional(), // Instrução do programa — parte da lógica deste arquivo
  billingGrandfathered: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Rotas /api/admin/audit-logs, /lgpd/fields e CRUD usuários (Assinantes). */
export async function registerGovernanceRoutes(app: FastifyInstance): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
    r.addHook("preHandler", staffPreHandler); // admin, operator ou viewer

    /** GET /api/admin/audit-logs — inclusão/alteração/inativação. */
    r.get("/audit-logs", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const q = request.query as { limit?: string; entity?: string }; // Guarda um valor que não muda durante a execução deste trecho
      const limit = Math.min(Number(q.limit) || 100, 300); // Guarda um valor que não muda durante a execução deste trecho
      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ // Instrução do programa — parte da lógica deste arquivo
          id: auditLogs.id, // Instrução do programa — parte da lógica deste arquivo
          userId: auditLogs.userId, // Instrução do programa — parte da lógica deste arquivo
          actorName: users.name, // Instrução do programa — parte da lógica deste arquivo
          actorEmail: users.email, // Instrução do programa — parte da lógica deste arquivo
          routine: auditLogs.routine, // Instrução do programa — parte da lógica deste arquivo
          action: auditLogs.action, // Instrução do programa — parte da lógica deste arquivo
          entity: auditLogs.entity, // Instrução do programa — parte da lógica deste arquivo
          entityId: auditLogs.entityId, // Instrução do programa — parte da lógica deste arquivo
          occurredAt: auditLogs.occurredAt, // Instrução do programa — parte da lógica deste arquivo
          ipAddress: auditLogs.ipAddress, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .from(auditLogs) // Instrução do programa — parte da lógica deste arquivo
        .leftJoin(users, eq(auditLogs.userId, users.id)) // Junta outra tabela trazendo dados relacionados
        .orderBy(desc(auditLogs.occurredAt)) // Ordena o resultado (mais recente, alfabético, etc.)
        .limit(limit); // Limita quantos registros voltam da consulta

      const filtered = q.entity ? rows.filter((row) => row.entity === q.entity) : rows; // Guarda um valor que não muda durante a execução deste trecho
      const rules = await loadLgpdRules(); // Guarda um valor que não muda durante a execução deste trecho
      const level = request.user!.accessLevel; // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        logs: filtered.map((row) => { // Atribui ou calcula um valor para usar adiante
          const maskedUser = applyLgpdMask( // Guarda um valor que não muda durante a execução deste trecho
            { email: row.actorEmail } as Record<string, unknown>, // Abre bloco ou objeto com vários campos
            "users", // Instrução do programa — parte da lógica deste arquivo
            level, // Instrução do programa — parte da lógica deste arquivo
            rules, // Instrução do programa — parte da lógica deste arquivo
          ); // Fecha parêntese e encerra instrução
          const maskedAudit = applyLgpdMask( // Guarda um valor que não muda durante a execução deste trecho
            { ipAddress: row.ipAddress } as Record<string, unknown>, // Abre bloco ou objeto com vários campos
            "audit_logs", // Instrução do programa — parte da lógica deste arquivo
            level, // Instrução do programa — parte da lógica deste arquivo
            rules, // Instrução do programa — parte da lógica deste arquivo
          ); // Fecha parêntese e encerra instrução
          return { // Devolve um valor e encerra a função aqui
            ...row, // Espalha campos de outro objeto neste
            actorEmail: maskedUser.email, // Instrução do programa — parte da lógica deste arquivo
            ipAddress: maskedAudit.ipAddress, // Instrução do programa — parte da lógica deste arquivo
            occurredAt: row.occurredAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
          }; // Fecha bloco de objeto ou estrutura
        }), // Fecha parêntese de configuração e continua lista
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** GET /api/admin/lgpd/fields — cadastro de campos sensíveis. */
    r.get("/lgpd/fields", async (_request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const rows = await db.select().from(lgpdSensitiveFields).orderBy(lgpdSensitiveFields.entity); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ fields: rows }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** POST /api/admin/lgpd/fields — cadastra campo a mascarar. */
    r.post("/lgpd/fields", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      if (!isAdminLevel(request.user!.accessLevel)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(403).send({ error: "Somente admin altera cadastro LGPD" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const parsed = fieldCreateBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .insert(lgpdSensitiveFields) // Instrução do programa — parte da lógica deste arquivo
        .values({ // Informa os valores a inserir na tabela
          entity: parsed.data.entity, // Instrução do programa — parte da lógica deste arquivo
          fieldName: parsed.data.fieldName, // Instrução do programa — parte da lógica deste arquivo
          label: parsed.data.label, // Instrução do programa — parte da lógica deste arquivo
          hideFromOperator: parsed.data.hideFromOperator ?? false, // Instrução do programa — parte da lógica deste arquivo
          hideFromViewer: parsed.data.hideFromViewer ?? true, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .returning(); // Pede ao banco devolver os dados gravados
      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId: request.user!.id, // Instrução do programa — parte da lógica deste arquivo
        routine: "lgpd_sensitive_fields.create", // Instrução do programa — parte da lógica deste arquivo
        action: "insert", // Instrução do programa — parte da lógica deste arquivo
        entity: "lgpd_sensitive_fields", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método
      return reply.status(201).send({ field: row }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** PATCH /api/admin/lgpd/fields/:id — liga/desliga máscara por nível. */
    r.patch<{ Params: { id: string } }>("/lgpd/fields/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      if (!isAdminLevel(request.user!.accessLevel)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(403).send({ error: "Somente admin altera cadastro LGPD" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const parsed = fieldPatchBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const patch = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)); // Guarda um valor que não muda durante a execução deste trecho
      if (Object.keys(patch).length === 0) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Empty patch" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(lgpdSensitiveFields) // Instrução do programa — parte da lógica deste arquivo
        .set(patch) // Define quais colunas serão alteradas no UPDATE
        .where(eq(lgpdSensitiveFields.id, request.params.id)) // Filtra quais linhas do banco entram na consulta
        .returning(); // Pede ao banco devolver os dados gravados
      if (!row) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira
      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId: request.user!.id, // Instrução do programa — parte da lógica deste arquivo
        routine: "lgpd_sensitive_fields.update", // Instrução do programa — parte da lógica deste arquivo
        action: "update", // Instrução do programa — parte da lógica deste arquivo
        entity: "lgpd_sensitive_fields", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
        details: patch, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      return reply.send({ field: row }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método
  }, { prefix: "/api/admin" }); // Fecha registro de rotas informando o prefixo da URL

  /** CRUD Assinantes — exclusivo admin@admin.com */
  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
    r.addHook("preHandler", systemAdminPreHandler); // Middleware — roda antes de cada rota deste grupo

    /** POST /api/admin/users — cria assinante/usuário. */
    r.post("/users", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = userCreateBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const email = parsed.data.email.toLowerCase(); // Guarda um valor que não muda durante a execução deste trecho
      const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)); // Guarda um valor que não muda durante a execução deste trecho
      if (exists) return reply.status(409).send({ error: "Email already registered" }); // Só executa o bloco abaixo se esta condição for verdadeira

      const accessLevel = (parsed.data.accessLevel ?? "user") as AccessLevel; // Guarda um valor que não muda durante a execução deste trecho
      const plan = parsed.data.plan ?? "free"; // Guarda um valor que não muda durante a execução deste trecho
      const passwordHash = await bcrypt.hash(parsed.data.password, SALT_ROUNDS); // Guarda um valor que não muda durante a execução deste trecho
      const trialEndsAt = // Guarda um valor que não muda durante a execução deste trecho
        parsed.data.trialEndsAt === null // Instrução do programa — parte da lógica deste arquivo
          ? null // Instrução do programa — parte da lógica deste arquivo
          : parsed.data.trialEndsAt // Instrução do programa — parte da lógica deste arquivo
            ? new Date(parsed.data.trialEndsAt) // Instrução do programa — parte da lógica deste arquivo
            : isAdminEmail(email) // Instrução do programa — parte da lógica deste arquivo
              ? null // Instrução do programa — parte da lógica deste arquivo
              : defaultTrialEndsAt(); // Instrução do programa — parte da lógica deste arquivo

      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .insert(users) // Instrução do programa — parte da lógica deste arquivo
        .values({ // Informa os valores a inserir na tabela
          name: parsed.data.name.trim(), // Instrução do programa — parte da lógica deste arquivo
          email, // Instrução do programa — parte da lógica deste arquivo
          passwordHash, // Instrução do programa — parte da lógica deste arquivo
          plan, // Instrução do programa — parte da lógica deste arquivo
          accessLevel: isAdminEmail(email) ? "admin" : accessLevel, // Instrução do programa — parte da lógica deste arquivo
          isActive: parsed.data.isActive ?? true, // Instrução do programa — parte da lógica deste arquivo
          trialEndsAt, // Instrução do programa — parte da lógica deste arquivo
          billingGrandfathered: parsed.data.billingGrandfathered ?? false, // Instrução do programa — parte da lógica deste arquivo
          emailVerified: true, // Instrução do programa — parte da lógica deste arquivo
          emailVerifiedAt: new Date(), // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .returning({ // Pede ao banco devolver os dados gravados
          id: users.id, // Instrução do programa — parte da lógica deste arquivo
          name: users.name, // Instrução do programa — parte da lógica deste arquivo
          email: users.email, // Instrução do programa — parte da lógica deste arquivo
          plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
          accessLevel: users.accessLevel, // Instrução do programa — parte da lógica deste arquivo
          isActive: users.isActive, // Instrução do programa — parte da lógica deste arquivo
          trialEndsAt: users.trialEndsAt, // Instrução do programa — parte da lógica deste arquivo
          billingGrandfathered: users.billingGrandfathered, // Instrução do programa — parte da lógica deste arquivo
          createdAt: users.createdAt, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método

      await db.insert(userSettings).values({ userId: row.id }).onConflictDoNothing(); // Grava um registro novo no banco PostgreSQL
      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId: request.user!.id, // Instrução do programa — parte da lógica deste arquivo
        routine: "users.admin_create", // Instrução do programa — parte da lógica deste arquivo
        action: "insert", // Instrução do programa — parte da lógica deste arquivo
        entity: "users", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
        details: { email: row.email, accessLevel: row.accessLevel, plan: row.plan }, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      return reply.status(201).send({ // Envia resposta HTTP de volta ao navegador ou app
        user: { // Instrução do programa — parte da lógica deste arquivo
          ...row, // Espalha campos de outro objeto neste
          trialEndsAt: row.trialEndsAt?.toISOString() ?? null, // Instrução do programa — parte da lógica deste arquivo
          createdAt: row.createdAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** PATCH /api/admin/users/:id — edita nome, e-mail, senha, plano, nível, trial, status. */
    r.patch<{ Params: { id: string } }>("/users/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = userPatchBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const data = parsed.data; // Guarda um valor que não muda durante a execução deste trecho
      if (Object.values(data).every((v) => v === undefined)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Empty patch" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (request.params.id === request.user!.id && data.isActive === false) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Não é possível inativar a própria conta" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const [target] = await db.select().from(users).where(eq(users.id, request.params.id)); // Guarda um valor que não muda durante a execução deste trecho
      if (!target) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira
      if (isAdminEmail(target.email) && data.accessLevel && data.accessLevel !== "admin") { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Conta admin do sistema permanece no nível admin" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (isAdminEmail(target.email) && data.isActive === false) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Conta admin@admin.com não pode ser inativada" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (data.email) { // Só executa o bloco abaixo se esta condição for verdadeira
        const nextEmail = data.email.toLowerCase(); // Guarda um valor que não muda durante a execução deste trecho
        if (nextEmail !== target.email) { // Só executa o bloco abaixo se esta condição for verdadeira
          if (isAdminEmail(target.email)) { // Só executa o bloco abaixo se esta condição for verdadeira
            return reply.status(400).send({ error: "E-mail admin@admin.com é imutável" }); // Envia resposta HTTP de volta ao navegador ou app
          } // Fecha um bloco de código (if, função, objeto, etc.)
          const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, nextEmail)); // Guarda um valor que não muda durante a execução deste trecho
          if (dup) return reply.status(409).send({ error: "Email already registered" }); // Só executa o bloco abaixo se esta condição for verdadeira
        } // Fecha um bloco de código (if, função, objeto, etc.)
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const patch: Record<string, unknown> = {}; // Guarda um valor que não muda durante a execução deste trecho
      if (data.name !== undefined) patch.name = data.name.trim(); // Só executa o bloco abaixo se esta condição for verdadeira
      if (data.email !== undefined) patch.email = data.email.toLowerCase(); // Só executa o bloco abaixo se esta condição for verdadeira
      if (data.plan !== undefined) patch.plan = data.plan; // Só executa o bloco abaixo se esta condição for verdadeira
      if (data.accessLevel !== undefined) patch.accessLevel = data.accessLevel; // Só executa o bloco abaixo se esta condição for verdadeira
      if (data.isActive !== undefined) patch.isActive = data.isActive; // Só executa o bloco abaixo se esta condição for verdadeira
      if (data.billingGrandfathered !== undefined) patch.billingGrandfathered = data.billingGrandfathered; // Só executa o bloco abaixo se esta condição for verdadeira
      if (data.trialEndsAt !== undefined) { // Só executa o bloco abaixo se esta condição for verdadeira
        patch.trialEndsAt = data.trialEndsAt === null ? null : new Date(data.trialEndsAt); // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (data.password) patch.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS); // Só executa o bloco abaixo se esta condição for verdadeira

      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(users) // Instrução do programa — parte da lógica deste arquivo
        .set(patch) // Define quais colunas serão alteradas no UPDATE
        .where(eq(users.id, request.params.id)) // Filtra quais linhas do banco entram na consulta
        .returning({ // Pede ao banco devolver os dados gravados
          id: users.id, // Instrução do programa — parte da lógica deste arquivo
          name: users.name, // Instrução do programa — parte da lógica deste arquivo
          email: users.email, // Instrução do programa — parte da lógica deste arquivo
          plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
          accessLevel: users.accessLevel, // Instrução do programa — parte da lógica deste arquivo
          isActive: users.isActive, // Instrução do programa — parte da lógica deste arquivo
          trialEndsAt: users.trialEndsAt, // Instrução do programa — parte da lógica deste arquivo
          billingGrandfathered: users.billingGrandfathered, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
      if (!row) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira

      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      const action = // Guarda um valor que não muda durante a execução deste trecho
        data.isActive === false ? "inactivate" : data.isActive === true ? "activate" : "update"; // Instrução do programa — parte da lógica deste arquivo
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId: request.user!.id, // Instrução do programa — parte da lógica deste arquivo
        routine: "users.update", // Instrução do programa — parte da lógica deste arquivo
        action, // Instrução do programa — parte da lógica deste arquivo
        entity: "users", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
        details: { ...data, password: data.password ? "[set]" : undefined }, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        user: { // Instrução do programa — parte da lógica deste arquivo
          ...row, // Espalha campos de outro objeto neste
          trialEndsAt: row.trialEndsAt?.toISOString() ?? null, // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** DELETE /api/admin/users/:id — exclusão física (exceto admin@admin.com). */
    r.delete<{ Params: { id: string } }>("/users/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      if (request.params.id === request.user!.id) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Não é possível excluir a própria conta" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const [target] = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ id: users.id, email: users.email, name: users.name }) // Instrução do programa — parte da lógica deste arquivo
        .from(users) // Instrução do programa — parte da lógica deste arquivo
        .where(eq(users.id, request.params.id)); // Filtra quais linhas do banco entram na consulta
      if (!target) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira
      if (isAdminEmail(target.email)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Conta admin@admin.com não pode ser excluída" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId: request.user!.id, // Instrução do programa — parte da lógica deste arquivo
        routine: "users.delete", // Instrução do programa — parte da lógica deste arquivo
        action: "delete", // Instrução do programa — parte da lógica deste arquivo
        entity: "users", // Instrução do programa — parte da lógica deste arquivo
        entityId: target.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
        details: { email: target.email, name: target.name }, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      await db.delete(users).where(eq(users.id, target.id)); // Apaga registros do banco (quando permitido)
      return reply.send({ ok: true, deletedId: target.id }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método
  }, { prefix: "/api/admin" }); // Fecha registro de rotas informando o prefixo da URL
} // Fecha um bloco de código (if, função, objeto, etc.)
