/**
 * Fonte única de verdade dos indicadores financeiros no backend.
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

import { num } from "./money.js"; // Parse numeric Postgres

/** Frequências válidas para ganhos/faturamentos. */
export const INCOME_FREQUENCIES = [ // Constante exportada — valor fixo compartilhado com o resto do sistema
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
export function roundMoney(value: number): number { // Função exportada — pode ser usada em outros arquivos
  return Math.round(value * 100) / 100;
}

/**
 * Agrega indicadores a partir de linhas already filtradas por usuário/período.
 * Aceita amount string (numeric PG) ou number.
 */
export function computeFinancialPeriodSummary( // Função exportada — pode ser usada em outros arquivos
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
export function computeGoalProgressPercent(ganhos: number, metaValor: number): number { // Função exportada — pode ser usada em outros arquivos
  if (!Number.isFinite(metaValor) || metaValor <= 0) return 0;
  if (!Number.isFinite(ganhos) || ganhos <= 0) return 0;
  return Math.round((ganhos / metaValor) * 1000) / 10;
}

/** Verifica se a frequência de ganho é válida. */
export function isValidIncomeFrequency(value: string | null | undefined): value is IncomeFrequency { // Função exportada — pode ser usada em outros arquivos
  if (!value) return false;
  return (INCOME_FREQUENCIES as readonly string[]).includes(value);
}
