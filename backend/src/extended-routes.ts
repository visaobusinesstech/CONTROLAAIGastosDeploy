/**
 * Rotas estendidas — IA, KPIs, metas, imports, conversas WhatsApp do usuário.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Prefixo: /api/* | Admin IA: /api/admin/ai/*
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Tipos HTTP
import { desc, eq, sql, and, gte } from "drizzle-orm"; // Operadores SQL
import { z } from "zod"; // Validação JSON
import { db } from "./db/index.js"; // Cliente PostgreSQL
import { aiConversations, aiLogs, documentImports, goals, categories, whatsappMessages, whatsappConnection, users } from "./db/schema.js"; // Tabelas IA/WA/imports
import { authPreHandler } from "./auth.js"; // Middleware JWT
import { adminPreHandler, staffPreHandler, userIsAdmin } from "./utils/admin.js"; // Gate admin e staff
import { applyLgpdMask, isStaffLevel, loadLgpdRules } from "./lgpd.js";
import { requestAuditMeta, writeAuditLog } from "./audit.js";
import {
  buildWebChatWelcomeMessage,
  buildWebChatWelcomeMessageForUser,
  processFinancialAgentMessage,
} from "../api/financial-agent.js"; // Agente conversacional web
import { parseDocumentText } from "../api/parser.js"; // Parser OpenAI para PDF
import { createBulkTransactions } from "../api/transaction-service.js"; // Import em lote
import { getTopCategories, getUserPreferences } from "../api/financial-memory.js"; // Memória financeira
import { extractPdfText } from "../api/media-processor.js"; // Extração texto PDF
import { computeFinancialKpis, generateInsights, generatePeriodReport } from "../api/insights.js"; // Dashboard inteligente
import { getEnrichedGoals, computeGoalDeadline } from "./goals-service.js"; // Metas com progresso
import { num } from "./utils/money.js"; // Parse numeric
import {
  AVAILABLE_OPENAI_MODELS,
  clearRuntimeOpenAIModel,
  getEffectiveOpenAIModel,
  getEnvOpenAIModel,
  getRuntimeOpenAIModel,
  setRuntimeOpenAIModel,
} from "../api/runtime-config.js"; // Override modelo OpenAI admin
import { getBillingAccess } from "../api/billing-access.js";
import { billingAccessPreHandler } from "./billing-routes.js";
import { getOpenAIModel, isOpenAIConfigured } from "../api/openai-client.js"; // Cliente OpenAI

/** Schema Zod — POST /api/ai/chat */
const chatMessageBody = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});

/** Schema Zod — POST /api/goals */
const goalCreateBody = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid().nullable().optional(),
  limitAmount: z.union([z.string(), z.number()]).transform(String),
  periodType: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  goalType: z.enum(["limit", "saving"]).optional(),
  targetAmount: z.union([z.string(), z.number()]).transform(String).nullable().optional(),
  durationMonths: z.number().int().min(1).max(360).nullable().optional(),
  color: z.string().optional(),
});

