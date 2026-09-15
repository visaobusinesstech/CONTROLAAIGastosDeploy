/**
 * Fonte única de verdade dos indicadores financeiros no frontend.
 *
 * Papel no sistema: Módulo backend Fastify — registrado ou importado por index.ts.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Frequências válidas para ganhos/faturamentos manuais. */
// Exporta constante/tipo/classe pública
export const INCOME_FREQUENCIES = [
  "monthly",
  "recurring",
  "non_recurring",
  "sporadic",
] as const;

// Exporta constante/tipo/classe pública
export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

// Exporta constante/tipo/classe pública
export const INCOME_FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  monthly: "Mensal",
  recurring: "Recorrente",
  non_recurring: "Não recorrente",
  sporadic: "Esporádico",
};

/** Lançamento mínimo necessário para agregar indicadores. */
// Exporta constante/tipo/classe pública
export type FinancialTx = {
  amount: number | string;
  type: "income" | "expense" | string;
};

/** Resultado canônico dos indicadores do período. */
// Exporta constante/tipo/classe pública
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
// Exporta função usada por outros arquivos
export function parseTxAmount(amount: number | string): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? n : 0;
}

/** Arredonda para 2 casas (centavos BRL). */
// Exporta função usada por outros arquivos
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcula indicadores a partir dos lançamentos reais do período.
 * Não usa budget esperado nem saldo inicial — só dados cadastrados.
 */
// Exporta função usada por outros arquivos
export function computeFinancialPeriodSummary(txs: FinancialTx[]): FinancialPeriodSummary {
  let ganhos = 0;
  let gastos = 0;
  let ganhosCount = 0;
  let gastosCount = 0;
  // Loop — repete para cada item
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
// Exporta função usada por outros arquivos
export function computeGoalProgressPercent(ganhos: number, metaValor: number): number {
  if (!Number.isFinite(metaValor) || metaValor <= 0) return 0;
  if (!Number.isFinite(ganhos) || ganhos <= 0) return 0;
  return Math.round((ganhos / metaValor) * 1000) / 10;
}

/** Valida payload de ganho/despesa antes de enviar à API. */
// Exporta função usada por outros arquivos
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
// Exporta constante/tipo/classe pública
export const EMPTY_FINANCIAL_COPY = {
  ganhos: "Você ainda não possui ganhos registrados neste período.",
  gastos: "Nenhuma despesa registrada neste período.",
  charts: "Sem dados neste período para montar o gráfico.",
} as const;

/** Recortes do comparativo de gastos no dashboard inicial. */
export const COMPARE_PERIODS = ["data", "semana", "mes", "trimestre", "semestre", "ano"] as const;
export type ComparePeriodKind = (typeof COMPARE_PERIODS)[number];

export const COMPARE_PERIOD_LABELS: Record<ComparePeriodKind, string> = {
  data: "Data",
  semana: "Semana",
  mes: "Mês",
  trimestre: "Trimestre",
  semestre: "Semestre",
  ano: "Ano",
};

export const COMPARE_PREVIOUS_CAPTION: Record<ComparePeriodKind, string> = {
  data: "período anterior",
  semana: "semana anterior",
  mes: "mês anterior",
  trimestre: "trimestre anterior",
  semestre: "semestre anterior",
  ano: "ano anterior",
};

function atStartOfDay(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return x;
}

function atEndOfDay(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return x;
}

/** Recua meses preservando o dia quando possível (31/jan → 28/fev). */
function shiftMonths(d: Date, delta: number): Date {
  const day = d.getDate();
  const shifted = new Date(d.getFullYear(), d.getMonth() + delta, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(day, lastDay));
  return shifted;
}

/**
 * Mapeia o filtro da UI (incluindo atalhos como "hoje" ou "90d") para o tipo de comparação.
 */
export function compareKindFromFilter(periodFilter: string): ComparePeriodKind {
  if (periodFilter === "semana") return "semana";
  if (periodFilter === "mes" || periodFilter === "mes_anterior") return "mes";
  if (periodFilter === "trimestre") return "trimestre";
  if (periodFilter === "semestre") return "semestre";
  if (periodFilter === "ano" || periodFilter === "1 ano") return "ano";
  return "data";
}

/**
 * Período equivalente imediatamente anterior (mesmo recorte de dias/mês/trimestre).
 * Ex.: 1–15/set vs 1–15/ago; 3º trimestre vs 2º trimestre.
 */
export function previousEquivalentRange(
  kind: ComparePeriodKind,
  from: Date,
  to: Date,
): { from: Date; to: Date } {
  const start = atStartOfDay(from);
  const end = atEndOfDay(to);

  if (kind === "semana") {
    const prevFrom = new Date(start);
    prevFrom.setDate(prevFrom.getDate() - 7);
    const prevTo = new Date(end);
    prevTo.setDate(prevTo.getDate() - 7);
    return { from: atStartOfDay(prevFrom), to: atEndOfDay(prevTo) };
  }

  if (kind === "mes") {
    const prevFrom = atStartOfDay(shiftMonths(start, -1));
    const lastOfCurrent = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const prevTo =
      end.getDate() >= lastOfCurrent
        ? new Date(prevFrom.getFullYear(), prevFrom.getMonth() + 1, 0)
        : shiftMonths(end, -1);
    return { from: prevFrom, to: atEndOfDay(prevTo) };
  }

  if (kind === "trimestre") {
    return { from: atStartOfDay(shiftMonths(start, -3)), to: atEndOfDay(shiftMonths(end, -3)) };
  }

  if (kind === "semestre") {
    return { from: atStartOfDay(shiftMonths(start, -6)), to: atEndOfDay(shiftMonths(end, -6)) };
  }

  if (kind === "ano") {
    const prevFrom = new Date(start);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    const prevTo = new Date(end);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return { from: atStartOfDay(prevFrom), to: atEndOfDay(prevTo) };
  }

  const durationMs = Math.max(0, end.getTime() - start.getTime());
  const prevTo = new Date(start.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: atStartOfDay(prevFrom), to: atEndOfDay(prevTo) };
}

export type ExpensePeriodComparison = {
  current: number;
  previous: number;
  delta: number;
  /** Variação percentual; null quando o período anterior não tem gastos para base. */
  percent: number | null;
  /** up = gastou mais; down = gastou menos. */
  trend: "up" | "down" | "neutral";
};

/** Compara gastos do recorte atual com o recorte anterior equivalente. */
export function computeExpenseComparison(currentGastos: number, previousGastos: number): ExpensePeriodComparison {
  const current = roundMoney(Number.isFinite(currentGastos) ? currentGastos : 0);
  const previous = roundMoney(Number.isFinite(previousGastos) ? previousGastos : 0);
  const delta = roundMoney(current - previous);
  const percent = previous > 0 ? Math.round((delta / previous) * 1000) / 10 : null;
  let trend: ExpensePeriodComparison["trend"] = "neutral";
  if (delta > 0) trend = "up";
  else if (delta < 0) trend = "down";
  return { current, previous, delta, percent, trend };
}
