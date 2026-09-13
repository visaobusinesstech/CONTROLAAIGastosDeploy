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
import { applyLgpdMask, isStaffLevel, loadLgpdRules } from "./lgpd.js"; // Importa código de outro arquivo para usar aqui
import { requestAuditMeta, writeAuditLog } from "./audit.js"; // Importa código de outro arquivo para usar aqui
import { // Importa código de outro arquivo para usar aqui
  buildWebChatWelcomeMessage, // Instrução do programa — parte da lógica deste arquivo
  buildWebChatWelcomeMessageForUser, // Instrução do programa — parte da lógica deste arquivo
  processFinancialAgentMessage, // Instrução do programa — parte da lógica deste arquivo
} from "../api/financial-agent.js"; // Agente conversacional web
import { parseDocumentText } from "../api/parser.js"; // Parser OpenAI para PDF
import { createBulkTransactions } from "../api/transaction-service.js"; // Import em lote
import { getTopCategories, getUserPreferences } from "../api/financial-memory.js"; // Memória financeira
import { extractPdfText } from "../api/media-processor.js"; // Extração texto PDF
import { computeFinancialKpis, generateInsights, generatePeriodReport, getUserBalance } from "../api/insights.js"; // Dashboard inteligente
import { getEnrichedGoals, computeGoalDeadline } from "./goals-service.js"; // Metas com progresso
import { num } from "./utils/money.js"; // Parse numeric
import { // Importa código de outro arquivo para usar aqui
  AVAILABLE_OPENAI_MODELS, // Instrução do programa — parte da lógica deste arquivo
  clearRuntimeOpenAIModel, // Instrução do programa — parte da lógica deste arquivo
  getEffectiveOpenAIModel, // Instrução do programa — parte da lógica deste arquivo
  getEnvOpenAIModel, // Instrução do programa — parte da lógica deste arquivo
  getRuntimeOpenAIModel, // Instrução do programa — parte da lógica deste arquivo
  setRuntimeOpenAIModel, // Instrução do programa — parte da lógica deste arquivo
} from "../api/runtime-config.js"; // Override modelo OpenAI admin
import { getBillingAccess } from "../api/billing-access.js"; // Importa código de outro arquivo para usar aqui
import { billingAccessPreHandler } from "./billing-routes.js"; // Importa código de outro arquivo para usar aqui
import { getOpenAIModel, isOpenAIConfigured } from "../api/openai-client.js"; // Cliente OpenAI

/** Schema Zod — POST /api/ai/chat */
const chatMessageBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  conversationId: z.string().uuid().optional(), // Instrução do programa — parte da lógica deste arquivo
  message: z.string().min(1).max(4000), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Schema Zod — POST /api/goals */
const goalCreateBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  name: z.string().min(1).max(200), // Instrução do programa — parte da lógica deste arquivo
  categoryId: z.string().uuid().nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  limitAmount: z.union([z.string(), z.number()]).transform(String), // Instrução do programa — parte da lógica deste arquivo
  periodType: z.enum(["monthly", "quarterly", "yearly"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  goalType: z.enum(["limit", "saving"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  targetAmount: z.union([z.string(), z.number()]).transform(String).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  durationMonths: z.number().int().min(1).max(360).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  color: z.string().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Schema Zod — PATCH /api/goals/:id (editar campos + ativar/inativar) */
const goalPatchBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  name: z.string().min(1).max(200).optional(), // Instrução do programa — parte da lógica deste arquivo
  categoryId: z.string().uuid().nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  limitAmount: z.union([z.string(), z.number()]).transform(String).optional(), // Instrução do programa — parte da lógica deste arquivo
  periodType: z.enum(["monthly", "quarterly", "yearly"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  goalType: z.enum(["limit", "saving"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  targetAmount: z.union([z.string(), z.number()]).transform(String).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  durationMonths: z.number().int().min(1).max(360).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  color: z.string().optional(), // Instrução do programa — parte da lógica deste arquivo
  isActive: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Registra rotas estendidas (/api) e admin IA (/api/admin/ai). */
export async function registerExtendedRoutes(app: FastifyInstance): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // JWT obrigatório

    /** GET /api/me/capabilities — flags de features para o frontend. */
    r.get("/me/capabilities", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const [waRow] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main")); // Guarda um valor que não muda durante a execução deste trecho
      const waConnected = waRow?.status === "connected"; // Guarda um valor que não muda durante a execução deste trecho
      const billing = await getBillingAccess(request.user!.id, request.user!.email); // Guarda um valor que não muda durante a execução deste trecho

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        isAdmin: userIsAdmin(request.user), // Instrução do programa — parte da lógica deste arquivo
        isStaff: userIsAdmin(request.user) || isStaffLevel(request.user!.accessLevel), // Instrução do programa — parte da lógica deste arquivo
        accessLevel: request.user!.accessLevel, // Instrução do programa — parte da lógica deste arquivo
        whatsappEnabled: process.env.ENABLE_WHATSAPP !== "false", // Instrução do programa — parte da lógica deste arquivo
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY), // Instrução do programa — parte da lógica deste arquivo
        /** Número público do bot — visível para usuários comuns enviarem mensagens */
        whatsappBotPhone: waConnected ? waRow?.phoneNumber ?? null : null, // Instrução do programa — parte da lógica deste arquivo
        whatsappConnected: waConnected, // Instrução do programa — parte da lógica deste arquivo
        billing, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    // --- AI Chat ---

    /** GET /api/ai/welcome — mensagem inicial personalizada do chat web. */
    r.get("/ai/welcome", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)); // Guarda um valor que não muda durante a execução deste trecho
      const message = await buildWebChatWelcomeMessageForUser(userId, user?.name); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ message }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** GET /api/ai/conversations — histórico de conversas IA (50 mais recentes). */
    r.get("/ai/conversations", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select() // Instrução do programa — parte da lógica deste arquivo
        .from(aiConversations) // Instrução do programa — parte da lógica deste arquivo
        .where(and(eq(aiConversations.userId, userId), eq(aiConversations.isActive, true))) // Filtra quais linhas do banco entram na consulta
        .orderBy(desc(aiConversations.updatedAt)) // Ordena o resultado (mais recente, alfabético, etc.)
        .limit(50); // Limita quantos registros voltam da consulta

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        conversations: rows.map((c) => ({ // Atribui ou calcula um valor para usar adiante
          id: c.id, // Instrução do programa — parte da lógica deste arquivo
          title: c.title, // Instrução do programa — parte da lógica deste arquivo
          contextMonth: c.contextMonth, // Instrução do programa — parte da lógica deste arquivo
          messages: c.messages, // Instrução do programa — parte da lógica deste arquivo
          updatedAt: c.updatedAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
        })), // Fecha bloco iniciado anteriormente
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** DELETE /api/ai/conversations/:id — inativa conversa (sem exclusão física). */
    r.delete<{ Params: { id: string } }>("/ai/conversations/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const { id } = request.params; // Guarda um valor que não muda durante a execução deste trecho
      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(aiConversations) // Instrução do programa — parte da lógica deste arquivo
        .set({ isActive: false, updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
        .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId), eq(aiConversations.isActive, true))) // Filtra quais linhas do banco entram na consulta
        .returning({ id: aiConversations.id }); // Pede ao banco devolver os dados gravados
      if (!row) return reply.status(404).send({ error: "Conversation not found" }); // Só executa o bloco abaixo se esta condição for verdadeira
      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: "ai_conversations.inactivate", // Instrução do programa — parte da lógica deste arquivo
        action: "inactivate", // Instrução do programa — parte da lógica deste arquivo
        entity: "ai_conversations", // Instrução do programa — parte da lógica deste arquivo
        entityId: id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método
      return reply.send({ ok: true, inactivated: true }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** POST /api/ai/chat — envia mensagem ao agente financeiro web. */
    r.post("/ai/chat", { preHandler: billingAccessPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = chatMessageBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const { message, conversationId } = parsed.data; // Guarda um valor que não muda durante a execução deste trecho

      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)); // Guarda um valor que não muda durante a execução deste trecho

      let conversation: typeof aiConversations.$inferSelect | undefined; // Variável que pode mudar de valor conforme o programa roda
      if (conversationId) { // Só executa o bloco abaixo se esta condição for verdadeira
        [conversation] = await db // Atribui ou calcula um valor para usar adiante
          .select() // Instrução do programa — parte da lógica deste arquivo
          .from(aiConversations) // Instrução do programa — parte da lógica deste arquivo
          .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId), eq(aiConversations.isActive, true))); // Filtra quais linhas do banco entram na consulta
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const history = (conversation?.messages as Array<{ role: string; content: string }>) ?? []; // Guarda um valor que não muda durante a execução deste trecho

      const agentResult = await processFinancialAgentMessage(userId, message, { // Guarda um valor que não muda durante a execução deste trecho
        userName: user?.name, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método

      const now = new Date().toISOString(); // Guarda um valor que não muda durante a execução deste trecho
      const newMessages = [ // Guarda um valor que não muda durante a execução deste trecho
        ...history, // Espalha campos de outro objeto neste
        { role: "user", content: message, timestamp: now }, // Abre bloco ou objeto com vários campos
        { role: "assistant", content: agentResult.response, timestamp: now }, // Abre bloco ou objeto com vários campos
      ]; // Fecha lista de valores

      if (conversation) { // Só executa o bloco abaixo se esta condição for verdadeira
        await db // Operação no banco de dados
          .update(aiConversations) // Instrução do programa — parte da lógica deste arquivo
          .set({ messages: newMessages, updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
          .where(eq(aiConversations.id, conversation.id)); // Filtra quais linhas do banco entram na consulta
      } else { // Fecha bloco iniciado anteriormente
        const [created] = await db // Guarda um valor que não muda durante a execução deste trecho
          .insert(aiConversations) // Instrução do programa — parte da lógica deste arquivo
          .values({ // Informa os valores a inserir na tabela
            userId, // Instrução do programa — parte da lógica deste arquivo
            title: message.slice(0, 60), // Primeiros 60 chars como título
            messages: newMessages, // Instrução do programa — parte da lógica deste arquivo
          }) // Fecha bloco iniciado anteriormente
          .returning(); // Pede ao banco devolver os dados gravados
        conversation = created; // Atribui ou calcula um valor para usar adiante
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const chatMeta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: conversationId ? "ai_conversations.update" : "ai_conversations.create", // Instrução do programa — parte da lógica deste arquivo
        action: conversationId ? "update" : "insert", // Instrução do programa — parte da lógica deste arquivo
        entity: "ai_conversations", // Instrução do programa — parte da lógica deste arquivo
        entityId: conversation!.id, // Instrução do programa — parte da lógica deste arquivo
        ...chatMeta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        conversationId: conversation!.id, // Instrução do programa — parte da lógica deste arquivo
        response: agentResult.response, // Instrução do programa — parte da lógica deste arquivo
        transactionCreated: agentResult.transactionCreated, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    // --- KPIs & Insights ---

    /** GET /api/insights/kpis — indicadores financeiros do mês. */
    r.get("/insights/kpis", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const kpis = await computeFinancialKpis(request.user!.id); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ kpis }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /**
     * GET /api/insights/financial-summary?from=&to=
     * Fonte única de indicadores: ganhos, gastos, faturamento bruto/líquido.
     */
    r.get("/insights/financial-summary", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const q = request.query as { from?: string; to?: string }; // Guarda um valor que não muda durante a execução deste trecho
      const from = q.from ? new Date(q.from) : undefined; // Guarda um valor que não muda durante a execução deste trecho
      const to = q.to ? new Date(q.to) : undefined; // Guarda um valor que não muda durante a execução deste trecho
      if (from && Number.isNaN(from.getTime())) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Parâmetro from inválido." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (to && Number.isNaN(to.getTime())) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Parâmetro to inválido." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const summary = await getUserBalance(request.user!.id, from, to); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        summary: { // Instrução do programa — parte da lógica deste arquivo
          ganhos: summary.ganhos, // Instrução do programa — parte da lógica deste arquivo
          gastos: summary.gastos, // Instrução do programa — parte da lógica deste arquivo
          faturamentoBruto: summary.faturamentoBruto, // Instrução do programa — parte da lógica deste arquivo
          faturamentoLiquido: summary.faturamentoLiquido, // Instrução do programa — parte da lógica deste arquivo
          ganhosCount: summary.ganhosCount, // Instrução do programa — parte da lógica deste arquivo
          gastosCount: summary.gastosCount, // Instrução do programa — parte da lógica deste arquivo
          isEmpty: summary.isEmpty, // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** GET /api/insights/list — insights gerados por IA/heurística. */
    r.get("/insights/list", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const insights = await generateInsights(request.user!.id); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ insights }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** GET /api/insights/report?period= — relatório semanal/mensal/anual. */
    r.get("/insights/report", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const q = request.query as { period?: string }; // Guarda um valor que não muda durante a execução deste trecho
      const period = q.period === "weekly" || q.period === "yearly" ? q.period : "monthly"; // Guarda um valor que não muda durante a execução deste trecho
      const report = await generatePeriodReport(request.user!.id, period); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ report, period }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** GET /api/insights/memory — preferências e categorias mais usadas. */
    r.get("/insights/memory", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const prefs = await getUserPreferences(request.user!.id); // Guarda um valor que não muda durante a execução deste trecho
      const topCategories = await getTopCategories(request.user!.id); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ preferences: prefs, topCategories }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    // --- Goals ---

    /** GET /api/goals — metas com progresso calculado. */
    r.get("/goals", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const goalsList = await getEnrichedGoals(request.user!.id); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ goals: goalsList }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** POST /api/goals — cria meta financeira. */
    r.post("/goals", { preHandler: billingAccessPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = goalCreateBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const d = parsed.data; // Guarda um valor que não muda durante a execução deste trecho
      const durationMonths = d.durationMonths ?? null; // Guarda um valor que não muda durante a execução deste trecho
      const now = new Date(); // Guarda um valor que não muda durante a execução deste trecho
      const deadlineAt = // Guarda um valor que não muda durante a execução deste trecho
        durationMonths != null ? computeGoalDeadline(now, durationMonths) : null; // Atribui ou calcula um valor para usar adiante

      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .insert(goals) // Instrução do programa — parte da lógica deste arquivo
        .values({ // Informa os valores a inserir na tabela
          userId, // Instrução do programa — parte da lógica deste arquivo
          name: d.name, // Instrução do programa — parte da lógica deste arquivo
          categoryId: d.categoryId ?? null, // Instrução do programa — parte da lógica deste arquivo
          limitAmount: d.limitAmount, // Instrução do programa — parte da lógica deste arquivo
          periodType: d.periodType ?? "monthly", // Instrução do programa — parte da lógica deste arquivo
          goalType: d.goalType ?? "limit", // Instrução do programa — parte da lógica deste arquivo
          targetAmount: d.targetAmount ?? null, // Instrução do programa — parte da lógica deste arquivo
          durationMonths, // Instrução do programa — parte da lógica deste arquivo
          deadlineAt, // Instrução do programa — parte da lógica deste arquivo
          color: d.color ?? "#6366f1", // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .returning(); // Pede ao banco devolver os dados gravados

      const goalMeta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: "goals.create", // Instrução do programa — parte da lógica deste arquivo
        action: "insert", // Instrução do programa — parte da lógica deste arquivo
        entity: "goals", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...goalMeta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método

      return reply.status(201).send({ // Envia resposta HTTP de volta ao navegador ou app
        goal: { // Instrução do programa — parte da lógica deste arquivo
          id: row.id, // Instrução do programa — parte da lógica deste arquivo
          name: row.name, // Instrução do programa — parte da lógica deste arquivo
          limitAmount: num(row.limitAmount), // Instrução do programa — parte da lógica deste arquivo
          goalType: row.goalType, // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** PATCH /api/goals/:id — editar meta (valor, período, nome) ou ativar/inativar. */
    r.patch<{ Params: { id: string } }>("/goals/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = goalPatchBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const d = parsed.data; // Guarda um valor que não muda durante a execução deste trecho

      if (d.limitAmount !== undefined) { // Só executa o bloco abaixo se esta condição for verdadeira
        const n = Number(d.limitAmount); // Guarda um valor que não muda durante a execução deste trecho
        if (!Number.isFinite(n) || n <= 0) { // Só executa o bloco abaixo se esta condição for verdadeira
          return reply.status(400).send({ error: "Valor da meta deve ser maior que zero." }); // Envia resposta HTTP de volta ao navegador ou app
        } // Fecha um bloco de código (if, função, objeto, etc.)
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const patch: Record<string, unknown> = {}; // Guarda um valor que não muda durante a execução deste trecho
      if (d.name !== undefined) patch.name = d.name.trim(); // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.categoryId !== undefined) patch.categoryId = d.categoryId; // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.limitAmount !== undefined) patch.limitAmount = d.limitAmount; // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.periodType !== undefined) patch.periodType = d.periodType; // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.goalType !== undefined) patch.goalType = d.goalType; // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.targetAmount !== undefined) patch.targetAmount = d.targetAmount; // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.color !== undefined) patch.color = d.color; // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.isActive !== undefined) patch.isActive = d.isActive; // Só executa o bloco abaixo se esta condição for verdadeira
      if (d.durationMonths !== undefined) { // Só executa o bloco abaixo se esta condição for verdadeira
        patch.durationMonths = d.durationMonths; // Atribui ou calcula um valor para usar adiante
        if (d.durationMonths != null) { // Só executa o bloco abaixo se esta condição for verdadeira
          patch.deadlineAt = computeGoalDeadline(new Date(), d.durationMonths); // Atribui ou calcula um valor para usar adiante
        } else { // Fecha bloco iniciado anteriormente
          patch.deadlineAt = null; // Atribui ou calcula um valor para usar adiante
        } // Fecha um bloco de código (if, função, objeto, etc.)
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (Object.keys(patch).length === 0) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Nenhum campo para atualizar." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(goals) // Instrução do programa — parte da lógica deste arquivo
        .set(patch as never) // Define quais colunas serão alteradas no UPDATE
        .where(and(eq(goals.id, request.params.id), eq(goals.userId, userId))) // Filtra quais linhas do banco entram na consulta
        .returning({ // Pede ao banco devolver os dados gravados
          id: goals.id, // Instrução do programa — parte da lógica deste arquivo
          name: goals.name, // Instrução do programa — parte da lógica deste arquivo
          isActive: goals.isActive, // Instrução do programa — parte da lógica deste arquivo
          limitAmount: goals.limitAmount, // Instrução do programa — parte da lógica deste arquivo
          periodType: goals.periodType, // Instrução do programa — parte da lógica deste arquivo
          targetAmount: goals.targetAmount, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
      if (!row) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira

      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      const inactivated = d.isActive === false; // Guarda um valor que não muda durante a execução deste trecho
      const activated = d.isActive === true; // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: inactivated ? "goals.inactivate" : activated ? "goals.activate" : "goals.update", // Instrução do programa — parte da lógica deste arquivo
        action: inactivated ? "inactivate" : activated ? "activate" : "update", // Instrução do programa — parte da lógica deste arquivo
        entity: "goals", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
        details: patch, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        goal: { // Instrução do programa — parte da lógica deste arquivo
          id: row.id, // Instrução do programa — parte da lógica deste arquivo
          name: row.name, // Instrução do programa — parte da lógica deste arquivo
          isActive: row.isActive, // Instrução do programa — parte da lógica deste arquivo
          limitAmount: num(row.limitAmount), // Instrução do programa — parte da lógica deste arquivo
          periodType: row.periodType, // Instrução do programa — parte da lógica deste arquivo
          targetAmount: row.targetAmount != null ? num(row.targetAmount) : null, // Atribui ou calcula um valor para usar adiante
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    // --- User WhatsApp conversations ---

    /** GET /api/whatsapp/conversations — histórico WA do usuário logado. */
    r.get("/whatsapp/conversations", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select() // Instrução do programa — parte da lógica deste arquivo
        .from(whatsappMessages) // Instrução do programa — parte da lógica deste arquivo
        .where(eq(whatsappMessages.userId, userId)) // Filtra quais linhas do banco entram na consulta
        .orderBy(desc(whatsappMessages.createdAt)) // Ordena o resultado (mais recente, alfabético, etc.)
        .limit(100); // Limita quantos registros voltam da consulta

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        messages: rows.map((m) => ({ // Atribui ou calcula um valor para usar adiante
          id: m.id, // Instrução do programa — parte da lógica deste arquivo
          direction: m.direction, // Instrução do programa — parte da lógica deste arquivo
          messageType: m.messageType, // Instrução do programa — parte da lógica deste arquivo
          content: m.content, // Instrução do programa — parte da lógica deste arquivo
          createdAt: m.createdAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
        })), // Fecha bloco iniciado anteriormente
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    // --- Imports ---

    /** GET /api/imports — lista importações PDF do usuário. */
    r.get("/imports", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select() // Instrução do programa — parte da lógica deste arquivo
        .from(documentImports) // Instrução do programa — parte da lógica deste arquivo
        .where(and(eq(documentImports.userId, request.user!.id), eq(documentImports.isActive, true))) // Filtra quais linhas do banco entram na consulta
        .orderBy(desc(documentImports.createdAt)) // Ordena o resultado (mais recente, alfabético, etc.)
        .limit(50); // Limita quantos registros voltam da consulta

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        imports: rows.map((i) => ({ // Atribui ou calcula um valor para usar adiante
          id: i.id, // Instrução do programa — parte da lógica deste arquivo
          fileName: i.fileName, // Instrução do programa — parte da lógica deste arquivo
          fileType: i.fileType, // Instrução do programa — parte da lógica deste arquivo
          status: i.status, // Instrução do programa — parte da lógica deste arquivo
          transactionsCreated: i.transactionsCreated, // Instrução do programa — parte da lógica deste arquivo
          errorMessage: i.errorMessage, // Instrução do programa — parte da lógica deste arquivo
          createdAt: i.createdAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
        })), // Fecha bloco iniciado anteriormente
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** POST /api/imports/pdf — upload base64, extrai e cria transações. */
    r.post("/imports/pdf", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const body = request.body as { fileName?: string; contentBase64?: string }; // Guarda um valor que não muda durante a execução deste trecho
      if (!body.contentBase64 || !body.fileName) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "fileName and contentBase64 required" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const buffer = Buffer.from(body.contentBase64, "base64"); // Guarda um valor que não muda durante a execução deste trecho

      const [importRow] = await db // Guarda um valor que não muda durante a execução deste trecho
        .insert(documentImports) // Instrução do programa — parte da lógica deste arquivo
        .values({ // Informa os valores a inserir na tabela
          userId, // Instrução do programa — parte da lógica deste arquivo
          fileName: body.fileName, // Instrução do programa — parte da lógica deste arquivo
          fileType: "application/pdf", // Instrução do programa — parte da lógica deste arquivo
          status: "processing", // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .returning(); // Pede ao banco devolver os dados gravados

      try { // Tenta executar código que pode falhar
        const text = await extractPdfText(buffer); // Guarda um valor que não muda durante a execução deste trecho
        const parsed = await parseDocumentText(text, userId); // Guarda um valor que não muda durante a execução deste trecho
        const count = await createBulkTransactions(userId, parsed); // Guarda um valor que não muda durante a execução deste trecho

        await db // Operação no banco de dados
          .update(documentImports) // Instrução do programa — parte da lógica deste arquivo
          .set({ status: "completed", extractedText: text.slice(0, 5000), transactionsCreated: count }) // Define quais colunas serão alteradas no UPDATE
          .where(eq(documentImports.id, importRow.id)); // Filtra quais linhas do banco entram na consulta

        return reply.send({ ok: true, importId: importRow.id, transactionsCreated: count }); // Envia resposta HTTP de volta ao navegador ou app
      } catch (err) { // Fecha bloco iniciado anteriormente
        const msg = err instanceof Error ? err.message : String(err); // Guarda um valor que não muda durante a execução deste trecho
        await db // Operação no banco de dados
          .update(documentImports) // Instrução do programa — parte da lógica deste arquivo
          .set({ status: "failed", errorMessage: msg }) // Define quais colunas serão alteradas no UPDATE
          .where(eq(documentImports.id, importRow.id)); // Filtra quais linhas do banco entram na consulta
        return reply.status(500).send({ error: msg }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
    }); // Fecha chamada de função ou método
  }, { prefix: "/api" }); // Fecha registro de rotas informando o prefixo da URL

  // --- Admin AI logs (/api/admin/ai) — staff vê logs; modelo só admin ---

  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
    r.addHook("preHandler", staffPreHandler); // viewer/operator/admin — prompt mascarado via LGPD

    /** GET /api/admin/ai/logs — auditoria chamadas OpenAI (campos sensíveis mascarados). */
    r.get("/logs", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const q = request.query as { limit?: string; source?: string }; // Guarda um valor que não muda durante a execução deste trecho
      const limit = Math.min(Number(q.limit) || 50, 200); // Guarda um valor que não muda durante a execução deste trecho
      const conds = q.source ? [eq(aiLogs.source, q.source)] : []; // Guarda um valor que não muda durante a execução deste trecho
      const rules = await loadLgpdRules(); // Guarda um valor que não muda durante a execução deste trecho
      const level = request.user!.accessLevel; // Guarda um valor que não muda durante a execução deste trecho

      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select() // Instrução do programa — parte da lógica deste arquivo
        .from(aiLogs) // Instrução do programa — parte da lógica deste arquivo
        .where(conds.length ? and(...conds) : undefined) // Filtra quais linhas do banco entram na consulta
        .orderBy(desc(aiLogs.createdAt)) // Ordena o resultado (mais recente, alfabético, etc.)
        .limit(limit); // Limita quantos registros voltam da consulta

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        logs: rows.map((l) => // Atribui ou calcula um valor para usar adiante
          applyLgpdMask( // Instrução do programa — parte da lógica deste arquivo
            { // Início de um bloco de código
              id: l.id, // Instrução do programa — parte da lógica deste arquivo
              userId: l.userId, // Instrução do programa — parte da lógica deste arquivo
              source: l.source, // Instrução do programa — parte da lógica deste arquivo
              operation: l.operation, // Instrução do programa — parte da lógica deste arquivo
              prompt: l.prompt, // Instrução do programa — parte da lógica deste arquivo
              response: l.response, // Instrução do programa — parte da lógica deste arquivo
              model: l.model, // Instrução do programa — parte da lógica deste arquivo
              inputTokens: l.inputTokens, // Instrução do programa — parte da lógica deste arquivo
              outputTokens: l.outputTokens, // Instrução do programa — parte da lógica deste arquivo
              costUsd: l.costUsd != null ? num(l.costUsd) : null, // Atribui ou calcula um valor para usar adiante
              processingMs: l.processingMs, // Instrução do programa — parte da lógica deste arquivo
              status: l.status, // Instrução do programa — parte da lógica deste arquivo
              errorMessage: l.errorMessage, // Instrução do programa — parte da lógica deste arquivo
              createdAt: l.createdAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
            }, // Fecha um bloco de código (if, função, objeto, etc.)
            "ai_logs", // Instrução do programa — parte da lógica deste arquivo
            level, // Instrução do programa — parte da lógica deste arquivo
            rules, // Instrução do programa — parte da lógica deste arquivo
          ), // Fecha parêntese e continua parâmetros ou argumentos
        ), // Fecha parêntese e continua parâmetros ou argumentos
        summary: await getAiSummary(), // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** GET /api/admin/ai/stats — resumo agregado últimos 30 dias. */
    r.get("/stats", async (_request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      return reply.send({ summary: await getAiSummary() }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método
  }, { prefix: "/api/admin/ai" }); // Fecha registro de rotas informando o prefixo da URL

  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Middleware — roda antes de cada rota deste grupo
    r.addHook("preHandler", adminPreHandler); // Só admin troca modelo OpenAI

    /** GET /api/admin/ai/model — modelo OpenAI ativo + lista disponível. */
    r.get("/model", async (_request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        model: getOpenAIModel(), // Instrução do programa — parte da lógica deste arquivo
        envDefault: getEnvOpenAIModel(), // Instrução do programa — parte da lógica deste arquivo
        runtimeOverride: getRuntimeOpenAIModel(), // Instrução do programa — parte da lógica deste arquivo
        openaiConfigured: isOpenAIConfigured(), // Instrução do programa — parte da lógica deste arquivo
        availableModels: AVAILABLE_OPENAI_MODELS.map((m) => ({ id: m.id, label: m.label })), // Atribui ou calcula um valor para usar adiante
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** PUT /api/admin/ai/model — troca modelo em runtime ou reset para .env. */
    r.put("/model", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const body = (request.body ?? {}) as { model?: string; reset?: boolean }; // Guarda um valor que não muda durante a execução deste trecho
      if (body.reset) { // Só executa o bloco abaixo se esta condição for verdadeira
        clearRuntimeOpenAIModel(); // Instrução do programa — parte da lógica deste arquivo
        return reply.send({ ok: true, model: getOpenAIModel() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const model = body.model?.trim(); // Guarda um valor que não muda durante a execução deste trecho
      if (!model) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Informe o campo model ou reset: true." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (!setRuntimeOpenAIModel(model)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Modelo não suportado." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      return reply.send({ ok: true, model: getEffectiveOpenAIModel() }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método
  }, { prefix: "/api/admin/ai" }); // Fecha registro de rotas informando o prefixo da URL
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Agrega métricas de ai_logs dos últimos 30 dias. */
async function getAiSummary() { // Função que pode esperar operações demoradas (banco, rede)
  const thirtyDaysAgo = new Date(); // Guarda um valor que não muda durante a execução deste trecho
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); // Instrução do programa — parte da lógica deste arquivo

  const [stats] = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ // Instrução do programa — parte da lógica deste arquivo
      count: sql<number>`count(*)::int`, // Instrução do programa — parte da lógica deste arquivo
      inputTokens: sql<number>`coalesce(sum(${aiLogs.inputTokens}), 0)::int`, // Instrução do programa — parte da lógica deste arquivo
      outputTokens: sql<number>`coalesce(sum(${aiLogs.outputTokens}), 0)::int`, // Instrução do programa — parte da lógica deste arquivo
      totalCost: sql<string>`coalesce(sum(${aiLogs.costUsd}), 0)`, // Instrução do programa — parte da lógica deste arquivo
      avgProcessingMs: sql<number>`coalesce(avg(${aiLogs.processingMs}), 0)::int`, // Instrução do programa — parte da lógica deste arquivo
    }) // Fecha bloco iniciado anteriormente
    .from(aiLogs) // Instrução do programa — parte da lógica deste arquivo
    .where(gte(aiLogs.createdAt, thirtyDaysAgo)); // Filtra quais linhas do banco entram na consulta

  return { // Devolve um valor e encerra a função aqui
    count: stats?.count ?? 0, // Instrução do programa — parte da lógica deste arquivo
    inputTokens: stats?.inputTokens ?? 0, // Instrução do programa — parte da lógica deste arquivo
    outputTokens: stats?.outputTokens ?? 0, // Instrução do programa — parte da lógica deste arquivo
    totalCostUsd: num(stats?.totalCost ?? "0"), // Instrução do programa — parte da lógica deste arquivo
    avgProcessingMs: stats?.avgProcessingMs ?? 0, // Instrução do programa — parte da lógica deste arquivo
  }; // Fecha bloco de objeto ou estrutura
} // Fecha um bloco de código (if, função, objeto, etc.)