/** Registra rotas estendidas (/api) e admin IA (/api/admin/ai). */
export async function registerExtendedRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (r) => {
    r.addHook("preHandler", authPreHandler); // JWT obrigatório

    /** GET /api/me/capabilities — flags de features para o frontend. */
    r.get("/me/capabilities", async (request: FastifyRequest, reply: FastifyReply) => {
      const [waRow] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main"));
      const waConnected = waRow?.status === "connected";
      const billing = await getBillingAccess(request.user!.id, request.user!.email);

      return reply.send({
        isAdmin: userIsAdmin(request.user),
        isStaff: userIsAdmin(request.user) || isStaffLevel(request.user!.accessLevel),
        accessLevel: request.user!.accessLevel,
        whatsappEnabled: process.env.ENABLE_WHATSAPP !== "false",
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
        /** Número público do bot — visível para usuários comuns enviarem mensagens */
        whatsappBotPhone: waConnected ? waRow?.phoneNumber ?? null : null,
        whatsappConnected: waConnected,
        billing,
      });
    });

    // --- AI Chat ---

    /** GET /api/ai/welcome — mensagem inicial personalizada do chat web. */
    r.get("/ai/welcome", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
      const message = await buildWebChatWelcomeMessageForUser(userId, user?.name);
      return reply.send({ message });
    });

    /** GET /api/ai/conversations — histórico de conversas IA (50 mais recentes). */
    r.get("/ai/conversations", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const rows = await db
        .select()
        .from(aiConversations)
        .where(and(eq(aiConversations.userId, userId), eq(aiConversations.isActive, true)))
        .orderBy(desc(aiConversations.updatedAt))
        .limit(50);

      return reply.send({
        conversations: rows.map((c) => ({
          id: c.id,
          title: c.title,
          contextMonth: c.contextMonth,
          messages: c.messages,
          updatedAt: c.updatedAt.toISOString(),
        })),
      });
    });

    /** DELETE /api/ai/conversations/:id — inativa conversa (sem exclusão física). */
    r.delete<{ Params: { id: string } }>("/ai/conversations/:id", async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params;
      const [row] = await db
        .update(aiConversations)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId), eq(aiConversations.isActive, true)))
        .returning({ id: aiConversations.id });
      if (!row) return reply.status(404).send({ error: "Conversation not found" });
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: "ai_conversations.inactivate",
        action: "inactivate",
        entity: "ai_conversations",
        entityId: id,
        ...meta,
      });
      return reply.send({ ok: true, inactivated: true });
    });

    /** POST /api/ai/chat — envia mensagem ao agente financeiro web. */
    r.post("/ai/chat", { preHandler: billingAccessPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = chatMessageBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const { message, conversationId } = parsed.data;

      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));

      let conversation: typeof aiConversations.$inferSelect | undefined;
      if (conversationId) {
        [conversation] = await db
          .select()
          .from(aiConversations)
          .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId), eq(aiConversations.isActive, true)));
      }

      const history = (conversation?.messages as Array<{ role: string; content: string }>) ?? [];

      const agentResult = await processFinancialAgentMessage(userId, message, {
        userName: user?.name,
      });

      const now = new Date().toISOString();
      const newMessages = [
        ...history,
        { role: "user", content: message, timestamp: now },
        { role: "assistant", content: agentResult.response, timestamp: now },
      ];

      if (conversation) {
        await db
          .update(aiConversations)
          .set({ messages: newMessages, updatedAt: new Date() })
          .where(eq(aiConversations.id, conversation.id));
      } else {
        const [created] = await db
          .insert(aiConversations)
          .values({
            userId,
            title: message.slice(0, 60), // Primeiros 60 chars como título
            messages: newMessages,
          })
          .returning();
        conversation = created;
      }

      const chatMeta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: conversationId ? "ai_conversations.update" : "ai_conversations.create",
        action: conversationId ? "update" : "insert",
        entity: "ai_conversations",
        entityId: conversation!.id,
        ...chatMeta,
      });

      return reply.send({
        conversationId: conversation!.id,
        response: agentResult.response,
        transactionCreated: agentResult.transactionCreated,
      });
    });

    // --- KPIs & Insights ---

    /** GET /api/insights/kpis — indicadores financeiros do mês. */
    r.get("/insights/kpis", async (request: FastifyRequest, reply: FastifyReply) => {
      const kpis = await computeFinancialKpis(request.user!.id);
      return reply.send({ kpis });
    });

    /** GET /api/insights/list — insights gerados por IA/heurística. */
    r.get("/insights/list", async (request: FastifyRequest, reply: FastifyReply) => {
      const insights = await generateInsights(request.user!.id);
      return reply.send({ insights });
    });

    /** GET /api/insights/report?period= — relatório semanal/mensal/anual. */
    r.get("/insights/report", async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as { period?: string };
      const period = q.period === "weekly" || q.period === "yearly" ? q.period : "monthly";
      const report = await generatePeriodReport(request.user!.id, period);
      return reply.send({ report, period });
    });

    /** GET /api/insights/memory — preferências e categorias mais usadas. */
    r.get("/insights/memory", async (request: FastifyRequest, reply: FastifyReply) => {
      const prefs = await getUserPreferences(request.user!.id);
      const topCategories = await getTopCategories(request.user!.id);
      return reply.send({ preferences: prefs, topCategories });
    });

    // --- Goals ---

    /** GET /api/goals — metas com progresso calculado. */
    r.get("/goals", async (request: FastifyRequest, reply: FastifyReply) => {
      const goalsList = await getEnrichedGoals(request.user!.id);
      return reply.send({ goals: goalsList });
    });

    /** POST /api/goals — cria meta financeira. */
    r.post("/goals", { preHandler: billingAccessPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = goalCreateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const d = parsed.data;
      const durationMonths = d.durationMonths ?? null;
      const now = new Date();
      const deadlineAt =
        durationMonths != null ? computeGoalDeadline(now, durationMonths) : null;

      const [row] = await db
        .insert(goals)
        .values({
          userId,
          name: d.name,
          categoryId: d.categoryId ?? null,
          limitAmount: d.limitAmount,
          periodType: d.periodType ?? "monthly",
          goalType: d.goalType ?? "limit",
          targetAmount: d.targetAmount ?? null,
          durationMonths,
          deadlineAt,
          color: d.color ?? "#6366f1",
        })
        .returning();

      const goalMeta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: "goals.create",
        action: "insert",
        entity: "goals",
        entityId: row.id,
        ...goalMeta,
      });

      return reply.status(201).send({
        goal: {
          id: row.id,
          name: row.name,
          limitAmount: num(row.limitAmount),
          goalType: row.goalType,
        },
      });
    });

    /** PATCH /api/goals/:id — inativa/reativa meta (sem exclusão). */
    r.patch<{ Params: { id: string } }>("/goals/:id", async (request, reply) => {
      const parsed = z.object({ isActive: z.boolean() }).safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const [row] = await db
        .update(goals)
        .set({ isActive: parsed.data.isActive })
        .where(and(eq(goals.id, request.params.id), eq(goals.userId, userId)))
        .returning({ id: goals.id, isActive: goals.isActive });
      if (!row) return reply.status(404).send({ error: "Not found" });
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: parsed.data.isActive ? "goals.activate" : "goals.inactivate",
        action: parsed.data.isActive ? "activate" : "inactivate",
        entity: "goals",
        entityId: row.id,
        ...meta,
      });
      return reply.send({ goal: row });
    });

    // --- User WhatsApp conversations ---

    /** GET /api/whatsapp/conversations — histórico WA do usuário logado. */
    r.get("/whatsapp/conversations", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const rows = await db
        .select()
        .from(whatsappMessages)
        .where(eq(whatsappMessages.userId, userId))
        .orderBy(desc(whatsappMessages.createdAt))
        .limit(100);

      return reply.send({
        messages: rows.map((m) => ({
          id: m.id,
          direction: m.direction,
          messageType: m.messageType,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    });

    // --- Imports ---

    /** GET /api/imports — lista importações PDF do usuário. */
    r.get("/imports", async (request: FastifyRequest, reply: FastifyReply) => {
      const rows = await db
        .select()
        .from(documentImports)
        .where(and(eq(documentImports.userId, request.user!.id), eq(documentImports.isActive, true)))
        .orderBy(desc(documentImports.createdAt))
        .limit(50);

      return reply.send({
        imports: rows.map((i) => ({
          id: i.id,
          fileName: i.fileName,
          fileType: i.fileType,
          status: i.status,
          transactionsCreated: i.transactionsCreated,
          errorMessage: i.errorMessage,
          createdAt: i.createdAt.toISOString(),
        })),
      });
    });

    /** POST /api/imports/pdf — upload base64, extrai e cria transações. */
    r.post("/imports/pdf", async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { fileName?: string; contentBase64?: string };
      if (!body.contentBase64 || !body.fileName) {
        return reply.status(400).send({ error: "fileName and contentBase64 required" });
      }

      const userId = request.user!.id;
      const buffer = Buffer.from(body.contentBase64, "base64");

      const [importRow] = await db
        .insert(documentImports)
        .values({
          userId,
          fileName: body.fileName,
          fileType: "application/pdf",
          status: "processing",
        })
        .returning();

      try {
        const text = await extractPdfText(buffer);
        const parsed = await parseDocumentText(text, userId);
        const count = await createBulkTransactions(userId, parsed);

        await db
          .update(documentImports)
          .set({ status: "completed", extractedText: text.slice(0, 5000), transactionsCreated: count })
          .where(eq(documentImports.id, importRow.id));

        return reply.send({ ok: true, importId: importRow.id, transactionsCreated: count });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await db
          .update(documentImports)
          .set({ status: "failed", errorMessage: msg })
          .where(eq(documentImports.id, importRow.id));
        return reply.status(500).send({ error: msg });
      }
    });
  }, { prefix: "/api" });

  // --- Admin AI logs (/api/admin/ai) — staff vê logs; modelo só admin ---

  app.register(async (r) => {
    r.addHook("preHandler", authPreHandler);
    r.addHook("preHandler", staffPreHandler); // viewer/operator/admin — prompt mascarado via LGPD

    /** GET /api/admin/ai/logs — auditoria chamadas OpenAI (campos sensíveis mascarados). */
    r.get("/logs", async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as { limit?: string; source?: string };
      const limit = Math.min(Number(q.limit) || 50, 200);
      const conds = q.source ? [eq(aiLogs.source, q.source)] : [];
      const rules = await loadLgpdRules();
      const level = request.user!.accessLevel;

      const rows = await db
        .select()
        .from(aiLogs)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(aiLogs.createdAt))
        .limit(limit);

      return reply.send({
        logs: rows.map((l) =>
          applyLgpdMask(
            {
              id: l.id,
              userId: l.userId,
              source: l.source,
              operation: l.operation,
              prompt: l.prompt,
              response: l.response,
              model: l.model,
              inputTokens: l.inputTokens,
              outputTokens: l.outputTokens,
              costUsd: l.costUsd != null ? num(l.costUsd) : null,
              processingMs: l.processingMs,
              status: l.status,
              errorMessage: l.errorMessage,
              createdAt: l.createdAt.toISOString(),
            },
            "ai_logs",
            level,
            rules,
          ),
        ),
        summary: await getAiSummary(),
      });
    });

    /** GET /api/admin/ai/stats — resumo agregado últimos 30 dias. */
    r.get("/stats", async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ summary: await getAiSummary() });
    });
  }, { prefix: "/api/admin/ai" });

  app.register(async (r) => {
    r.addHook("preHandler", authPreHandler);
    r.addHook("preHandler", adminPreHandler); // Só admin troca modelo OpenAI

    /** GET /api/admin/ai/model — modelo OpenAI ativo + lista disponível. */
    r.get("/model", async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        model: getOpenAIModel(),
        envDefault: getEnvOpenAIModel(),
        runtimeOverride: getRuntimeOpenAIModel(),
        openaiConfigured: isOpenAIConfigured(),
        availableModels: AVAILABLE_OPENAI_MODELS.map((m) => ({ id: m.id, label: m.label })),
      });
    });

    /** PUT /api/admin/ai/model — troca modelo em runtime ou reset para .env. */
    r.put("/model", async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body ?? {}) as { model?: string; reset?: boolean };
      if (body.reset) {
        clearRuntimeOpenAIModel();
        return reply.send({ ok: true, model: getOpenAIModel() });
      }
      const model = body.model?.trim();
      if (!model) {
        return reply.status(400).send({ error: "Informe o campo model ou reset: true." });
      }
      if (!setRuntimeOpenAIModel(model)) {
        return reply.status(400).send({ error: "Modelo não suportado." });
      }
      return reply.send({ ok: true, model: getEffectiveOpenAIModel() });
    });
  }, { prefix: "/api/admin/ai" });
}

/** Agrega métricas de ai_logs dos últimos 30 dias. */
async function getAiSummary() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [stats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      inputTokens: sql<number>`coalesce(sum(${aiLogs.inputTokens}), 0)::int`,
      outputTokens: sql<number>`coalesce(sum(${aiLogs.outputTokens}), 0)::int`,
      totalCost: sql<string>`coalesce(sum(${aiLogs.costUsd}), 0)`,
      avgProcessingMs: sql<number>`coalesce(avg(${aiLogs.processingMs}), 0)::int`,
    })
    .from(aiLogs)
    .where(gte(aiLogs.createdAt, thirtyDaysAgo));

  return {
    count: stats?.count ?? 0,
    inputTokens: stats?.inputTokens ?? 0,
    outputTokens: stats?.outputTokens ?? 0,
    totalCostUsd: num(stats?.totalCost ?? "0"),
    avgProcessingMs: stats?.avgProcessingMs ?? 0,
  };
}
