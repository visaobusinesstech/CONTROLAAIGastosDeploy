/**
 * Insights e chat financeiro — KPIs, projeções e respostas a perguntas — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"; // Tipo de mensagens do chat OpenAI
import { buildControlaAiChatPrompt } from "./prompts.js"; // Prompt do chat web com dados reais
import { getTopCategories } from "./financial-memory.js"; // Categorias frequentes do usuário
import { and, eq, gte, lte, sql } from "drizzle-orm"; // Operadores para filtros de período
import { db } from "../src/db/index.js"; // Cliente Drizzle PostgreSQL
import { budgets, categories, goals, transactions, userSettings } from "../src/db/schema.js"; // Tabelas usadas nos KPIs
import { num, formatBrl, monthKey } from "../src/utils/money.js"; // Utilitários monetários
import type { FinancialIntent } from "./parser.js"; // Intent parseado para consultas
import { getOpenAI, getOpenAIModel, isOpenAIConfigured } from "./openai-client.js"; // Cliente OpenAI
import { logAiOperation } from "./logger.js"; // Auditoria em ai_logs
import { buildSyncFooter } from "./app-links.js"; // Rodapé com link ao painel

/** Saldo agregado — receitas, despesas e diferença em um período. */
export type UserBalance = {
  income: number; // Total de receitas
  expense: number; // Total de despesas
  balance: number; // income - expense
};

/** Calcula totais de receita/despesa/saldo para o usuário em um intervalo de datas. */
export async function getUserBalance(userId: string, from?: Date, to?: Date): Promise<UserBalance> {
      const conds = [eq(transactions.userId, userId), eq(transactions.isActive, true)]; // Filtro base por usuário ativo
  if (from) conds.push(gte(transactions.occurredAt, from)); // Data inicial (inclusiva)
  if (to) conds.push(lte(transactions.occurredAt, to)); // Data final (inclusiva)

  const rows = await db
    .select({ amount: transactions.amount, type: transactions.type })
    .from(transactions)
    .where(and(...conds)); // Todas as transações no período

  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "income") income += num(r.amount); // Soma receitas
    else expense += num(r.amount); // Soma despesas (type expense)
  }
  return { income, expense, balance: income - expense }; // Saldo líquido
}

/** Renda mensal esperada (budgets) — base para saldo projetado no dashboard. */
export async function getExpectedMonthlyIncome(userId: string, month?: string): Promise<number> {
  const m = month ?? monthKey(new Date());
  const [budget] = await db
    .select({ income: budgets.totalIncomeExpected })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, m)));
  return budget?.income ? num(budget.income) : 0;
}

/** Snapshot financeiro do mês — inclui renda prevista e disponível estimado. */
export type FinancialSnapshot = {
  income: number;
  expense: number;
  balance: number;
  expectedIncome: number;
  projectedAvailable: number;
  incomePayDay: number | null;
};

export async function getFinancialSnapshot(userId: string): Promise<FinancialSnapshot> {
  const currentMonth = monthKey(new Date());
  const monthStart = new Date(`${currentMonth}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const tx = await getUserBalance(userId, monthStart, monthEnd);
  const expectedIncome = await getExpectedMonthlyIncome(userId, currentMonth);

  const [settings] = await db
    .select({ incomePayDay: userSettings.incomePayDay })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const effectiveIncome = Math.max(tx.income, expectedIncome);
  const projectedAvailable = effectiveIncome - tx.expense;

  return {
    income: tx.income,
    expense: tx.expense,
    balance: tx.balance,
    expectedIncome,
    projectedAvailable,
    incomePayDay: settings?.incomePayDay ?? null,
  };
}

/** Dias do mês com mais gastos (top N). */
export async function getTopSpendingDays(userId: string, limit = 5): Promise<Array<{ day: string; total: number }>> {
  const currentMonth = monthKey(new Date());
  const monthStart = new Date(`${currentMonth}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const rows = await db
    .select({
      day: sql<string>`to_char(${transactions.occurredAt}, 'DD/MM')`,
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isActive, true),
        eq(transactions.type, "expense"),
        gte(transactions.occurredAt, monthStart),
        lte(transactions.occurredAt, monthEnd),
      ),
    )
    .groupBy(sql`to_char(${transactions.occurredAt}, 'DD/MM')`)
    .orderBy(sql`sum(${transactions.amount}) desc`)
    .limit(limit);

  return rows.map((r) => ({ day: r.day, total: num(r.total) }));
}

