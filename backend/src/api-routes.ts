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
import { materializeDueRecurringIncomes, syncFullIncomeProfile, syncIncomeToDashboard } from "../api/income-sync.js";
import type { IncomeRecurrence, IncomeType } from "../api/onboarding-agent.js";
import { billingAccessPreHandler } from "./billing-routes.js";
import { requestAuditMeta, writeAuditLog } from "./audit.js";
import { releasePhoneFromOtherUsers } from "../whatsapp/user-resolver.js";

/** Converte numeric Postgres para number (helper local). */
function num(v: string | null): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Busca ou cria user_settings para o usuário (1:1 com users). */
async function getOrCreateSettings(userId: string) {
  const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (row) return row;
  const [created] = await db.insert(userSettings).values({ userId }).returning();
  return created;
}

/** Normalização simples de telefone para PATCH /me/profile. */
function normalizePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits;
}

/** Schema Zod — POST /api/transactions */
const txCreateBody = z.object({
  amount: z.union([z.string(), z.number()]).transform((a) => String(a)),
  type: z.enum(["expense", "income"]),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).optional(),
  occurredAt: z.string().min(4).optional(),
  source: z.enum(["whatsapp", "web", "recurring", "manual"]).optional(),
});

/** Schema Zod — PATCH /api/transactions/:id */
const txPatchBody = z.object({
  amount: z.union([z.string(), z.number()]).transform((a) => String(a)).optional(),
  type: z.enum(["expense", "income"]).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  occurredAt: z.string().min(4).optional(),
  isActive: z.boolean().optional(),
});

/** Schema Zod — PUT /api/budgets */
const budgetPutBody = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  totalIncomeExpected: z
    .union([z.string(), z.number()])
    .transform((a) => String(a))
    .nullable()
    .optional(),
  totalExpenseLimit: z
    .union([z.string(), z.number()])
    .transform((a) => String(a))
    .nullable()
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/** Schema Zod — PATCH /api/settings */
const settingsPatchBody = z.object({
  alertAt80: z.boolean().optional(),
  alertAt100: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  themePreference: z.enum(["light", "dark", "system"]).optional(),
});

/** Schema Zod — PATCH /api/me/profile */
const profilePatchBody = z.object({
  name: z.string().min(2).max(200).optional(),
  phone: z.string().max(32).nullable().optional(),
});

