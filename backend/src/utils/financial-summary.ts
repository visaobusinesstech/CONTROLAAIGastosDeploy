/**
 * Fonte única de verdade dos indicadores financeiros no backend.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Regras (espelho do frontend/src/lib/financial-summary.ts):
 * - Ganhos / Faturamento bruto = soma income
 * - Gastos = soma expense
 * - Faturamento líquido = bruto − gastos
 * - Não misturar renda esperada (budgets) nem saldo inicial nestes indicadores
 */

import { num } from "./money.js"; // Parse numeric Postgres

/** Frequências válidas para ganhos/faturamentos. */
export const INCOME_FREQUENCIES = [
  "monthly",
  "recurring",
  "non_recurring",
  "sporadic",
] as const;

export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number];

/** Resultado canônico dos indicadores do período. */
export type FinancialPeriodSummary = {
  ganhos: number;
  gastos: number;
  faturamentoBruto: number;
  faturamentoLiquido: number;
  ganhosCount: number;
  gastosCount: number;
  isEmpty: boolean;
};

/** Arredonda para 2 casas (centavos BRL). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Agrega indicadores a partir de linhas already filtradas por usuário/período.
 * Aceita amount string (numeric PG) ou number.
 */
export function computeFinancialPeriodSummary(
  rows: Array<{ amount: string | number; type: string }>,
): FinancialPeriodSummary {
  let ganhos = 0;
  let gastos = 0;
  let ganhosCount = 0;
  let gastosCount = 0;

  for (const r of rows) {
    const value = typeof r.amount === "number" ? r.amount : num(String(r.amount));
    if (r.type === "income") {
      ganhos += value;
      ganhosCount += 1;
    } else if (r.type === "expense") {
      gastos += value;
      gastosCount += 1;
    }
  }

  ganhos = roundMoney(ganhos);
  gastos = roundMoney(gastos);

  return {
    ganhos,
    gastos,
    faturamentoBruto: ganhos,
    faturamentoLiquido: roundMoney(ganhos - gastos),
    ganhosCount,
    gastosCount,
    isEmpty: ganhosCount === 0 && gastosCount === 0,
  };
}

/** Progresso de meta de faturamento/poupança com base em ganhos reais. */
export function computeGoalProgressPercent(ganhos: number, metaValor: number): number {
  if (!Number.isFinite(metaValor) || metaValor <= 0) return 0;
  if (!Number.isFinite(ganhos) || ganhos <= 0) return 0;
  return Math.round((ganhos / metaValor) * 1000) / 10;
}

/** Verifica se a frequência de ganho é válida. */
export function isValidIncomeFrequency(value: string | null | undefined): value is IncomeFrequency {
  if (!value) return false;
  return (INCOME_FREQUENCIES as readonly string[]).includes(value);
}