/** Breakdown de despesas por categoria em um mês (YYYY-MM). */
export async function getMonthlyCategoryBreakdown(userId: string, month: string) {
  const from = new Date(`${month}-01T00:00:00.000Z`); // Primeiro dia do mês UTC
  const to = new Date(from);
  to.setUTCMonth(to.getUTCMonth() + 1); // Primeiro dia do mês seguinte

  const rows = await db
    .select({
      categoryName: categories.name,
      amount: transactions.amount,
      type: transactions.type,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id)) // JOIN para nome da categoria
    .where(and(eq(transactions.userId, userId), eq(transactions.isActive, true), gte(transactions.occurredAt, from), lte(transactions.occurredAt, to)));

  const byCat = new Map<string, number>(); // Acumulador categoria → total
  for (const r of rows) {
    if (r.type !== "expense") continue; // Só despesas no breakdown
    const cat = r.categoryName ?? "Outros"; // Fallback se sem categoria
    byCat.set(cat, (byCat.get(cat) ?? 0) + num(r.amount)); // Soma por categoria
  }
  return [...byCat.entries()].sort((a, b) => b[1] - a[1]); // Ordena do maior para menor gasto
}

/** KPIs financeiros calculados a partir de transações, orçamento e metas. */
export type FinancialKpis = {
  financialScore: number;
  endOfMonthBalanceProjection: number;
  expenseProjection: number;
  expectedIncome: number;
  projectedAvailable: number;
  trend: "up" | "down" | "stable";
  debtRisk: "low" | "medium" | "high";
  goalCompletionMonths: number | null;
};

