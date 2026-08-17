/**
 * Metas financeiras enriquecidas com progresso real.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Calcula quanto já foi gasto/poupado a partir das transações do usuário.
 */

import { and, eq, gte, lte, sql } from "drizzle-orm"; // Operadores SQL tipados
import { db } from "./db/index.js"; // Cliente PostgreSQL
import { categories, goals, transactions } from "./db/schema.js"; // Tabelas de metas e lançamentos
import { num, monthKey } from "./utils/money.js"; // Parse numeric e chave YYYY-MM

/** Meta com progresso calculado — retornada por GET /api/goals. */
export type EnrichedGoal = {
  id: string;
  name: string;
  color: string;
  limitAmount: number;
  periodType: string;
  goalType: string;
  targetAmount: number | null;
  durationMonths: number | null;
  deadlineAt: string | null;
  isActive: boolean;
  categoryName: string | null;
  categoryId: string | null;
  categoryIcon: string | null;
  currentAmount: number; // Valor acumulado no período
  percentage: number; // % do alvo atingido
  riskLevel: "low" | "medium" | "high"; // Semáforo para UI
  exceeded: boolean; // true se gasto passou do limite
};

type PeriodBoundsInput = {
  periodType: string;
  goalType: string;
  durationMonths: number | null;
  createdAt: Date;
  deadlineAt: Date | null;
};

/** Calcula intervalo [from, to] — poupança usa prazo total; limite usa ciclo mensal/trimestral/anual. */
function periodBounds(input: PeriodBoundsInput): { from: Date; to: Date } {
  const now = new Date();

  if (input.goalType === "saving" && input.durationMonths != null && input.durationMonths > 0) {
    const from = new Date(input.createdAt);
    from.setUTCHours(0, 0, 0, 0);
    const to = input.deadlineAt ? new Date(input.deadlineAt) : new Date(from);
    if (!input.deadlineAt) {
      to.setUTCMonth(to.getUTCMonth() + input.durationMonths);
    }
    return { from, to: now < to ? now : to };
  }

  const month = monthKey(now);
  const from = new Date(`${month}-01T00:00:00.000Z`);
  const to = new Date(from);

  if (input.periodType === "yearly") {
    to.setUTCFullYear(to.getUTCFullYear() + 1);
  } else if (input.periodType === "quarterly") {
    to.setUTCMonth(to.getUTCMonth() + 3);
  } else {
    to.setUTCMonth(to.getUTCMonth() + 1);
  }

  return { from, to: now < to ? now : to };
}

/** Calcula deadline a partir do prazo em meses. */
export function computeGoalDeadline(from: Date, durationMonths: number): Date {
  const deadline = new Date(from);
  deadline.setUTCMonth(deadline.getUTCMonth() + durationMonths);
  return deadline;
}

/** Define nível de risco conforme % e tipo de meta (limite vs poupança). */
function riskFromPercentage(pct: number, goalType: string): "low" | "medium" | "high" {
  if (goalType === "saving") {
    if (pct >= 80) return "low"; // Poupança perto do alvo = bom
    if (pct >= 50) return "medium";
    return "high"; // Poupança baixa = alerta
  }
  if (pct >= 100) return "high"; // Limite estourado
  if (pct >= 80) return "medium"; // Próximo do teto
  return "low";
}

