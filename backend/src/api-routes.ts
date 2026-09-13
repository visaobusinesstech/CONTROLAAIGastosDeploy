/**
 * API principal — transações, categorias, orçamento, relatórios mensais.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Prefixo: /api/* (requer JWT do usuário logado).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"; // Tipos HTTP
import { and, desc, eq, gte, isNull, lte, or, type SQL } from "drizzle-orm"; // Operadores SQL tipados
import { z } from "zod"; // Validação de body JSON
import { db } from "./db/index.js"; // Cliente PostgreSQL
import { budgets, categories, transactions, userSettings, users } from "./db/schema.js"; // Tabelas CRUD
import { authPreHandler } from "./auth.js"; // Middleware JWT
import { seedMockDataForUser } from "./db/seed-user-mock.js"; // Demo: dados fictícios básicos
import { RICH_DEMO_EMAIL, seedRichMockForUserId } from "./db/seed-rich-leonardo.js"; // Demo: pacote completo
import { materializeDueRecurringIncomes, syncFullIncomeProfile, syncIncomeToDashboard } from "../api/income-sync.js"; // Importa código de outro arquivo para usar aqui
import type { IncomeRecurrence, IncomeType } from "../api/onboarding-agent.js"; // Importa apenas tipos TypeScript (não vira código no programa final)
import { billingAccessPreHandler } from "./billing-routes.js"; // Importa código de outro arquivo para usar aqui
import { requestAuditMeta, writeAuditLog } from "./audit.js"; // Importa código de outro arquivo para usar aqui
import { releasePhoneFromOtherUsers } from "../whatsapp/user-resolver.js"; // Importa código de outro arquivo para usar aqui
import { INCOME_FREQUENCIES, isValidIncomeFrequency } from "./utils/financial-summary.js"; // Importa código de outro arquivo para usar aqui

/** Converte numeric Postgres para number (helper local). */
function num(v: string | null): number { // Bloco de código reutilizável com um nome
  if (v == null) return 0; // Só executa o bloco abaixo se esta condição for verdadeira
  const n = Number(v); // Guarda um valor que não muda durante a execução deste trecho
  return Number.isFinite(n) ? n : 0; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Busca ou cria user_settings para o usuário (1:1 com users). */
async function getOrCreateSettings(userId: string) { // Função que pode esperar operações demoradas (banco, rede)
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId)); // Guarda um valor que não muda durante a execução deste trecho
  if (row) return row; // Só executa o bloco abaixo se esta condição for verdadeira
  const [created] = await db.insert(userSettings).values({ userId }).returning(); // Guarda um valor que não muda durante a execução deste trecho
  return created; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Normalização simples de telefone para PATCH /me/profile. */