/** Calcula KPIs financeiros do usuário com base no mês corrente e histórico. */
export async function computeFinancialKpis(userId: string): Promise<FinancialKpis> {
  const now = new Date();
  const currentMonth = monthKey(now); // YYYY-MM do mês atual
  const dayOfMonth = now.getUTCDate(); // Dia do mês (1-31)
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate(); // Total de dias no mês

  const monthStart = new Date(`${currentMonth}-01T00:00:00.000Z`);
  const current = await getUserBalance(userId, monthStart, now); // Totais do mês até hoje
  const expectedIncome = await getExpectedMonthlyIncome(userId, currentMonth);
  const effectiveIncome = Math.max(current.income, expectedIncome);

  const prevMonthDate = new Date(monthStart);
  prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1); // Mês anterior
  const prevMonth = monthKey(prevMonthDate);
  const prevStart = new Date(`${prevMonth}-01T00:00:00.000Z`);
  const prevEnd = new Date(monthStart); // Fim do mês anterior = início do atual
  const previous = await getUserBalance(userId, prevStart, prevEnd); // Totais do mês anterior completo

  const dailyExpenseRate = dayOfMonth > 0 ? current.expense / dayOfMonth : 0; // Média diária de gastos
  const expenseProjection = dailyExpenseRate * daysInMonth; // Projeção linear até fim do mês
  const endOfMonthBalanceProjection = effectiveIncome - expenseProjection;

  const savingsRate = effectiveIncome > 0 ? (effectiveIncome - current.expense) / effectiveIncome : 0;
  let financialScore = Math.round(Math.min(100, Math.max(0, savingsRate * 100 + 20))); // Score base + bônus

  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.month, currentMonth))); // Orçamento do mês

  if (budget?.totalExpenseLimit && num(budget.totalExpenseLimit) > 0) {
    const pct = current.expense / num(budget.totalExpenseLimit); // % do limite de gastos usado
    if (pct > 1) financialScore -= 20; // Ultrapassou orçamento — penaliza score
    else if (pct > 0.8) financialScore -= 10; // Próximo do limite — penaliza levemente
  }

  let trend: "up" | "down" | "stable" = "stable";
  const prevBalance = previous.balance;
  if (current.balance > prevBalance * 1.05) trend = "up"; // Saldo 5%+ melhor que mês anterior
  else if (current.balance < prevBalance * 0.95) trend = "down"; // Saldo 5%+ pior

  let debtRisk: "low" | "medium" | "high" = "low";
  if (current.expense > effectiveIncome * 1.1) debtRisk = "high";
  else if (current.expense > effectiveIncome * 0.95) debtRisk = "medium";

  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.isActive, true))); // Metas ativas do usuário

  let goalCompletionMonths: number | null = null;
  const savingGoal = activeGoals.find((g) => g.goalType === "saving" && g.targetAmount); // Primeira meta de poupança
  if (savingGoal && savingGoal.targetAmount) {
    const target = num(savingGoal.targetAmount); // Valor alvo da meta
    const monthlySaving = Math.max(effectiveIncome - current.expense, 0);
    if (monthlySaving > 0 && target > 0) {
      goalCompletionMonths = Math.ceil(target / monthlySaving); // Meses para atingir meta
    }
  }

  return {
    financialScore,
    endOfMonthBalanceProjection: Math.round(endOfMonthBalanceProjection * 100) / 100,
    expenseProjection: Math.round(expenseProjection * 100) / 100,
    expectedIncome,
    projectedAvailable: Math.round((effectiveIncome - current.expense) * 100) / 100,
    trend,
    debtRisk,
    goalCompletionMonths,
  };
}

/** Gera lista de insights textuais comparando mês atual vs anterior. */
export async function generateInsights(userId: string): Promise<string[]> {
  const now = new Date();
  const currentMonth = monthKey(now);
  const monthStart = new Date(`${currentMonth}-01T00:00:00.000Z`);

  const prevMonthDate = new Date(monthStart);
  prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
  const prevMonth = monthKey(prevMonthDate);

  const currentCats = await getMonthlyCategoryBreakdown(userId, currentMonth); // Breakdown mês atual
  const prevCats = await getMonthlyCategoryBreakdown(userId, prevMonth); // Breakdown mês anterior
  const insights: string[] = [];

  for (const [cat, amount] of currentCats.slice(0, 5)) {
    const prev = prevCats.find(([c]) => c === cat)?.[1] ?? 0; // Gasto da mesma categoria no mês anterior
    if (prev > 0 && amount > prev * 1.15) {
      const pct = Math.round(((amount - prev) / prev) * 100); // Aumento percentual
      insights.push(`Você gastou ${pct}% mais em ${cat}.`);
    }
  }

  const balance = await getUserBalance(userId, monthStart, now);
  if (balance.income > 0) {
    const reserveMonths = balance.balance / (balance.expense || 1); // Meses de reserva cobertos
    if (reserveMonths > 0) {
      insights.push(`Sua reserva cobre ${reserveMonths.toFixed(1)} meses de despesas.`);
    }
  }

  const kpis = await computeFinancialKpis(userId);
  if (kpis.goalCompletionMonths) {
    insights.push(`Você pode atingir sua meta principal em ${kpis.goalCompletionMonths} meses.`);
  }

  if (insights.length === 0) {
    insights.push("Suas finanças estão estáveis este mês. Continue registrando seus gastos!"); // Fallback positivo
  }

  return insights;
}

