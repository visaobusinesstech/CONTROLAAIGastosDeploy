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
export const INCOME_FREQUENCIES = [ // Constante exportada — valor fixo compartilhado com o resto do sistema
  "monthly", // Instrução do programa — parte da lógica deste arquivo
  "recurring", // Instrução do programa — parte da lógica deste arquivo
  "non_recurring", // Instrução do programa — parte da lógica deste arquivo
  "sporadic", // Instrução do programa — parte da lógica deste arquivo
] as const; // Fecha lista de valores

export type IncomeFrequency = (typeof INCOME_FREQUENCIES)[number]; // Exporta um tipo de dados para outros arquivos usarem

/** Resultado canônico dos indicadores do período. */
export type FinancialPeriodSummary = { // Exporta um tipo de dados para outros arquivos usarem
  ganhos: number; // Instrução do programa — parte da lógica deste arquivo
  gastos: number; // Instrução do programa — parte da lógica deste arquivo
  faturamentoBruto: number; // Instrução do programa — parte da lógica deste arquivo
  faturamentoLiquido: number; // Instrução do programa — parte da lógica deste arquivo
  ganhosCount: number; // Instrução do programa — parte da lógica deste arquivo
  gastosCount: number; // Instrução do programa — parte da lógica deste arquivo
  isEmpty: boolean; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/** Arredonda para 2 casas (centavos BRL). */
export function roundMoney(value: number): number { // Função exportada — pode ser usada em outros arquivos
  return Math.round(value * 100) / 100; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/**
 * Agrega indicadores a partir de linhas already filtradas por usuário/período.
 * Aceita amount string (numeric PG) ou number.
 */
export function computeFinancialPeriodSummary( // Função exportada — pode ser usada em outros arquivos
  rows: Array<{ amount: string | number; type: string }>, // Instrução do programa — parte da lógica deste arquivo
): FinancialPeriodSummary { // Fecha parêntese aberto antes
  let ganhos = 0; // Variável que pode mudar de valor conforme o programa roda
  let gastos = 0; // Variável que pode mudar de valor conforme o programa roda
  let ganhosCount = 0; // Variável que pode mudar de valor conforme o programa roda
  let gastosCount = 0; // Variável que pode mudar de valor conforme o programa roda

  for (const r of rows) { // Repete o bloco para cada item da lista
    const value = typeof r.amount === "number" ? r.amount : num(String(r.amount)); // Guarda um valor que não muda durante a execução deste trecho
    if (r.type === "income") { // Só executa o bloco abaixo se esta condição for verdadeira
      ganhos += value; // Atribui ou calcula um valor para usar adiante
      ganhosCount += 1; // Atribui ou calcula um valor para usar adiante
    } else if (r.type === "expense") { // Fecha bloco iniciado anteriormente
      gastos += value; // Atribui ou calcula um valor para usar adiante
      gastosCount += 1; // Atribui ou calcula um valor para usar adiante
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  ganhos = roundMoney(ganhos); // Atribui ou calcula um valor para usar adiante
  gastos = roundMoney(gastos); // Atribui ou calcula um valor para usar adiante

  return { // Devolve um valor e encerra a função aqui
    ganhos, // Instrução do programa — parte da lógica deste arquivo
    gastos, // Instrução do programa — parte da lógica deste arquivo
    faturamentoBruto: ganhos, // Instrução do programa — parte da lógica deste arquivo
    faturamentoLiquido: roundMoney(ganhos - gastos), // Instrução do programa — parte da lógica deste arquivo
    ganhosCount, // Instrução do programa — parte da lógica deste arquivo
    gastosCount, // Instrução do programa — parte da lógica deste arquivo
    isEmpty: ganhosCount === 0 && gastosCount === 0, // Instrução do programa — parte da lógica deste arquivo
  }; // Fecha bloco de objeto ou estrutura
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Progresso de meta de faturamento/poupança com base em ganhos reais. */
export function computeGoalProgressPercent(ganhos: number, metaValor: number): number { // Função exportada — pode ser usada em outros arquivos
  if (!Number.isFinite(metaValor) || metaValor <= 0) return 0; // Só executa o bloco abaixo se esta condição for verdadeira
  if (!Number.isFinite(ganhos) || ganhos <= 0) return 0; // Só executa o bloco abaixo se esta condição for verdadeira
  return Math.round((ganhos / metaValor) * 1000) / 10; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Verifica se a frequência de ganho é válida. */
export function isValidIncomeFrequency(value: string | null | undefined): value is IncomeFrequency { // Função exportada — pode ser usada em outros arquivos
  if (!value) return false; // Só executa o bloco abaixo se esta condição for verdadeira
  return (INCOME_FREQUENCIES as readonly string[]).includes(value); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
