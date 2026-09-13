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
// Exporta constante/tipo/classe pública
export const INCOME_FREQUENCIES = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "monthly",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "recurring",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "non_recurring",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "sporadic",
// Instrução do fluxo — parte da lógica de negócio ou interface
] as const;

// Exporta constante/tipo/classe pública
export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

// Exporta constante/tipo/classe pública
export const INCOME_FREQUENCY_LABELS: Record<IncomeFrequency, string> = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  monthly: "Mensal",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  recurring: "Recorrente",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  non_recurring: "Não recorrente",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  sporadic: "Esporádico",
};

/** Lançamento mínimo necessário para agregar indicadores. */
// Exporta constante/tipo/classe pública
export type FinancialTx = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  amount: number | string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: "income" | "expense" | string;
};

/** Resultado canônico dos indicadores do período. */
// Exporta constante/tipo/classe pública
export type FinancialPeriodSummary = {
  /** Soma dos ganhos reais registrados (= faturamento bruto). */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ganhos: number;
  /** Soma das despesas reais registradas. */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  gastos: number;
  /** Alias explícito: igual a ganhos. */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  faturamentoBruto: number;
  /** Faturamento bruto − gastos. */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  faturamentoLiquido: number;
  /** Quantidade de ganhos no período. */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ganhosCount: number;
  /** Quantidade de despesas no período. */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  gastosCount: number;
  /** true se não há nenhum lançamento income/expense. */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isEmpty: boolean;
};

/** Converte amount string/number em number seguro. */
// Exporta função usada por outros arquivos
export function parseTxAmount(amount: number | string): number {
  // Constante local
  const n = typeof amount === "number" ? amount : Number(amount);
  // Retorna valor ou JSX para quem chamou
  return Number.isFinite(n) ? n : 0;
}

/** Arredonda para 2 casas (centavos BRL). */
// Exporta função usada por outros arquivos
export function roundMoney(value: number): number {
  // Retorna valor ou JSX para quem chamou
  return Math.round(value * 100) / 100;
}

/**
 * Calcula indicadores a partir dos lançamentos reais do período.
 * Não usa budget esperado nem saldo inicial — só dados cadastrados.
 */
// Exporta função usada por outros arquivos
export function computeFinancialPeriodSummary(txs: FinancialTx[]): FinancialPeriodSummary {
  // Variável mutável local
  let ganhos = 0;
  // Variável mutável local
  let gastos = 0;
  // Variável mutável local
  let ganhosCount = 0;
  // Variável mutável local
  let gastosCount = 0;

  // Loop — repete para cada item
  for (const t of txs) {
    // Constante local
    const value = parseTxAmount(t.amount);
    // Condição — executa bloco só se verdadeira
    if (t.type === "income") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ganhos += value;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ganhosCount += 1;
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } else if (t.type === "expense") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      gastos += value;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      gastosCount += 1;
    }
  }

  // Instrução do fluxo — parte da lógica de negócio ou interface
  ganhos = roundMoney(ganhos);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  gastos = roundMoney(gastos);
  // Constante local
  const faturamentoLiquido = roundMoney(ganhos - gastos);

  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ganhos,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    gastos,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    faturamentoBruto: ganhos,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    faturamentoLiquido,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ganhosCount,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    gastosCount,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isEmpty: ganhosCount === 0 && gastosCount === 0,
  };
}

/** Progresso de meta financeira baseada em ganhos reais (0–100+). */
// Exporta função usada por outros arquivos
export function computeGoalProgressPercent(ganhos: number, metaValor: number): number {
  // Condição — executa bloco só se verdadeira
  if (!Number.isFinite(metaValor) || metaValor <= 0) return 0;
  // Condição — executa bloco só se verdadeira
  if (!Number.isFinite(ganhos) || ganhos <= 0) return 0;
  // Retorna valor ou JSX para quem chamou
  return Math.round((ganhos / metaValor) * 1000) / 10;
}

/** Valida payload de ganho/despesa antes de enviar à API. */
// Exporta função usada por outros arquivos
export function validateFinancialEntry(input: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  description: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  amount: string | number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  occurredAt: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: "income" | "expense";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  incomeFrequency?: string | null;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}): { ok: true } | { ok: false; error: string } {
  // Constante local
  const description = input.description.trim();
  // Condição — executa bloco só se verdadeira
  if (!description) {
    // Retorna valor ou JSX para quem chamou
    return { ok: false, error: "Nome/descrição é obrigatório." };
  }

  // Constante local
  const raw = String(input.amount).replace(",", ".").trim();
  // Constante local
  const amount = Number(raw);
  // Condição — executa bloco só se verdadeira
  if (!raw || !Number.isFinite(amount)) {
    // Retorna valor ou JSX para quem chamou
    return { ok: false, error: "Valor obrigatório e numérico." };
  }
  // Condição — executa bloco só se verdadeira
  if (amount <= 0) {
    // Retorna valor ou JSX para quem chamou
    return { ok: false, error: "Valor deve ser maior que zero." };
  }

  // Constante local
  const date = new Date(input.occurredAt);
  // Condição — executa bloco só se verdadeira
  if (Number.isNaN(date.getTime())) {
    // Retorna valor ou JSX para quem chamou
    return { ok: false, error: "Data inválida." };
  }

  // Condição — executa bloco só se verdadeira
  if (input.type === "income" && input.incomeFrequency) {
    // Condição — executa bloco só se verdadeira
    if (!(INCOME_FREQUENCIES as readonly string[]).includes(input.incomeFrequency)) {
      // Retorna valor ou JSX para quem chamou
      return { ok: false, error: "Frequência inválida." };
    }
  }

  // Retorna valor ou JSX para quem chamou
  return { ok: true };
}

/** Rótulos vazios padronizados para UI. */
// Exporta constante/tipo/classe pública
export const EMPTY_FINANCIAL_COPY = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ganhos: "Você ainda não possui ganhos registrados neste período.",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  gastos: "Nenhuma despesa registrada neste período.",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  charts: "Sem dados neste período para montar o gráfico.",
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} as const;