/** Responde consulta financeira estruturada (intent query) com dados reais do banco. */
export async function answerFinancialQuery(
  userId: string,
  intent: FinancialIntent,
): Promise<string> {
  const now = new Date();
  const currentMonth = monthKey(now);
  const monthStart = new Date(`${currentMonth}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const balance = await getUserBalance(userId, monthStart, now);
  const snap = await getFinancialSnapshot(userId);
  const queryType = intent.queryType ?? "general";

  switch (queryType) {
    case "top_spending_days": {
      const days = await getTopSpendingDays(userId, 5);
      if (days.length === 0) return "Ainda não há gastos registrados este mês para analisar os dias.";
      const lines = days.map((d, i) => `${i + 1}. Dia *${d.day}* — ${formatBrl(d.total)}`).join("\n");
      return `📅 *Dias em que você mais gastou este mês:*\n\n${lines}\n\nQuer ver por *categoria* ou uma *análise* completa?`;
    }
    case "income_profile_status": {
      const { buildIncomeStatusResponse } = await import("./assistant-response.js");
      return buildIncomeStatusResponse(userId);
    }
    case "monthly_spending": {
      const cats = await getMonthlyCategoryBreakdown(userId, currentMonth);
      const top = cats.slice(0, 3).map(([c, v]) => `• ${c}: ${formatBrl(v)}`).join("\n");
      const incomeLine = snap.expectedIncome > 0
        ? `Renda prevista: ${formatBrl(snap.expectedIncome)}\nDisponível estimado: ${formatBrl(snap.projectedAvailable)}`
        : `Receitas: ${formatBrl(balance.income)}\nSaldo: ${formatBrl(balance.balance)}`;
      return `📊 *Resumo do mês*\n\n${incomeLine}\nDespesas: ${formatBrl(balance.expense)}\n\n*Top categorias:*\n${top || "Nenhuma despesa registrada."}\n\nQuer saber em *quais dias* você mais gastou?`;
    }
    case "biggest_expense": {
      const cats = await getMonthlyCategoryBreakdown(userId, currentMonth);
      if (cats.length === 0) return "Você ainda não registrou despesas este mês.";
      const [cat, val] = cats[0]; // Primeira = maior gasto
      return `📈 Sua maior despesa este mês é *${cat}* com ${formatBrl(val)}.`;
    }
    case "can_spend": {
      const amount = intent.value ?? 0; // Valor que o usuário quer gastar
      const kpis = await computeFinancialKpis(userId);
      const available = Math.max(balance.balance, 0); // Saldo disponível (não negativo)
      if (amount <= available * 0.5) {
        return `✅ Sim! Com saldo de ${formatBrl(balance.balance)} e projeção de ${formatBrl(kpis.endOfMonthBalanceProjection)} no fim do mês, gastar ${formatBrl(amount)} parece seguro.`;
      }
      if (amount <= available) {
        return `⚠️ Cuidado. Você tem ${formatBrl(balance.balance)} disponível, mas isso comprometeria boa parte do mês.`;
      }
      return `❌ Não recomendado. Saldo atual: ${formatBrl(balance.balance)}. Valor solicitado: ${formatBrl(amount)}.`;
    }
    case "health_check": {
      const kpis = await computeFinancialKpis(userId);
      const emoji = kpis.financialScore >= 70 ? "✅" : kpis.financialScore >= 40 ? "⚠️" : "❌"; // Emoji por faixa de score
      return `${emoji} *Score Financeiro: ${kpis.financialScore}/100*\n\nTendência: ${kpis.trend === "up" ? "positiva 📈" : kpis.trend === "down" ? "negativa 📉" : "estável ➡️"}\nRisco de endividamento: ${kpis.debtRisk === "low" ? "baixo" : kpis.debtRisk === "medium" ? "médio" : "alto"}\nProjeção fim do mês: ${formatBrl(kpis.endOfMonthBalanceProjection)}`;
    }
    case "month_comparison": {
      const prevMonthDate = new Date(monthStart);
      prevMonthDate.setUTCMonth(prevMonthDate.getUTCMonth() - 1);
      const prevStart = new Date(`${monthKey(prevMonthDate)}-01T00:00:00.000Z`);
      const prev = await getUserBalance(userId, prevStart, monthStart); // Mês anterior completo
      const saved = balance.balance - prev.balance; // Diferença de saldo
      const sign = saved >= 0 ? "+" : "";
      return `📊 Comparativo com mês anterior:\n\nEconomia: ${sign}${formatBrl(saved)}\nDespesas: ${formatBrl(balance.expense)} vs ${formatBrl(prev.expense)}`;
    }
    default:
      return `Seu *disponível estimado* é ${formatBrl(snap.projectedAvailable)} (gastos: ${formatBrl(balance.expense)}). Quer uma *análise* completa ou ver *quais dias* você mais gastou?`;
  }
}

/** Gera resposta do chat web via OpenAI com contexto financeiro real do usuário. */
export async function generateAiChatResponse(
  userId: string,
  message: string,
  history: Array<{ role: string; content: string }>,
): Promise<string> {
  const balance = await getUserBalance(userId); // Saldo geral (sem filtro de período)
  const kpis = await computeFinancialKpis(userId);
  const insights = await generateInsights(userId);
  const topCategories = await getTopCategories(userId);
  const start = Date.now();

  if (!isOpenAIConfigured()) {
    return `Saldo: ${formatBrl(balance.balance)} | Score: ${kpis.financialScore}/100\n\n${insights.join("\n")}`; // Fallback sem IA
  }

  const openai = getOpenAI();
  const model = getOpenAIModel();
  const systemContent = buildControlaAiChatPrompt({
    balance: formatBrl(balance.balance),
    income: formatBrl(balance.income),
    expense: formatBrl(balance.expense),
    financialScore: kpis.financialScore,
    endOfMonthProjection: formatBrl(kpis.endOfMonthBalanceProjection),
    insights,
    topCategories,
  }); // Prompt com dados reais injetados

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...history.slice(-10).map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user", // Últimas 10 mensagens
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const completion = await openai.chat.completions.create({ model, messages, temperature: 0.7 }); // Chat mais criativo
  const response = completion.choices[0]?.message?.content ?? "Não consegui processar sua pergunta.";

  await logAiOperation({
    userId,
    source: "web_chat",
    operation: "chat",
    prompt: message,
    response,
    model,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    processingMs: Date.now() - start,
  });

  return response;
}

/** Gera relatório formatado para WhatsApp (semanal, mensal ou anual). */
export async function generatePeriodReport(
  userId: string,
  period: "weekly" | "monthly" | "yearly",
): Promise<string> {
  const now = new Date();
  let from: Date;
  let label: string;

  if (period === "weekly") {
    from = new Date(now);
    from.setUTCDate(from.getUTCDate() - 7); // Últimos 7 dias
    label = "Semanal";
  } else if (period === "yearly") {
    from = new Date(now.getUTCFullYear(), 0, 1); // 1º de janeiro do ano
    label = "Anual";
  } else {
    from = new Date(`${monthKey(now)}-01T00:00:00.000Z`); // Início do mês corrente
    label = "Mensal";
  }

  const balance = await getUserBalance(userId, from, now); // Totais no período
  const insights = await generateInsights(userId);
  const cats = await getMonthlyCategoryBreakdown(userId, monthKey(now)); // Breakdown do mês (mesmo em relatório semanal)
  const catLines = cats.slice(0, 5).map(([c, v]) => `• ${c}: ${formatBrl(v)}`).join("\n");

  return `📋 *Relatório ${label}*

Receitas: ${formatBrl(balance.income)}
Despesas: ${formatBrl(balance.expense)}
Saldo: ${formatBrl(balance.balance)}

*Principais categorias:*
${catLines || "—"}

*Insights:*
${insights.map((i) => `• ${i}`).join("\n")}${buildSyncFooter("report")}`; // Rodapé com link ao painel
}