/** Mapeia linha do banco para JSON da API (datas ISO, amount number). */
function mapTxRow(row: {
  id: string;
  userId: string;
  categoryId: string | null;
  amount: string;
  type: "expense" | "income";
  description: string | null;
  occurredAt: Date;
  source: "whatsapp" | "web" | "recurring" | "manual";
  createdAt: Date;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}) {
  return {
    id: row.id,
    amount: num(row.amount),
    type: row.type,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    source: row.source,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryIcon: row.categoryIcon,
    categoryColor: row.categoryColor,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Registra todas as rotas CRUD principais com prefixo /api. */
export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.register(async (r) => {
    r.addHook("preHandler", authPreHandler); // Todas exigem JWT

    /** GET /api/categories — globais + personalizadas do usuário. */
    r.get("/categories", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const rows = await db
        .select()
        .from(categories)
        .where(
          and(
            or(isNull(categories.userId), eq(categories.userId, userId)),
            eq(categories.isActive, true),
          ),
        )
        .orderBy(categories.name);
      return reply.send({
        categories: rows.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          type: c.type,
          color: c.color,
          isDefault: c.isDefault,
        })),
      });
    });

    /** PATCH /api/categories/:id — inativa categoria do próprio usuário (sem exclusão). */
    r.patch<{ Params: { id: string } }>("/categories/:id", async (request, reply) => {
      const parsed = z.object({ isActive: z.boolean() }).safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const [row] = await db
        .update(categories)
        .set({ isActive: parsed.data.isActive })
        .where(and(eq(categories.id, request.params.id), eq(categories.userId, userId)))
        .returning({ id: categories.id, isActive: categories.isActive });
      if (!row) return reply.status(404).send({ error: "Not found" });
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: parsed.data.isActive ? "categories.activate" : "categories.inactivate",
        action: parsed.data.isActive ? "activate" : "inactivate",
        entity: "categories",
        entityId: row.id,
        ...meta,
      });
      return reply.send({ category: row });
    });

    /** GET /api/transactions — lista com filtros from, to, type. */
    r.get("/transactions", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      await materializeDueRecurringIncomes(userId);
      const q = request.query as Record<string, string | undefined>;
      const from = q.from ? new Date(q.from) : null;
      const to = q.to ? new Date(q.to) : null;
      const type = q.type as "expense" | "income" | undefined;

      const conds: SQL[] = [eq(transactions.userId, userId), eq(transactions.isActive, true)];
      if (from && !Number.isNaN(from.getTime())) conds.push(gte(transactions.occurredAt, from));
      if (to && !Number.isNaN(to.getTime())) conds.push(lte(transactions.occurredAt, to));
      if (type === "expense" || type === "income") conds.push(eq(transactions.type, type));

      const rows = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          categoryId: transactions.categoryId,
          amount: transactions.amount,
          type: transactions.type,
          description: transactions.description,
          occurredAt: transactions.occurredAt,
          source: transactions.source,
          createdAt: transactions.createdAt,
          categoryName: categories.name,
          categoryIcon: categories.icon,
          categoryColor: categories.color,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...conds))
        .orderBy(desc(transactions.occurredAt));

      return reply.send({ transactions: rows.map(mapTxRow) });
    });

    /** GET /api/transactions/export — CSV UTF-8 com BOM para Excel BR. */
    r.get("/transactions/export", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const q = request.query as Record<string, string | undefined>;
      const from = q.from ? new Date(q.from) : null;
      const to = q.to ? new Date(q.to) : null;

      const conds: SQL[] = [eq(transactions.userId, userId), eq(transactions.isActive, true)];
      if (from && !Number.isNaN(from.getTime())) conds.push(gte(transactions.occurredAt, from));
      if (to && !Number.isNaN(to.getTime())) conds.push(lte(transactions.occurredAt, to));

      const rows = await db
        .select({
          amount: transactions.amount,
          type: transactions.type,
          description: transactions.description,
          occurredAt: transactions.occurredAt,
          source: transactions.source,
          categoryName: categories.name,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...conds))
        .orderBy(desc(transactions.occurredAt));

      const sep = ";"; // Separador CSV padrão Excel BR
      const header = ["Data/Hora", "Tipo", "Valor", "Categoria", "Descrição", "Origem"].join(sep);
      const lines = rows.map((row) => {
        const dt = row.occurredAt.toISOString();
        const val = num(row.amount).toFixed(2).replace(".", ","); // Decimal BR
        const tipo = row.type === "income" ? "Receita" : "Despesa";
        const desc = (row.description ?? "").replaceAll(sep, " ");
        const cat = (row.categoryName ?? "").replaceAll(sep, " ");
        return [dt, tipo, val, cat, desc, row.source].join(sep);
      });
      const bom = "\uFEFF"; // BOM UTF-8 para Excel reconhecer acentos
      const body = bom + [header, ...lines].join("\r\n");
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", 'attachment; filename="controla-transacoes.csv"');
      return reply.send(body);
    });

    /** POST /api/transactions — cria lançamento manual/web. */
    r.post("/transactions", { preHandler: billingAccessPreHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = txCreateBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const { amount, type, categoryId, description, occurredAt, source } = parsed.data;
      const [row] = await db
        .insert(transactions)
        .values({
          userId,
          amount,
          type,
          categoryId: categoryId ?? null,
          description: description ?? null,
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
          source: source ?? "manual",
        })
        .returning();

      const [joined] = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          categoryId: transactions.categoryId,
          amount: transactions.amount,
          type: transactions.type,
          description: transactions.description,
          occurredAt: transactions.occurredAt,
          source: transactions.source,
          createdAt: transactions.createdAt,
          categoryName: categories.name,
          categoryIcon: categories.icon,
          categoryColor: categories.color,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(eq(transactions.id, row.id));

      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: "transactions.create",
        action: "insert",
        entity: "transactions",
        entityId: row.id,
        ...meta,
      });

      return reply.status(201).send({ transaction: mapTxRow(joined) });
    });

    /** PATCH /api/transactions/:id — atualização parcial. */
    r.patch<{ Params: { id: string } }>("/transactions/:id", async (request, reply) => {
      const parsed = txPatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const { id } = request.params;
      const [existing] = await db.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
      if (!existing) return reply.status(404).send({ error: "Not found" });

      const patch: Record<string, unknown> = {};
      if (parsed.data.amount !== undefined) patch.amount = parsed.data.amount;
      if (parsed.data.type !== undefined) patch.type = parsed.data.type;
      if (parsed.data.categoryId !== undefined) patch.categoryId = parsed.data.categoryId;
      if (parsed.data.description !== undefined) patch.description = parsed.data.description;
      if (parsed.data.occurredAt !== undefined) patch.occurredAt = new Date(parsed.data.occurredAt);
      if (parsed.data.isActive !== undefined) patch.isActive = parsed.data.isActive;

      if (Object.keys(patch).length === 0) {
        const [joined] = await db
          .select({
            id: transactions.id,
            userId: transactions.userId,
            categoryId: transactions.categoryId,
            amount: transactions.amount,
            type: transactions.type,
            description: transactions.description,
            occurredAt: transactions.occurredAt,
            source: transactions.source,
            createdAt: transactions.createdAt,
            categoryName: categories.name,
            categoryIcon: categories.icon,
            categoryColor: categories.color,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(eq(transactions.id, id));
        return reply.send({ transaction: mapTxRow(joined) });
      }

      await db.update(transactions).set(patch as never).where(eq(transactions.id, id));

      const [joined] = await db
        .select({
          id: transactions.id,
          userId: transactions.userId,
          categoryId: transactions.categoryId,
          amount: transactions.amount,
          type: transactions.type,
          description: transactions.description,
          occurredAt: transactions.occurredAt,
          source: transactions.source,
          createdAt: transactions.createdAt,
          categoryName: categories.name,
          categoryIcon: categories.icon,
          categoryColor: categories.color,
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(eq(transactions.id, id));

      const meta = requestAuditMeta(request);
      const inactivated = parsed.data.isActive === false;
      const activated = parsed.data.isActive === true;
      await writeAuditLog({
        userId,
        routine: inactivated ? "transactions.inactivate" : activated ? "transactions.activate" : "transactions.update",
        action: inactivated ? "inactivate" : activated ? "activate" : "update",
        entity: "transactions",
        entityId: id,
        ...meta,
        details: patch,
      });

      return reply.send({ transaction: mapTxRow(joined) });
    });

    /** DELETE /api/transactions/:id — inativa lançamento (sem exclusão física). */
    r.delete<{ Params: { id: string } }>("/transactions/:id", async (request, reply) => {
      const userId = request.user!.id;
      const { id } = request.params;
      const [row] = await db
        .update(transactions)
        .set({ isActive: false })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId), eq(transactions.isActive, true)))
        .returning({ id: transactions.id });
      if (!row) return reply.status(404).send({ error: "Not found" });
      const meta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: "transactions.inactivate",
        action: "inactivate",
        entity: "transactions",
        entityId: id,
        ...meta,
      });
      return reply.send({ ok: true, inactivated: true });
    });

    /** GET /api/budgets?month=YYYY-MM — orçamento do mês. */
    r.get("/budgets", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const q = request.query as { month?: string };
      if (!q.month || !/^\d{4}-\d{2}$/.test(q.month)) {
        return reply.status(400).send({ error: "Query month=YYYY-MM required" });
      }
      const [row] = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, q.month)));
      return reply.send({
        budget: row
          ? {
              month: row.month,
              totalIncomeExpected: row.totalIncomeExpected != null ? num(row.totalIncomeExpected) : null,
              totalExpenseLimit: row.totalExpenseLimit != null ? num(row.totalExpenseLimit) : null,
              notes: row.notes,
            }
          : null,
      });
    });

    /** PUT /api/budgets — upsert orçamento mensal. */
    r.put("/budgets", async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = budgetPutBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const { month, totalIncomeExpected, totalExpenseLimit, notes } = parsed.data;

      const [existing] = await db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, month)));
      const inc =
        totalIncomeExpected !== undefined ? totalIncomeExpected : existing?.totalIncomeExpected ?? null;
      const lim =
        totalExpenseLimit !== undefined ? totalExpenseLimit : existing?.totalExpenseLimit ?? null;
      const n = notes !== undefined ? notes : existing?.notes ?? null;

      const [row] = await db
        .insert(budgets)
        .values({
          userId,
          month,
          totalIncomeExpected: inc,
          totalExpenseLimit: lim,
          notes: n,
        })
        .onConflictDoUpdate({
          target: [budgets.userId, budgets.month],
          set: {
            totalIncomeExpected: inc,
            totalExpenseLimit: lim,
            notes: n,
          },
        })
        .returning();

      const budgetMeta = requestAuditMeta(request);
      await writeAuditLog({
        userId,
        routine: existing ? "budgets.update" : "budgets.create",
        action: existing ? "update" : "insert",
        entity: "budgets",
        entityId: row.id,
        ...budgetMeta,
      });

      // Renda informada no painel → transação + recorrência + saldo no dashboard
      if (totalIncomeExpected !== undefined && inc != null) {
        const incomeAmount = num(inc);
        if (incomeAmount > 0) {
          const [settingsRow] = await db
            .select({
              incomeRecurrence: userSettings.incomeRecurrence,
              incomePayDay: userSettings.incomePayDay,
              incomeType: userSettings.incomeType,
            })
            .from(userSettings)
            .where(eq(userSettings.userId, userId));
          const recurrence = (settingsRow?.incomeRecurrence as IncomeRecurrence | null) ?? "manual";
          if (recurrence === "monthly_fixed") {
            await syncFullIncomeProfile(userId, incomeAmount, {
              recurrence: "monthly_fixed",
              payDay: settingsRow?.incomePayDay ?? 1,
              incomeType: (settingsRow?.incomeType as IncomeType | null) ?? null,
            });
          } else {
            await syncIncomeToDashboard(userId, incomeAmount, {
              recurrence,
              payDay: settingsRow?.incomePayDay ?? null,
              month,
              incomeType: (settingsRow?.incomeType as IncomeType | null) ?? null,
            });
          }
          await db
            .update(userSettings)
            .set({ onboardingCompleted: true, updatedAt: new Date() })
            .where(eq(userSettings.userId, userId));
        }
      }

      return reply.send({
        budget: {
          month: row.month,
          totalIncomeExpected: row.totalIncomeExpected != null ? num(row.totalIncomeExpected) : null,
          totalExpenseLimit: row.totalExpenseLimit != null ? num(row.totalExpenseLimit) : null,
          notes: row.notes,
        },
      });
    });

    /** GET /api/settings — preferências do usuário. */
    r.get("/settings", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const s = await getOrCreateSettings(userId);
      return reply.send({
        settings: {
          alertAt80: s.alertAt80,
          alertAt100: s.alertAt100,
          weeklyReport: s.weeklyReport,
          twoFactorEnabled: s.twoFactorEnabled,
          themePreference: s.themePreference,
          onboardingCompleted: s.onboardingCompleted,
          initialBalance: s.initialBalance != null ? num(s.initialBalance) : null,
          incomeRecurrence: s.incomeRecurrence ?? null,
          incomePayDay: s.incomePayDay ?? null,
          incomePayWeekday: s.incomePayWeekday ?? null,
        },
      });
    });

    /** PATCH /api/settings — atualiza preferências parciais. */
    r.patch("/settings", async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = settingsPatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      await getOrCreateSettings(userId);
      const patch = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      ) as Partial<{
        alertAt80: boolean;
        alertAt100: boolean;
        weeklyReport: boolean;
        themePreference: "light" | "dark" | "system";
      }>;
      if (Object.keys(patch).length === 0) {
        const s = await getOrCreateSettings(userId);
        return reply.send({
          settings: {
            alertAt80: s.alertAt80,
            alertAt100: s.alertAt100,
            weeklyReport: s.weeklyReport,
            twoFactorEnabled: s.twoFactorEnabled,
            themePreference: s.themePreference,
          },
        });
      }
      const [updated] = await db
        .update(userSettings)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId))
        .returning();

      return reply.send({
        settings: {
          alertAt80: updated.alertAt80,
          alertAt100: updated.alertAt100,
          weeklyReport: updated.weeklyReport,
          twoFactorEnabled: updated.twoFactorEnabled,
          themePreference: updated.themePreference,
        },
      });
    });

    /** PATCH /api/me/profile — nome e telefone do usuário logado. */
    r.patch("/me/profile", async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = profilePatchBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
      }
      const userId = request.user!.id;
      const { name, phone } = parsed.data;
      const phoneNorm = phone === undefined ? undefined : phone === null ? null : normalizePhone(phone);
      if (phone !== undefined && phone !== null && phone.length > 0 && !phoneNorm) {
        return reply.status(400).send({ error: "Invalid phone number" });
      }

      const update: { name?: string; phone?: string | null } = {};
      if (name !== undefined) update.name = name;
      if (phone !== undefined) update.phone = phoneNorm;

      if (Object.keys(update).length === 0) {
        const [u] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            plan: users.plan,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, userId));
        return reply.send({ user: u });
      }

      if (phoneNorm) {
        await releasePhoneFromOtherUsers(phoneNorm, userId);
      }

      const [u] = await db
        .update(users)
        .set(update)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          plan: users.plan,
          createdAt: users.createdAt,
        });

      return reply.send({ user: u });
    });

    /** POST /api/account/seed-demo — popula transações demo se conta vazia. */
    r.post("/account/seed-demo", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      const result = await seedMockDataForUser(userId);
      if (result.skipped) {
        return reply.send({ ok: true, skipped: true, message: "Conta já possui transações." });
      }
      return reply.send({ ok: true, skipped: false, inserted: result.inserted });
    });

    /** POST /api/account/seed-rich-demo — pacote completo (conta demo configurada). */
    r.post("/account/seed-rich-demo", async (request: FastifyRequest, reply: FastifyReply) => {
      const email = request.user!.email.toLowerCase();
      if (email !== RICH_DEMO_EMAIL) {
        return reply.status(403).send({ error: "Pacote completo disponível apenas para a conta configurada." });
      }
      const { inserted } = await seedRichMockForUserId(request.user!.id);
      return reply.send({ ok: true, inserted, message: "Transações anteriores foram substituídas pelo pacote completo." });
    });

    /** GET /api/reports/monthly — agregação receita/despesa por mês. */
    r.get("/reports/monthly", async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user!.id;
      await materializeDueRecurringIncomes(userId);

      const rows = await db
        .select({
          amount: transactions.amount,
          type: transactions.type,
          occurredAt: transactions.occurredAt,
        })
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.isActive, true)));

      const budgetRows = await db
        .select({ month: budgets.month, income: budgets.totalIncomeExpected })
        .from(budgets)
        .where(eq(budgets.userId, userId));

      const byMonth = new Map<string, { income: number; expense: number }>();
      for (const t of rows) {
        const key = t.occurredAt.toISOString().slice(0, 7); // YYYY-MM
        const cur = byMonth.get(key) ?? { income: 0, expense: 0 };
        if (t.type === "income") cur.income += num(t.amount);
        else cur.expense += num(t.amount);
        byMonth.set(key, cur);
      }
      for (const b of budgetRows) {
        const expected = b.income != null ? num(b.income) : 0;
        if (expected <= 0) continue;
        const cur = byMonth.get(b.month) ?? { income: 0, expense: 0 };
        if (cur.income < expected) cur.income = expected;
        byMonth.set(b.month, cur);
      }
      const sorted = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      return reply.send({
        months: sorted.map(([month, v]) => ({
          month,
          income: Math.round(v.income * 100) / 100,
          expense: Math.round(v.expense * 100) / 100,
          balance: Math.round((v.income - v.expense) * 100) / 100,
        })),
      });
    });
  }, { prefix: "/api" });
}
