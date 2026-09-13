/**
 * Contexto financeiro completo do usuário — IA acessa perfil, transações, metas — Controla.ai
 *
 * Papel no sistema: Lógica de domínio/IA compartilhada entre HTTP e WhatsApp.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { and, desc, eq, sql } from "drizzle-orm"; // Filtros, ordenação e subquery SQL
import { db } from "../src/db/index.js"; // Cliente PostgreSQL Drizzle
import {
  budgets,
  goals,
  transactions,
  userSettings,
  users,
} from "../src/db/schema.js"; // Tabelas do perfil e movimentações
import { formatBrl, monthKey, num } from "../src/utils/money.js"; // Utilitários monetários
import { getUserBalance, getFinancialSnapshot } from "./insights.js"; // Totais e projeções do mês
import { getTopCategories, getUserPreferences } from "./financial-memory.js"; // Memória de categorias
import type { IncomeRecurrence } from "./onboarding-agent.js"; // Tipo de recorrência da renda

/** Tipo de fonte de renda informada no onboarding. */
export type IncomeType = "salary" | "freelance" | "mixed" | "other";

/** Perfil de renda mensal (não confundir com ganho pontual). */
export type UserIncomeProfile = {
  monthlyAmount: number | null;
  recurrence: IncomeRecurrence | null;
  payDay: number | null;
  payWeekday: number | null;
  incomeType: IncomeType | null;
  isRecurring: boolean | null;
  endDate: string | null;
  isComplete: boolean;
  missingFields: string[];
};

/** Contexto completo passado ao parser e agente IA. */
export type UserFinancialContext = {
  userId: string;
  userName: string | null;
  incomeProfile: UserIncomeProfile;
  monthBalance: { income: number; expense: number; balance: number };
  topCategories: string[];
  activeGoals: Array<{ name: string; target: number; type: string }>;
  recentTransactions: Array<{ type: string; amount: number; description: string; category: string | null }>;
  preferences: Record<string, unknown>;
  summaryForAi: string;
};

/** Nomes dos dias da semana para exibir dia de pagamento semanal. */
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Lista campos obrigatórios do perfil de renda que ainda faltam preencher. */
function buildMissingFields(profile: Omit<UserIncomeProfile, "missingFields" | "isComplete">): string[] {
  const missing: string[] = [];
  if (profile.monthlyAmount == null) missing.push("valor_mensal"); // Valor mensal ausente
  if (profile.recurrence == null) missing.push("recorrencia"); // Fixa/manual/semanal
  if (profile.incomeType == null) missing.push("tipo_renda"); // CLT, freela, etc.
  if (profile.recurrence === "monthly_fixed" && profile.payDay == null) missing.push("dia_pagamento"); // Dia do mês
  if (profile.recurrence === "weekly" && profile.payWeekday == null) missing.push("dia_semana"); // Dia da semana
  if (profile.incomeType === "freelance" && profile.isRecurring == null) missing.push("freela_recorrente"); // Freela fixo ou avulso
  return missing;
}

/** Carrega perfil de renda do usuário a partir de user_settings + budgets do mês. */
export async function loadUserIncomeProfile(userId: string): Promise<UserIncomeProfile> {
  const month = monthKey(new Date()); // YYYY-MM atual para buscar orçamento
  const [settings] = await db
    .select({
      incomeRecurrence: userSettings.incomeRecurrence,
      incomePayDay: userSettings.incomePayDay,
      incomePayWeekday: userSettings.incomePayWeekday,
      incomeType: userSettings.incomeType,
      incomeIsRecurring: userSettings.incomeIsRecurring,
      incomeEndDate: userSettings.incomeEndDate,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  const [budget] = await db
    .select({ income: budgets.totalIncomeExpected })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, month)));
  const monthlyAmount = budget?.income != null ? num(budget.income) : null;
  const recurrence = (settings?.incomeRecurrence as IncomeRecurrence | null) ?? null;
  const base = {
    monthlyAmount: monthlyAmount && monthlyAmount > 0 ? monthlyAmount : null,
    recurrence,
    payDay: settings?.incomePayDay ?? null,
    payWeekday: settings?.incomePayWeekday ?? null,
    incomeType: (settings?.incomeType as IncomeType | null) ?? null,
    isRecurring: settings?.incomeIsRecurring ?? null,
    endDate: settings?.incomeEndDate ?? null,
  };
  const missingFields = buildMissingFields(base);
  const incomeSaved = base.monthlyAmount != null && base.monthlyAmount > 0;
  return {
    ...base,
    missingFields: incomeSaved ? [] : missingFields,
    isComplete: incomeSaved,
  };
}

