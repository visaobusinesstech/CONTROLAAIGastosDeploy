/**
 * Fonte única de verdade dos indicadores financeiros no frontend.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Regras:
 * - Ganhos / Faturamento bruto = soma dos lançamentos type=income
 * - Gastos = soma dos lançamentos type=expense
 * - Faturamento líquido = bruto − gastos
 * - Nunca misturar renda esperada (budget) nem saldo inicial nos indicadores de faturamento
 */

/** Frequências válidas para ganhos/faturamentos manuais. */
export const INCOME_FREQUENCIES = [
  "monthly",
  "recurring",
  "non_recurring",
  "sporadic",
] as const;

export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

export const INCOME_FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  monthly: "Mensal",
  recurring: "Recorrente",
  non_recurring: "Não recorrente",
  sporadic: "Esporádico",
};

/** Lançamento mínimo necessário para agregar indicadores. */
export type FinancialTx = {
  amount: number | string;
  type: "income" | "expense" | string;
};

/** Resultado canônico dos indicadores do período. */
export type FinancialPeriodSummary = {
  /** Soma dos ganhos reais registrados (= faturamento bruto). */
  ganhos: number;
  /** Soma das despesas reais registradas. */
  gastos: number;
  /** Alias explícito: igual a ganhos. */
  faturamentoBruto: number;
  /** Faturamento bruto − gastos. */
  faturamentoLiquido: number;
  /** Quantidade de ganhos no período. */
  ganhosCount: number;
  /** Quantidade de despesas no período. */
  gastosCount: number;
  /** true se não há nenhum lançamento income/expense. */
  isEmpty: boolean;
};

/** Converte amount string/number em number seguro. */
export function parseTxAmount(amount: number | string): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? n : 0;
}

/** Arredonda para 2 casas (centavos BRL). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula indicadores a partir dos lançamentos reais do período.
 * Não usa budget esperado nem saldo inicial — só dados cadastrados.
 */
export function computeFinancialPeriodSummary(txs: FinancialTx[]): FinancialPeriodSummary {
  let ganhos = 0;
  let gastos = 0;
  let ganhosCount = 0;
  let gastosCount = 0;

  for (const t of txs) {
    const value = parseTxAmount(t.amount);
    if (t.type === "income") {
      ganhos += value;
      ganhosCount += 1;
    } else if (t.type === "expense") {
      gastos += value;
      gastosCount += 1;
    }
  }

  ganhos = roundMoney(ganhos);
  gastos = roundMoney(gastos);
  const faturamentoLiquido = roundMoney(ganhos - gastos);

  return {
    ganhos,
    gastos,
    faturamentoBruto: ganhos,
    faturamentoLiquido,
    ganhosCount,
    gastosCount,
    isEmpty: ganhosCount === 0 && gastosCount === 0,
  };
}

/** Progresso de meta financeira baseada em ganhos reais (0–100+). */
export function computeGoalProgressPercent(ganhos: number, metaValor: number): number {
  if (!Number.isFinite(metaValor) || metaValor <= 0) return 0;
  if (!Number.isFinite(ganhos) || ganhos <= 0) return 0;
  return Math.round((ganhos / metaValor) * 1000) / 10;
}

/** Valida payload de ganho/despesa antes de enviar à API. */
export function validateFinancialEntry(input: {
  description: string;
  amount: string | number;
  occurredAt: string;
  type: "income" | "expense";
  incomeFrequency?: string | null;
}): { ok: true } | { ok: false; error: string } {
  const description = input.description.trim();
  if (!description) {
    return { ok: false, error: "Nome/descrição é obrigatório." };
  }

  const raw = String(input.amount).replace(",", ".").trim();
  const amount = Number(raw);
  if (!raw || !Number.isFinite(amount)) {
    return { ok: false, error: "Valor obrigatório e numérico." };
  }
  if (amount <= 0) {
    return { ok: false, error: "Valor deve ser maior que zero." };
  }

  const date = new Date(input.occurredAt);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Data inválida." };
  }

  if (input.type === "income" && input.incomeFrequency) {
    if (!(INCOME_FREQUENCIES as readonly string[]).includes(input.incomeFrequency)) {
      return { ok: false, error: "Frequência inválida." };
    }
  }

  return { ok: true };
}

/** Rótulos vazios padronizados para UI. */
export const EMPTY_FINANCIAL_COPY = {
  ganhos: "Você ainda não possui ganhos registrados neste período.",
  gastos: "Nenhuma despesa registrada neste período.",
  charts: "Sem dados neste período para montar o gráfico.",
} as const;
