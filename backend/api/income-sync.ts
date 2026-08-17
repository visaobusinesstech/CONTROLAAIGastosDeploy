/**
 * Sincroniza renda mensal do perfil com transações, orçamentos e recorrência — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { budgets, recurringTransactions, transactions } from "../src/db/schema.js";
import { findCategoryId } from "./category-resolver.js";
import { monthKey, num } from "../src/utils/money.js";
import type { IncomeRecurrence, IncomeType } from "./onboarding-agent.js";

/** Marcador em raw_message para identificar receita gerada pelo perfil (evita duplicar). */
export const INCOME_PROFILE_MARKER = "[renda-mensal-perfil]";

/** Descrição amigável da transação conforme tipo de renda informado no onboarding. */
function incomeDescription(incomeType?: IncomeType | null): string {
  if (incomeType === "salary") return "Salário";
  if (incomeType === "freelance") return "Renda freelance";
  if (incomeType === "mixed") return "Renda mista";
  return "Renda mensal";
}

/** Data de recebimento no mês (dia do pagamento ou dia 1). */
function payDateForMonth(month: string, payDay: number | null | undefined): Date {
  const day = payDay != null && payDay >= 1 && payDay <= 28 ? payDay : 1;
  return new Date(`${month}-${String(day).padStart(2, "0")}T12:00:00.000Z`);
}

/** Cria ou atualiza transação de receita do mês para alimentar gráficos e saldo no painel. */
export async function syncIncomeToDashboard(
  userId: string,
  amount: number,
  options?: {
    incomeType?: IncomeType | null;
    recurrence?: IncomeRecurrence | null;
    payDay?: number | null;
    month?: string;
  },
): Promise<void> {
  if (amount <= 0) return;

  const month = options?.month ?? monthKey(new Date());
  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        eq(transactions.rawMessage, INCOME_PROFILE_MARKER),
        gte(transactions.occurredAt, monthStart),
        lte(transactions.occurredAt, monthEnd),
      ),
    )
    .limit(1);

  const { id: categoryId } = await findCategoryId(
    userId,
    "Salário",
    "income",
    incomeDescription(options?.incomeType),
  );
  const occurredAt = payDateForMonth(month, options?.payDay);
  const description = incomeDescription(options?.incomeType);
  const source = options?.recurrence === "monthly_fixed" ? "recurring" : "manual";

  if (existing) {
    await db
      .update(transactions)
      .set({
        amount: String(amount),
        description,
        occurredAt,
        categoryId,
        source,
        isActive: true,
      })
      .where(eq(transactions.id, existing.id));
    return;
  }

  await db.insert(transactions).values({
    userId,
    categoryId,
    amount: String(amount),
    type: "income",
    description,
    occurredAt,
    source,
    rawMessage: INCOME_PROFILE_MARKER,
  });
}

/** Replica orçamento de renda para meses futuros (renda fixa mensal). */
export async function propagateMonthlyBudgets(userId: string, amount: number, monthsAhead = 11): Promise<void> {
  if (amount <= 0) return;
  const base = new Date();
  for (let i = 1; i <= monthsAhead; i++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1));
    const m = monthKey(d);
    await db
      .insert(budgets)
      .values({ userId, month: m, totalIncomeExpected: String(amount) })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.month],
        set: { totalIncomeExpected: String(amount) },
      });
  }
}

/** Cadastra ou atualiza recorrência mensal de renda no banco. */
export async function upsertIncomeRecurring(
  userId: string,
  amount: number,
  payDay: number,
  incomeType?: IncomeType | null,
): Promise<void> {
  if (amount <= 0) return;

  const desc = incomeDescription(incomeType);
  const day = payDay >= 1 && payDay <= 28 ? payDay : 1;
  const month = monthKey(new Date());
  const nextDue = payDateForMonth(month, day).toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.type, "income"),
        eq(recurringTransactions.isActive, true),
      ),
    );

  const [existing] = rows;

  if (existing) {
    await db
      .update(recurringTransactions)
      .set({
        amount: String(amount),
        description: desc,
        dayOfMonth: day,
        nextDue,
      })
      .where(eq(recurringTransactions.id, existing.id));
    return;
  }

  const { id: categoryId } = await findCategoryId(userId, "Salário", "income", desc);
  await db.insert(recurringTransactions).values({
    userId,
    categoryId,
    description: desc,
    amount: String(amount),
    type: "income",
    frequency: "monthly",
    dayOfMonth: day,
    nextDue,
    isActive: true,
  });
}

/** Materializa receitas recorrentes vencidas — chamado ao listar transações/relatórios. */
export async function materializeDueRecurringIncomes(userId: string): Promise<number> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(recurringTransactions)
    .where(
      and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.type, "income"),
        eq(recurringTransactions.isActive, true),
      ),
    );

  let count = 0;
  for (const row of rows) {
    const dueStr = String(row.nextDue);
    if (dueStr > todayStr) continue;

    const month = dueStr.slice(0, 7);
    const amount = num(row.amount);
    await syncIncomeToDashboard(userId, amount, {
      recurrence: "monthly_fixed",
      payDay: row.dayOfMonth,
      month,
    });

    await db
      .insert(budgets)
      .values({ userId, month, totalIncomeExpected: String(amount) })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.month],
        set: { totalIncomeExpected: String(amount) },
      });

    const next = new Date(`${dueStr}T12:00:00.000Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const nextDue = next.toISOString().slice(0, 10);

    await db
      .update(recurringTransactions)
      .set({ nextDue })
      .where(eq(recurringTransactions.id, row.id));

    count++;
  }
  return count;
}

/** Sincroniza perfil completo de renda com painel (transação + orçamentos + recorrência). */
export async function syncFullIncomeProfile(
  userId: string,
  amount: number,
  options?: {
    incomeType?: IncomeType | null;
    recurrence?: IncomeRecurrence | null;
    payDay?: number | null;
  },
): Promise<void> {
  if (amount <= 0) return;

  const recurrence = options?.recurrence ?? "manual";
  await syncIncomeToDashboard(userId, amount, {
    incomeType: options?.incomeType,
    recurrence,
    payDay: options?.payDay,
  });

  if (recurrence === "monthly_fixed") {
    const payDay = options?.payDay ?? 1;
    await propagateMonthlyBudgets(userId, amount);
    await upsertIncomeRecurring(userId, amount, payDay, options?.incomeType);
  }
}