/** Lista metas do usuário com progresso real agregado das transações. */
export async function getEnrichedGoals(userId: string): Promise<EnrichedGoal[]> {
  const rows = await db
    .select({
      id: goals.id,
      name: goals.name,
      color: goals.color,
      limitAmount: goals.limitAmount,
      periodType: goals.periodType,
      goalType: goals.goalType,
      targetAmount: goals.targetAmount,
      durationMonths: goals.durationMonths,
      deadlineAt: goals.deadlineAt,
      createdAt: goals.createdAt,
      isActive: goals.isActive,
      categoryName: categories.name,
      categoryId: goals.categoryId,
      categoryIcon: categories.icon,
    })
    .from(goals)
    .leftJoin(categories, eq(goals.categoryId, categories.id)) // Nome/ícone da categoria
    .where(eq(goals.userId, userId))
    .orderBy(sql`${goals.createdAt} desc`); // Mais recentes primeiro

  const enriched: EnrichedGoal[] = [];

  for (const g of rows) {
    const { from, to } = periodBounds({
      periodType: g.periodType,
      goalType: g.goalType,
      durationMonths: g.durationMonths,
      createdAt: g.createdAt,
      deadlineAt: g.deadlineAt,
    });
    const target = g.targetAmount != null ? num(g.targetAmount) : num(g.limitAmount); // Alvo numérico

    let currentAmount = 0;

    if (g.goalType === "limit" && g.categoryId) {
      // Soma despesas da categoria no período
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.categoryId, g.categoryId),
            eq(transactions.type, "expense"),
            eq(transactions.isActive, true),
            gte(transactions.occurredAt, from),
            lte(transactions.occurredAt, to),
          ),
        );
      currentAmount = num(row?.total ?? "0");
    } else if (g.goalType === "saving") {
      // Soma receitas no período (meta de poupança)
      const [row] = await db
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "income"),
            eq(transactions.isActive, true),
            gte(transactions.occurredAt, from),
            lte(transactions.occurredAt, to),
          ),
        );
      currentAmount = num(row?.total ?? "0");
    }

    const percentage = target > 0 ? Math.round((currentAmount / target) * 1000) / 10 : 0; // 1 casa decimal
    const exceeded = g.goalType === "limit" ? currentAmount > target : false;

    enriched.push({
      id: g.id,
      name: g.name,
      color: g.color,
      limitAmount: num(g.limitAmount),
      periodType: g.periodType,
      goalType: g.goalType,
      targetAmount: g.targetAmount != null ? num(g.targetAmount) : null,
      durationMonths: g.durationMonths ?? null,
      deadlineAt: g.deadlineAt ? g.deadlineAt.toISOString() : null,
      isActive: g.isActive,
      categoryName: g.categoryName,
      categoryId: g.categoryId,
      categoryIcon: g.categoryIcon,
      currentAmount: Math.round(currentAmount * 100) / 100,
      percentage,
      riskLevel: riskFromPercentage(percentage, g.goalType),
      exceeded,
    });
  }

  return enriched;
}

/** Payload para criar meta via API ou agente IA. */
export type CreateGoalInput = {
  name: string;
  limitAmount: number;
  goalType?: "limit" | "saving";
  periodType?: "monthly" | "quarterly" | "yearly";
  targetAmount?: number | null;
  durationMonths?: number | null;
  categoryId?: string | null;
  color?: string;
};

/** Paleta padrão quando cor não informada. */
const GOAL_COLORS = ["#6366f1", "#4CAF50", "#42A5F5", "#FFB300", "#AB47BC", "#26C6DA"];

/** Conta metas ativas do usuário. */
export async function countUserGoals(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(goals)
    .where(eq(goals.userId, userId));
  return row?.count ?? 0;
}

/** Insere nova meta financeira para o usuário. */
export async function createGoalForUser(userId: string, input: CreateGoalInput) {
  const goalType = input.goalType ?? "limit"; // Padrão: teto de gasto
  const targetAmount =
    input.targetAmount ?? (goalType === "saving" ? input.limitAmount : null); // Poupança usa limit como alvo

  const now = new Date();
  const durationMonths =
    input.durationMonths != null && input.durationMonths > 0 ? input.durationMonths : null;
  const deadlineAt =
    durationMonths != null ? computeGoalDeadline(now, durationMonths) : null;

  const [row] = await db
    .insert(goals)
    .values({
      userId,
      name: input.name,
      categoryId: input.categoryId ?? null,
      limitAmount: String(input.limitAmount),
      periodType: input.periodType ?? "monthly",
      goalType,
      targetAmount: targetAmount != null ? String(targetAmount) : null,
      durationMonths,
      deadlineAt,
      color: input.color ?? GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)],
    })
    .returning();

  return row;
}