function normalizePhone(raw: string | undefined): string | null { // Bloco de código reutilizável com um nome
  if (!raw) return null; // Só executa o bloco abaixo se esta condição for verdadeira
  const digits = raw.replace(/\D/g, ""); // Guarda um valor que não muda durante a execução deste trecho
  if (digits.length < 10 || digits.length > 13) return null; // Só executa o bloco abaixo se esta condição for verdadeira
  return digits; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Schema Zod — POST /api/transactions */
const txCreateBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  amount: z.union([z.string(), z.number()]).transform((a) => String(a)), // Atribui ou calcula um valor para usar adiante
  type: z.enum(["expense", "income"]), // Instrução do programa — parte da lógica deste arquivo
  categoryId: z.string().uuid().nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  description: z.string().min(1).max(500), // Instrução do programa — parte da lógica deste arquivo
  occurredAt: z.string().min(4).optional(), // Instrução do programa — parte da lógica deste arquivo
  source: z.enum(["whatsapp", "web", "recurring", "manual"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  incomeFrequency: z.enum(["monthly", "recurring", "non_recurring", "sporadic"]).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Schema Zod — PATCH /api/transactions/:id */
const txPatchBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  amount: z.union([z.string(), z.number()]).transform((a) => String(a)).optional(), // Atribui ou calcula um valor para usar adiante
  type: z.enum(["expense", "income"]).optional(), // Instrução do programa — parte da lógica deste arquivo
  categoryId: z.string().uuid().nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  description: z.string().min(1).max(500).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
  occurredAt: z.string().min(4).optional(), // Instrução do programa — parte da lógica deste arquivo
  isActive: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  incomeFrequency: z.enum(["monthly", "recurring", "non_recurring", "sporadic"]).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Schema Zod — PUT /api/budgets */
const budgetPutBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  month: z.string().regex(/^\d{4}-\d{2}$/), // Instrução do programa — parte da lógica deste arquivo
  totalIncomeExpected: z // Instrução do programa — parte da lógica deste arquivo
    .union([z.string(), z.number()]) // Instrução do programa — parte da lógica deste arquivo
    .transform((a) => String(a)) // Atribui ou calcula um valor para usar adiante
    .nullable() // Instrução do programa — parte da lógica deste arquivo
    .optional(), // Instrução do programa — parte da lógica deste arquivo
  totalExpenseLimit: z // Instrução do programa — parte da lógica deste arquivo
    .union([z.string(), z.number()]) // Instrução do programa — parte da lógica deste arquivo
    .transform((a) => String(a)) // Atribui ou calcula um valor para usar adiante
    .nullable() // Instrução do programa — parte da lógica deste arquivo
    .optional(), // Instrução do programa — parte da lógica deste arquivo
  notes: z.string().max(2000).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Schema Zod — PATCH /api/settings */
const settingsPatchBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  alertAt80: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  alertAt100: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  weeklyReport: z.boolean().optional(), // Instrução do programa — parte da lógica deste arquivo
  themePreference: z.enum(["light", "dark", "system"]).optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Schema Zod — PATCH /api/me/profile */
const profilePatchBody = z.object({ // Regra de validação — garante que o JSON recebido está correto
  name: z.string().min(2).max(200).optional(), // Instrução do programa — parte da lógica deste arquivo
  phone: z.string().max(32).nullable().optional(), // Instrução do programa — parte da lógica deste arquivo
}); // Fecha chamada de função ou método

/** Mapeia linha do banco para JSON da API (datas ISO, amount number). */
function mapTxRow(row: { // Bloco de código reutilizável com um nome
  id: string; // Instrução do programa — parte da lógica deste arquivo
  userId: string; // Instrução do programa — parte da lógica deste arquivo
  categoryId: string | null; // Instrução do programa — parte da lógica deste arquivo
  amount: string; // Instrução do programa — parte da lógica deste arquivo
  type: "expense" | "income"; // Instrução do programa — parte da lógica deste arquivo
  description: string | null; // Instrução do programa — parte da lógica deste arquivo
  occurredAt: Date; // Instrução do programa — parte da lógica deste arquivo
  source: "whatsapp" | "web" | "recurring" | "manual"; // Instrução do programa — parte da lógica deste arquivo
  incomeFrequency?: string | null; // Instrução do programa — parte da lógica deste arquivo
  createdAt: Date; // Instrução do programa — parte da lógica deste arquivo
  categoryName: string | null; // Instrução do programa — parte da lógica deste arquivo
  categoryIcon: string | null; // Instrução do programa — parte da lógica deste arquivo
  categoryColor: string | null; // Instrução do programa — parte da lógica deste arquivo
}) { // Fecha bloco iniciado anteriormente
  return { // Devolve um valor e encerra a função aqui
    id: row.id, // Instrução do programa — parte da lógica deste arquivo
    amount: num(row.amount), // Instrução do programa — parte da lógica deste arquivo
    type: row.type, // Instrução do programa — parte da lógica deste arquivo
    description: row.description, // Instrução do programa — parte da lógica deste arquivo
    occurredAt: row.occurredAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
    source: row.source, // Instrução do programa — parte da lógica deste arquivo
    incomeFrequency: row.incomeFrequency ?? null, // Instrução do programa — parte da lógica deste arquivo
    categoryId: row.categoryId, // Instrução do programa — parte da lógica deste arquivo
    categoryName: row.categoryName, // Instrução do programa — parte da lógica deste arquivo
    categoryIcon: row.categoryIcon, // Instrução do programa — parte da lógica deste arquivo
    categoryColor: row.categoryColor, // Instrução do programa — parte da lógica deste arquivo
    createdAt: row.createdAt.toISOString(), // Instrução do programa — parte da lógica deste arquivo
  }; // Fecha bloco de objeto ou estrutura
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Campos SELECT padrão de transação + join de categoria. */
const txSelectFields = { // Guarda um valor que não muda durante a execução deste trecho
  id: transactions.id, // Instrução do programa — parte da lógica deste arquivo
  userId: transactions.userId, // Instrução do programa — parte da lógica deste arquivo
  categoryId: transactions.categoryId, // Instrução do programa — parte da lógica deste arquivo
  amount: transactions.amount, // Instrução do programa — parte da lógica deste arquivo
  type: transactions.type, // Instrução do programa — parte da lógica deste arquivo
  description: transactions.description, // Instrução do programa — parte da lógica deste arquivo
  occurredAt: transactions.occurredAt, // Instrução do programa — parte da lógica deste arquivo
  source: transactions.source, // Instrução do programa — parte da lógica deste arquivo
  incomeFrequency: transactions.incomeFrequency, // Instrução do programa — parte da lógica deste arquivo
  createdAt: transactions.createdAt, // Instrução do programa — parte da lógica deste arquivo
  categoryName: categories.name, // Instrução do programa — parte da lógica deste arquivo
  categoryIcon: categories.icon, // Instrução do programa — parte da lógica deste arquivo
  categoryColor: categories.color, // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/** Registra todas as rotas CRUD principais com prefixo /api. */
export async function registerApiRoutes(app: FastifyInstance): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  app.register(async (r) => { // Acopla plugin ou grupo de rotas ao servidor
    r.addHook("preHandler", authPreHandler); // Todas exigem JWT

    /** GET /api/categories — globais + personalizadas do usuário. */
    r.get("/categories", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select() // Instrução do programa — parte da lógica deste arquivo
        .from(categories) // Instrução do programa — parte da lógica deste arquivo
        .where( // Filtra quais linhas do banco entram na consulta
          and( // Condição SQL: todas as partes precisam ser verdadeiras
            or(isNull(categories.userId), eq(categories.userId, userId)), // Condição SQL: basta uma parte ser verdadeira
            eq(categories.isActive, true), // Condição SQL: coluna deve ser igual ao valor
          ), // Fecha parêntese e continua parâmetros ou argumentos
        ) // Fecha parêntese aberto antes
        .orderBy(categories.name); // Ordena o resultado (mais recente, alfabético, etc.)
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        categories: rows.map((c) => ({ // Atribui ou calcula um valor para usar adiante
          id: c.id, // Instrução do programa — parte da lógica deste arquivo
          name: c.name, // Instrução do programa — parte da lógica deste arquivo
          icon: c.icon, // Instrução do programa — parte da lógica deste arquivo
          type: c.type, // Instrução do programa — parte da lógica deste arquivo
          color: c.color, // Instrução do programa — parte da lógica deste arquivo
          isDefault: c.isDefault, // Instrução do programa — parte da lógica deste arquivo
        })), // Fecha bloco iniciado anteriormente
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** PATCH /api/categories/:id — inativa categoria do próprio usuário (sem exclusão). */
    r.patch<{ Params: { id: string } }>("/categories/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = z.object({ isActive: z.boolean() }).safeParse(request.body); // Regra de validação — garante que o JSON recebido está correto
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(categories) // Instrução do programa — parte da lógica deste arquivo
        .set({ isActive: parsed.data.isActive }) // Define quais colunas serão alteradas no UPDATE
        .where(and(eq(categories.id, request.params.id), eq(categories.userId, userId))) // Filtra quais linhas do banco entram na consulta
        .returning({ id: categories.id, isActive: categories.isActive }); // Pede ao banco devolver os dados gravados
      if (!row) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira
      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: parsed.data.isActive ? "categories.activate" : "categories.inactivate", // Instrução do programa — parte da lógica deste arquivo
        action: parsed.data.isActive ? "activate" : "inactivate", // Instrução do programa — parte da lógica deste arquivo
        entity: "categories", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método
      return reply.send({ category: row }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** GET /api/transactions — lista com filtros from, to, type. */
    r.get("/transactions", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      await materializeDueRecurringIncomes(userId); // Espera terminar uma tarefa assíncrona antes de continuar
      const q = request.query as Record<string, string | undefined>; // Guarda um valor que não muda durante a execução deste trecho
      const from = q.from ? new Date(q.from) : null; // Guarda um valor que não muda durante a execução deste trecho
      const to = q.to ? new Date(q.to) : null; // Guarda um valor que não muda durante a execução deste trecho
      const type = q.type as "expense" | "income" | undefined; // Guarda um valor que não muda durante a execução deste trecho

      const conds: SQL[] = [eq(transactions.userId, userId), eq(transactions.isActive, true)]; // Guarda um valor que não muda durante a execução deste trecho
      if (from && !Number.isNaN(from.getTime())) conds.push(gte(transactions.occurredAt, from)); // Só executa o bloco abaixo se esta condição for verdadeira
      if (to && !Number.isNaN(to.getTime())) conds.push(lte(transactions.occurredAt, to)); // Só executa o bloco abaixo se esta condição for verdadeira
      if (type === "expense" || type === "income") conds.push(eq(transactions.type, type)); // Só executa o bloco abaixo se esta condição for verdadeira

      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select(txSelectFields) // Instrução do programa — parte da lógica deste arquivo
        .from(transactions) // Instrução do programa — parte da lógica deste arquivo
        .leftJoin(categories, eq(transactions.categoryId, categories.id)) // Junta outra tabela trazendo dados relacionados
        .where(and(...conds)) // Filtra quais linhas do banco entram na consulta
        .orderBy(desc(transactions.occurredAt)); // Ordena o resultado (mais recente, alfabético, etc.)

      return reply.send({ transactions: rows.map(mapTxRow) }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** GET /api/transactions/export — CSV UTF-8 com BOM para Excel BR. */
    r.get("/transactions/export", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const q = request.query as Record<string, string | undefined>; // Guarda um valor que não muda durante a execução deste trecho
      const from = q.from ? new Date(q.from) : null; // Guarda um valor que não muda durante a execução deste trecho
      const to = q.to ? new Date(q.to) : null; // Guarda um valor que não muda durante a execução deste trecho

      const conds: SQL[] = [eq(transactions.userId, userId), eq(transactions.isActive, true)]; // Guarda um valor que não muda durante a execução deste trecho
      if (from && !Number.isNaN(from.getTime())) conds.push(gte(transactions.occurredAt, from)); // Só executa o bloco abaixo se esta condição for verdadeira
      if (to && !Number.isNaN(to.getTime())) conds.push(lte(transactions.occurredAt, to)); // Só executa o bloco abaixo se esta condição for verdadeira

      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ // Instrução do programa — parte da lógica deste arquivo
          amount: transactions.amount, // Instrução do programa — parte da lógica deste arquivo
          type: transactions.type, // Instrução do programa — parte da lógica deste arquivo
          description: transactions.description, // Instrução do programa — parte da lógica deste arquivo
          occurredAt: transactions.occurredAt, // Instrução do programa — parte da lógica deste arquivo
          source: transactions.source, // Instrução do programa — parte da lógica deste arquivo
          categoryName: categories.name, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .from(transactions) // Instrução do programa — parte da lógica deste arquivo
        .leftJoin(categories, eq(transactions.categoryId, categories.id)) // Junta outra tabela trazendo dados relacionados
        .where(and(...conds)) // Filtra quais linhas do banco entram na consulta
        .orderBy(desc(transactions.occurredAt)); // Ordena o resultado (mais recente, alfabético, etc.)

      const sep = ";"; // Separador CSV padrão Excel BR
      const header = ["Data/Hora", "Tipo", "Valor", "Categoria", "Descrição", "Origem"].join(sep); // Guarda um valor que não muda durante a execução deste trecho
      const lines = rows.map((row) => { // Guarda um valor que não muda durante a execução deste trecho
        const dt = row.occurredAt.toISOString(); // Guarda um valor que não muda durante a execução deste trecho
        const val = num(row.amount).toFixed(2).replace(".", ","); // Decimal BR
        const tipo = row.type === "income" ? "Receita" : "Despesa"; // Guarda um valor que não muda durante a execução deste trecho
        const desc = (row.description ?? "").replaceAll(sep, " "); // Guarda um valor que não muda durante a execução deste trecho
        const cat = (row.categoryName ?? "").replaceAll(sep, " "); // Guarda um valor que não muda durante a execução deste trecho
        return [dt, tipo, val, cat, desc, row.source].join(sep); // Devolve um valor e encerra a função aqui
      }); // Fecha chamada de função ou método
      const bom = "\uFEFF"; // BOM UTF-8 para Excel reconhecer acentos
      const body = bom + [header, ...lines].join("\r\n"); // Guarda um valor que não muda durante a execução deste trecho
      reply.header("Content-Type", "text/csv; charset=utf-8"); // Atribui ou calcula um valor para usar adiante
      reply.header("Content-Disposition", 'attachment; filename="controla-transacoes.csv"'); // Atribui ou calcula um valor para usar adiante
      return reply.send(body); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** POST /api/transactions — cria lançamento manual/web. */
    r.post("/transactions", { preHandler: billingAccessPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = txCreateBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const { amount, type, categoryId, description, occurredAt, source, incomeFrequency } = parsed.data; // Guarda um valor que não muda durante a execução deste trecho

      // Validação: valor > 0
      const amountNum = Number(String(amount).replace(",", ".")); // Guarda um valor que não muda durante a execução deste trecho
      if (!Number.isFinite(amountNum) || amountNum <= 0) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Valor deve ser maior que zero." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (!description.trim()) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Nome/descrição é obrigatório." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (occurredAt && Number.isNaN(new Date(occurredAt).getTime())) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Data inválida." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (type === "income" && incomeFrequency != null && !isValidIncomeFrequency(incomeFrequency)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Frequência inválida.", allowed: INCOME_FREQUENCIES }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .insert(transactions) // Instrução do programa — parte da lógica deste arquivo
        .values({ // Informa os valores a inserir na tabela
          userId, // Instrução do programa — parte da lógica deste arquivo
          amount: String(amountNum), // Instrução do programa — parte da lógica deste arquivo
          type, // Instrução do programa — parte da lógica deste arquivo
          categoryId: categoryId ?? null, // Instrução do programa — parte da lógica deste arquivo
          description: description.trim(), // Instrução do programa — parte da lógica deste arquivo
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(), // Instrução do programa — parte da lógica deste arquivo
          source: source ?? "manual", // Instrução do programa — parte da lógica deste arquivo
          incomeFrequency: type === "income" ? (incomeFrequency ?? null) : null, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .returning(); // Pede ao banco devolver os dados gravados

      const [joined] = await db // Guarda um valor que não muda durante a execução deste trecho
        .select(txSelectFields) // Instrução do programa — parte da lógica deste arquivo
        .from(transactions) // Instrução do programa — parte da lógica deste arquivo
        .leftJoin(categories, eq(transactions.categoryId, categories.id)) // Junta outra tabela trazendo dados relacionados
        .where(eq(transactions.id, row.id)); // Filtra quais linhas do banco entram na consulta

      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: "transactions.create", // Instrução do programa — parte da lógica deste arquivo
        action: "insert", // Instrução do programa — parte da lógica deste arquivo
        entity: "transactions", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método

      return reply.status(201).send({ transaction: mapTxRow(joined) }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** PATCH /api/transactions/:id — atualização parcial. */
    r.patch<{ Params: { id: string } }>("/transactions/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = txPatchBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const { id } = request.params; // Guarda um valor que não muda durante a execução deste trecho
      const [existing] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId))); // Guarda um valor que não muda durante a execução deste trecho
      if (!existing) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira

      if (parsed.data.amount !== undefined) { // Só executa o bloco abaixo se esta condição for verdadeira
        const amountNum = Number(String(parsed.data.amount).replace(",", ".")); // Guarda um valor que não muda durante a execução deste trecho
        if (!Number.isFinite(amountNum) || amountNum <= 0) { // Só executa o bloco abaixo se esta condição for verdadeira
          return reply.status(400).send({ error: "Valor deve ser maior que zero." }); // Envia resposta HTTP de volta ao navegador ou app
        } // Fecha um bloco de código (if, função, objeto, etc.)
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (parsed.data.description !== undefined && parsed.data.description !== null && !parsed.data.description.trim()) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Nome/descrição é obrigatório." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (parsed.data.occurredAt && Number.isNaN(new Date(parsed.data.occurredAt).getTime())) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Data inválida." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const patch: Record<string, unknown> = {}; // Guarda um valor que não muda durante a execução deste trecho
      if (parsed.data.amount !== undefined) patch.amount = String(Number(String(parsed.data.amount).replace(",", "."))); // Só executa o bloco abaixo se esta condição for verdadeira
      if (parsed.data.type !== undefined) patch.type = parsed.data.type; // Só executa o bloco abaixo se esta condição for verdadeira
      if (parsed.data.categoryId !== undefined) patch.categoryId = parsed.data.categoryId; // Só executa o bloco abaixo se esta condição for verdadeira
      if (parsed.data.description !== undefined) { // Só executa o bloco abaixo se esta condição for verdadeira
        patch.description = parsed.data.description == null ? null : parsed.data.description.trim(); // Atribui ou calcula um valor para usar adiante
      } // Fecha um bloco de código (if, função, objeto, etc.)
      if (parsed.data.occurredAt !== undefined) patch.occurredAt = new Date(parsed.data.occurredAt); // Só executa o bloco abaixo se esta condição for verdadeira
      if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive; // Só executa o bloco abaixo se esta condição for verdadeira
      if (parsed.data.incomeFrequency !== undefined) { // Só executa o bloco abaixo se esta condição for verdadeira
        const nextType = (parsed.data.type ?? existing.type) as string; // Guarda um valor que não muda durante a execução deste trecho
        patch.incomeFrequency = // Atribui ou calcula um valor para usar adiante
          nextType === "income" ? parsed.data.incomeFrequency : null; // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (Object.keys(patch).length === 0) { // Só executa o bloco abaixo se esta condição for verdadeira
        const [joined] = await db // Guarda um valor que não muda durante a execução deste trecho
          .select(txSelectFields) // Instrução do programa — parte da lógica deste arquivo
          .from(transactions) // Instrução do programa — parte da lógica deste arquivo
          .leftJoin(categories, eq(transactions.categoryId, categories.id)) // Junta outra tabela trazendo dados relacionados
          .where(eq(transactions.id, id)); // Filtra quais linhas do banco entram na consulta
        return reply.send({ transaction: mapTxRow(joined) }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      await db.update(transactions).set(patch as never).where(eq(transactions.id, id)); // Atualiza registros existentes no banco

      const [joined] = await db // Guarda um valor que não muda durante a execução deste trecho
        .select(txSelectFields) // Instrução do programa — parte da lógica deste arquivo
        .from(transactions) // Instrução do programa — parte da lógica deste arquivo
        .leftJoin(categories, eq(transactions.categoryId, categories.id)) // Junta outra tabela trazendo dados relacionados
        .where(eq(transactions.id, id)); // Filtra quais linhas do banco entram na consulta

      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      const inactivated = parsed.data.isActive === false; // Guarda um valor que não muda durante a execução deste trecho
      const activated = parsed.data.isActive === true; // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: inactivated ? "transactions.inactivate" : activated ? "transactions.activate" : "transactions.update", // Instrução do programa — parte da lógica deste arquivo
        action: inactivated ? "inactivate" : activated ? "activate" : "update", // Instrução do programa — parte da lógica deste arquivo
        entity: "transactions", // Instrução do programa — parte da lógica deste arquivo
        entityId: id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
        details: patch, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método

      return reply.send({ transaction: mapTxRow(joined) }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** DELETE /api/transactions/:id — inativa lançamento (sem exclusão física). */
    r.delete<{ Params: { id: string } }>("/transactions/:id", async (request, reply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const { id } = request.params; // Guarda um valor que não muda durante a execução deste trecho
      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(transactions) // Instrução do programa — parte da lógica deste arquivo
        .set({ isActive: false }) // Define quais colunas serão alteradas no UPDATE
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId), eq(transactions.isActive, true))) // Filtra quais linhas do banco entram na consulta
        .returning({ id: transactions.id }); // Pede ao banco devolver os dados gravados
      if (!row) return reply.status(404).send({ error: "Not found" }); // Só executa o bloco abaixo se esta condição for verdadeira
      const meta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: "transactions.inactivate", // Instrução do programa — parte da lógica deste arquivo
        action: "inactivate", // Instrução do programa — parte da lógica deste arquivo
        entity: "transactions", // Instrução do programa — parte da lógica deste arquivo
        entityId: id, // Instrução do programa — parte da lógica deste arquivo
        ...meta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método
      return reply.send({ ok: true, inactivated: true }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** GET /api/budgets?month=YYYY-MM — orçamento do mês. */
    r.get("/budgets", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const q = request.query as { month?: string }; // Guarda um valor que não muda durante a execução deste trecho
      if (!q.month || !/^\d{4}-\d{2}$/.test(q.month)) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Query month=YYYY-MM required" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const [row] = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, q.month))); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        budget: row // Instrução do programa — parte da lógica deste arquivo
          ? { // Instrução do programa — parte da lógica deste arquivo
              month: row.month, // Instrução do programa — parte da lógica deste arquivo
              totalIncomeExpected: row.totalIncomeExpected != null ? num(row.totalIncomeExpected) : null, // Atribui ou calcula um valor para usar adiante
              totalExpenseLimit: row.totalExpenseLimit != null ? num(row.totalExpenseLimit) : null, // Atribui ou calcula um valor para usar adiante
              notes: row.notes, // Instrução do programa — parte da lógica deste arquivo
            } // Fecha um bloco de código (if, função, objeto, etc.)
          : null, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** PUT /api/budgets — upsert orçamento mensal. */
    r.put("/budgets", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = budgetPutBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const { month, totalIncomeExpected, totalExpenseLimit, notes } = parsed.data; // Guarda um valor que não muda durante a execução deste trecho

      const [existing] = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month))); // Guarda um valor que não muda durante a execução deste trecho
      const inc = // Guarda um valor que não muda durante a execução deste trecho
        totalIncomeExpected !== undefined ? totalIncomeExpected : existing?.totalIncomeExpected ?? null; // Instrução do programa — parte da lógica deste arquivo
      const lim = // Guarda um valor que não muda durante a execução deste trecho
        totalExpenseLimit !== undefined ? totalExpenseLimit : existing?.totalExpenseLimit ?? null; // Instrução do programa — parte da lógica deste arquivo
      const n = notes !== undefined ? notes : existing?.notes ?? null; // Guarda um valor que não muda durante a execução deste trecho

      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .insert(budgets) // Instrução do programa — parte da lógica deste arquivo
        .values({ // Informa os valores a inserir na tabela
          userId, // Instrução do programa — parte da lógica deste arquivo
          month, // Instrução do programa — parte da lógica deste arquivo
          totalIncomeExpected: inc, // Instrução do programa — parte da lógica deste arquivo
          totalExpenseLimit: lim, // Instrução do programa — parte da lógica deste arquivo
          notes: n, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .onConflictDoUpdate({ // Se já existir, atualiza em vez de dar erro de duplicado
          target: [budgets.userId, budgets.month], // Instrução do programa — parte da lógica deste arquivo
          set: { // Instrução do programa — parte da lógica deste arquivo
            totalIncomeExpected: inc, // Instrução do programa — parte da lógica deste arquivo
            totalExpenseLimit: lim, // Instrução do programa — parte da lógica deste arquivo
            notes: n, // Instrução do programa — parte da lógica deste arquivo
          }, // Fecha um bloco de código (if, função, objeto, etc.)
        }) // Fecha bloco iniciado anteriormente
        .returning(); // Pede ao banco devolver os dados gravados

      const budgetMeta = requestAuditMeta(request); // Guarda um valor que não muda durante a execução deste trecho
      await writeAuditLog({ // Espera terminar uma tarefa assíncrona antes de continuar
        userId, // Instrução do programa — parte da lógica deste arquivo
        routine: existing ? "budgets.update" : "budgets.create", // Instrução do programa — parte da lógica deste arquivo
        action: existing ? "update" : "insert", // Instrução do programa — parte da lógica deste arquivo
        entity: "budgets", // Instrução do programa — parte da lógica deste arquivo
        entityId: row.id, // Instrução do programa — parte da lógica deste arquivo
        ...budgetMeta, // Espalha campos de outro objeto neste
      }); // Fecha chamada de função ou método

      // Renda informada no painel → transação + recorrência + saldo no dashboard
      if (totalIncomeExpected !== undefined && inc != null) { // Só executa o bloco abaixo se esta condição for verdadeira
        const incomeAmount = num(inc); // Guarda um valor que não muda durante a execução deste trecho
        if (incomeAmount > 0) { // Só executa o bloco abaixo se esta condição for verdadeira
          const [settingsRow] = await db // Guarda um valor que não muda durante a execução deste trecho
            .select({ // Instrução do programa — parte da lógica deste arquivo
              incomeRecurrence: userSettings.incomeRecurrence, // Instrução do programa — parte da lógica deste arquivo
              incomePayDay: userSettings.incomePayDay, // Instrução do programa — parte da lógica deste arquivo
              incomeType: userSettings.incomeType, // Instrução do programa — parte da lógica deste arquivo
            }) // Fecha bloco iniciado anteriormente
            .from(userSettings) // Instrução do programa — parte da lógica deste arquivo
            .where(eq(userSettings.userId, userId)); // Filtra quais linhas do banco entram na consulta
          const recurrence = (settingsRow?.incomeRecurrence as IncomeRecurrence | null) ?? "manual"; // Guarda um valor que não muda durante a execução deste trecho
          if (recurrence === "monthly_fixed") { // Só executa o bloco abaixo se esta condição for verdadeira
            await syncFullIncomeProfile(userId, incomeAmount, { // Espera terminar uma tarefa assíncrona antes de continuar
              recurrence: "monthly_fixed", // Instrução do programa — parte da lógica deste arquivo
              payDay: settingsRow?.incomePayDay ?? 1, // Instrução do programa — parte da lógica deste arquivo
              incomeType: (settingsRow?.incomeType as IncomeType | null) ?? null, // Instrução do programa — parte da lógica deste arquivo
            }); // Fecha chamada de função ou método
          } else { // Fecha bloco iniciado anteriormente
            await syncIncomeToDashboard(userId, incomeAmount, { // Espera terminar uma tarefa assíncrona antes de continuar
              recurrence, // Instrução do programa — parte da lógica deste arquivo
              payDay: settingsRow?.incomePayDay ?? null, // Instrução do programa — parte da lógica deste arquivo
              month, // Instrução do programa — parte da lógica deste arquivo
              incomeType: (settingsRow?.incomeType as IncomeType | null) ?? null, // Instrução do programa — parte da lógica deste arquivo
            }); // Fecha chamada de função ou método
          } // Fecha um bloco de código (if, função, objeto, etc.)
          await db // Operação no banco de dados
            .update(userSettings) // Instrução do programa — parte da lógica deste arquivo
            .set({ onboardingCompleted: true, updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
            .where(eq(userSettings.userId, userId)); // Filtra quais linhas do banco entram na consulta
        } // Fecha um bloco de código (if, função, objeto, etc.)
      } // Fecha um bloco de código (if, função, objeto, etc.)

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        budget: { // Instrução do programa — parte da lógica deste arquivo
          month: row.month, // Instrução do programa — parte da lógica deste arquivo
          totalIncomeExpected: row.totalIncomeExpected != null ? num(row.totalIncomeExpected) : null, // Atribui ou calcula um valor para usar adiante
          totalExpenseLimit: row.totalExpenseLimit != null ? num(row.totalExpenseLimit) : null, // Atribui ou calcula um valor para usar adiante
          notes: row.notes, // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** GET /api/settings — preferências do usuário. */
    r.get("/settings", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const s = await getOrCreateSettings(userId); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        settings: { // Instrução do programa — parte da lógica deste arquivo
          alertAt80: s.alertAt80, // Instrução do programa — parte da lógica deste arquivo
          alertAt100: s.alertAt100, // Instrução do programa — parte da lógica deste arquivo
          weeklyReport: s.weeklyReport, // Instrução do programa — parte da lógica deste arquivo
          twoFactorEnabled: s.twoFactorEnabled, // Instrução do programa — parte da lógica deste arquivo
          themePreference: s.themePreference, // Instrução do programa — parte da lógica deste arquivo
          onboardingCompleted: s.onboardingCompleted, // Instrução do programa — parte da lógica deste arquivo
          initialBalance: s.initialBalance != null ? num(s.initialBalance) : null, // Atribui ou calcula um valor para usar adiante
          incomeRecurrence: s.incomeRecurrence ?? null, // Instrução do programa — parte da lógica deste arquivo
          incomePayDay: s.incomePayDay ?? null, // Instrução do programa — parte da lógica deste arquivo
          incomePayWeekday: s.incomePayWeekday ?? null, // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** PATCH /api/settings — atualiza preferências parciais. */
    r.patch("/settings", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = settingsPatchBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      await getOrCreateSettings(userId); // Espera terminar uma tarefa assíncrona antes de continuar
      const patch = Object.fromEntries( // Guarda um valor que não muda durante a execução deste trecho
        Object.entries(parsed.data).filter(([, v]) => v !== undefined), // Instrução do programa — parte da lógica deste arquivo
      ) as Partial<{ // Fecha parêntese aberto antes
        alertAt80: boolean; // Instrução do programa — parte da lógica deste arquivo
        alertAt100: boolean; // Instrução do programa — parte da lógica deste arquivo
        weeklyReport: boolean; // Instrução do programa — parte da lógica deste arquivo
        themePreference: "light" | "dark" | "system"; // Instrução do programa — parte da lógica deste arquivo
      }>; // Fecha bloco iniciado anteriormente
      if (Object.keys(patch).length === 0) { // Só executa o bloco abaixo se esta condição for verdadeira
        const s = await getOrCreateSettings(userId); // Guarda um valor que não muda durante a execução deste trecho
        return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
          settings: { // Instrução do programa — parte da lógica deste arquivo
            alertAt80: s.alertAt80, // Instrução do programa — parte da lógica deste arquivo
            alertAt100: s.alertAt100, // Instrução do programa — parte da lógica deste arquivo
            weeklyReport: s.weeklyReport, // Instrução do programa — parte da lógica deste arquivo
            twoFactorEnabled: s.twoFactorEnabled, // Instrução do programa — parte da lógica deste arquivo
            themePreference: s.themePreference, // Instrução do programa — parte da lógica deste arquivo
          }, // Fecha um bloco de código (if, função, objeto, etc.)
        }); // Fecha chamada de função ou método
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const [updated] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(userSettings) // Instrução do programa — parte da lógica deste arquivo
        .set({ // Define quais colunas serão alteradas no UPDATE
          ...patch, // Espalha campos de outro objeto neste
          updatedAt: new Date(), // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .where(eq(userSettings.userId, userId)) // Filtra quais linhas do banco entram na consulta
        .returning(); // Pede ao banco devolver os dados gravados

      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        settings: { // Instrução do programa — parte da lógica deste arquivo
          alertAt80: updated.alertAt80, // Instrução do programa — parte da lógica deste arquivo
          alertAt100: updated.alertAt100, // Instrução do programa — parte da lógica deste arquivo
          weeklyReport: updated.weeklyReport, // Instrução do programa — parte da lógica deste arquivo
          twoFactorEnabled: updated.twoFactorEnabled, // Instrução do programa — parte da lógica deste arquivo
          themePreference: updated.themePreference, // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método

    /** PATCH /api/me/profile — nome e telefone do usuário logado. */
    r.patch("/me/profile", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const parsed = profilePatchBody.safeParse(request.body); // Guarda um valor que não muda durante a execução deste trecho
      if (!parsed.success) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const { name, phone } = parsed.data; // Guarda um valor que não muda durante a execução deste trecho
      const phoneNorm = phone === undefined ? undefined : phone === null ? null : normalizePhone(phone); // Guarda um valor que não muda durante a execução deste trecho
      if (phone !== undefined && phone !== null && phone.length > 0 && !phoneNorm) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(400).send({ error: "Invalid phone number" }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const update: { name?: string; phone?: string | null } = {}; // Guarda um valor que não muda durante a execução deste trecho
      if (name !== undefined) update.name = name; // Só executa o bloco abaixo se esta condição for verdadeira
      if (phone !== undefined) update.phone = phoneNorm; // Só executa o bloco abaixo se esta condição for verdadeira

      if (Object.keys(update).length === 0) { // Só executa o bloco abaixo se esta condição for verdadeira
        const [u] = await db // Guarda um valor que não muda durante a execução deste trecho
          .select({ // Instrução do programa — parte da lógica deste arquivo
            id: users.id, // Instrução do programa — parte da lógica deste arquivo
            name: users.name, // Instrução do programa — parte da lógica deste arquivo
            email: users.email, // Instrução do programa — parte da lógica deste arquivo
            phone: users.phone, // Instrução do programa — parte da lógica deste arquivo
            plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
            createdAt: users.createdAt, // Instrução do programa — parte da lógica deste arquivo
          }) // Fecha bloco iniciado anteriormente
          .from(users) // Instrução do programa — parte da lógica deste arquivo
          .where(eq(users.id, userId)); // Filtra quais linhas do banco entram na consulta
        return reply.send({ user: u }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (phoneNorm) { // Só executa o bloco abaixo se esta condição for verdadeira
        await releasePhoneFromOtherUsers(phoneNorm, userId); // Espera terminar uma tarefa assíncrona antes de continuar
      } // Fecha um bloco de código (if, função, objeto, etc.)

      const [u] = await db // Guarda um valor que não muda durante a execução deste trecho
        .update(users) // Instrução do programa — parte da lógica deste arquivo
        .set(update) // Define quais colunas serão alteradas no UPDATE
        .where(eq(users.id, userId)) // Filtra quais linhas do banco entram na consulta
        .returning({ // Pede ao banco devolver os dados gravados
          id: users.id, // Instrução do programa — parte da lógica deste arquivo
          name: users.name, // Instrução do programa — parte da lógica deste arquivo
          email: users.email, // Instrução do programa — parte da lógica deste arquivo
          phone: users.phone, // Instrução do programa — parte da lógica deste arquivo
          plan: users.plan, // Instrução do programa — parte da lógica deste arquivo
          createdAt: users.createdAt, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método

      return reply.send({ user: u }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** POST /api/account/seed-demo — popula transações demo se conta vazia. */
    r.post("/account/seed-demo", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      const result = await seedMockDataForUser(userId); // Guarda um valor que não muda durante a execução deste trecho
      if (result.skipped) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.send({ ok: true, skipped: true, message: "Conta já possui transações." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      return reply.send({ ok: true, skipped: false, inserted: result.inserted }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** POST /api/account/seed-rich-demo — pacote completo (conta demo configurada). */
    r.post("/account/seed-rich-demo", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const email = request.user!.email.toLowerCase(); // Guarda um valor que não muda durante a execução deste trecho
      if (email !== RICH_DEMO_EMAIL) { // Só executa o bloco abaixo se esta condição for verdadeira
        return reply.status(403).send({ error: "Pacote completo disponível apenas para a conta configurada." }); // Envia resposta HTTP de volta ao navegador ou app
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const { inserted } = await seedRichMockForUserId(request.user!.id); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ ok: true, inserted, message: "Transações anteriores foram substituídas pelo pacote completo." }); // Envia resposta HTTP de volta ao navegador ou app
    }); // Fecha chamada de função ou método

    /** GET /api/reports/monthly — agregação receita/despesa por mês. */
    r.get("/reports/monthly", async (request: FastifyRequest, reply: FastifyReply) => { // Define endpoint REST dentro do grupo de rotas
      const userId = request.user!.id; // Guarda um valor que não muda durante a execução deste trecho
      await materializeDueRecurringIncomes(userId); // Espera terminar uma tarefa assíncrona antes de continuar

      const rows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ // Instrução do programa — parte da lógica deste arquivo
          amount: transactions.amount, // Instrução do programa — parte da lógica deste arquivo
          type: transactions.type, // Instrução do programa — parte da lógica deste arquivo
          occurredAt: transactions.occurredAt, // Instrução do programa — parte da lógica deste arquivo
        }) // Fecha bloco iniciado anteriormente
        .from(transactions) // Instrução do programa — parte da lógica deste arquivo
        .where(and(eq(transactions.userId, userId), eq(transactions.isActive, true))); // Filtra quais linhas do banco entram na consulta

      const budgetRows = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ month: budgets.month, income: budgets.totalIncomeExpected }) // Instrução do programa — parte da lógica deste arquivo
        .from(budgets) // Instrução do programa — parte da lógica deste arquivo
        .where(eq(budgets.userId, userId)); // Filtra quais linhas do banco entram na consulta

      const byMonth = new Map<string, { income: number; expense: number }>(); // Guarda um valor que não muda durante a execução deste trecho
      for (const t of rows) { // Repete o bloco para cada item da lista
        const key = t.occurredAt.toISOString().slice(0, 7); // YYYY-MM
        const cur = byMonth.get(key) ?? { income: 0, expense: 0 }; // Guarda um valor que não muda durante a execução deste trecho
        if (t.type === "income") cur.income += num(t.amount); // Só executa o bloco abaixo se esta condição for verdadeira
        else cur.expense += num(t.amount); // Caminho alternativo quando o if não passou
        byMonth.set(key, cur); // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)
      for (const b of budgetRows) { // Repete o bloco para cada item da lista
        const expected = b.income != null ? num(b.income) : 0; // Guarda um valor que não muda durante a execução deste trecho
        if (expected <= 0) continue; // Só executa o bloco abaixo se esta condição for verdadeira
        const cur = byMonth.get(b.month) ?? { income: 0, expense: 0 }; // Guarda um valor que não muda durante a execução deste trecho
        if (cur.income < expected) cur.income = expected; // Só executa o bloco abaixo se esta condição for verdadeira
        byMonth.set(b.month, cur); // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)
      const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])); // Guarda um valor que não muda durante a execução deste trecho
      return reply.send({ // Envia resposta HTTP de volta ao navegador ou app
        months: sorted.map(([month, v]) => ({ // Atribui ou calcula um valor para usar adiante
          month, // Instrução do programa — parte da lógica deste arquivo
          income: Math.round(v.income * 100) / 100, // Instrução do programa — parte da lógica deste arquivo
          expense: Math.round(v.expense * 100) / 100, // Instrução do programa — parte da lógica deste arquivo
          balance: Math.round((v.income - v.expense) * 100) / 100, // Instrução do programa — parte da lógica deste arquivo
        })), // Fecha bloco iniciado anteriormente
      }); // Fecha chamada de função ou método
    }); // Fecha chamada de função ou método
  }, { prefix: "/api" }); // Fecha registro de rotas informando o prefixo da URL
} // Fecha um bloco de código (if, função, objeto, etc.)