/** Monta texto resumido do perfil para o prompt da IA. */
export function formatIncomeProfileForAi(profile: UserIncomeProfile): string {
  if (!profile.monthlyAmount) return "Renda mensal: NÃO cadastrada.";
  const parts = [`Renda mensal: ${formatBrl(profile.monthlyAmount)}`];
  if (profile.incomeType) {
    const labels: Record<IncomeType, string> = {
      salary: "Salário CLT",
      freelance: "Freelance",
      mixed: "Mista",
      other: "Outra",
    };
    parts.push(`Tipo: ${labels[profile.incomeType]}`);
  }
  if (profile.recurrence) {
    const recLabels: Record<IncomeRecurrence, string> = {
      monthly_fixed: "fixa todo mês",
      manual: "informada manualmente",
      weekly: "semanal",
    };
    parts.push(`Recorrência: ${recLabels[profile.recurrence]}`);
  }
  if (profile.payDay) parts.push(`Recebe dia ${profile.payDay} do mês`);
  if (profile.payWeekday != null) parts.push(`Recebe toda ${WEEKDAYS[profile.payWeekday]}`);
  if (profile.incomeType === "freelance") {
    parts.push(profile.isRecurring ? "Freela recorrente" : "Freela avulso");
    if (profile.endDate) parts.push(`Até ${profile.endDate}`);
    else if (profile.isRecurring) parts.push("Prazo: indefinido");
  }
  if (profile.missingFields.length) {
    parts.push(`Faltam: ${profile.missingFields.join(", ")}`);
  }
  return parts.join(" · ");
}

/** Carrega contexto financeiro completo — parser e agente usam isso. */
export async function getUserFinancialContext(userId: string): Promise<UserFinancialContext> {
  const month = monthKey(new Date());
  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
  const incomeProfile = await loadUserIncomeProfile(userId);
  const monthBalance = await getUserBalance(userId, monthStart, monthEnd);
  const snap = await getFinancialSnapshot(userId);
  const topCategories = await getTopCategories(userId, 5);
  const preferences = await getUserPreferences(userId);
  const goalRows = await db
    .select({ name: goals.name, limitAmount: goals.limitAmount, goalType: goals.goalType })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.isActive, true)))
    .limit(5);
  const txRows = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      description: transactions.description,
      categoryName: sql<string>`(SELECT name FROM categories WHERE id = ${transactions.categoryId})`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.isActive, true)))
    .orderBy(desc(transactions.occurredAt))
    .limit(8);
  const recentTransactions = txRows.map((t) => ({
    type: t.type,
    amount: num(t.amount),
    description: t.description ?? "",
    category: t.categoryName ?? null,
  }));
  const activeGoals = goalRows.map((g) => ({
    name: g.name,
    target: num(g.limitAmount),
    type: g.goalType,
  }));
  const snapLine =
    snap.expectedIncome > 0
      ? `Disponível estimado (renda ${formatBrl(snap.expectedIncome)} − gastos): ${formatBrl(snap.projectedAvailable)}`
      : "";
  const summaryForAi = [
    `Usuário: ${user?.name ?? "sem nome"}`,
    formatIncomeProfileForAi(incomeProfile),
    `Mês atual — receitas: ${formatBrl(monthBalance.income)} · gastos: ${formatBrl(monthBalance.expense)} · saldo: ${formatBrl(monthBalance.balance)}`,
    snapLine,
    topCategories.length ? `Categorias frequentes: ${topCategories.join(", ")}` : "",
    activeGoals.length
      ? `Metas: ${activeGoals.map((g) => `${g.name} (${formatBrl(g.target)})`).join("; ")}`
      : "",
    recentTransactions.length
      ? `Últimos lançamentos: ${recentTransactions
          .slice(0, 5)
          .map((t) => `${t.type === "income" ? "+" : "-"}${formatBrl(t.amount)} ${t.description}`)
          .join(" | ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  return {
    userId,
    userName: user?.name ?? null,
    incomeProfile,
    monthBalance,
    topCategories,
    activeGoals,
    recentTransactions,
    preferences,
    summaryForAi,
  };
}

/** Usuário ainda precisa completar perfil de renda mensal? */
export function needsIncomeProfileFromContext(ctx: UserFinancialContext): boolean {
  return ctx.incomeProfile.monthlyAmount == null || ctx.incomeProfile.monthlyAmount <= 0;
}
