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
export type EnrichedGoal = { // Exporta um tipo de dados para outros arquivos usarem
  id: string; // Instrução do programa — parte da lógica deste arquivo
  name: string; // Instrução do programa — parte da lógica deste arquivo
  color: string; // Instrução do programa — parte da lógica deste arquivo
  limitAmount: number; // Instrução do programa — parte da lógica deste arquivo
  periodType: string; // Instrução do programa — parte da lógica deste arquivo
  goalType: string; // Instrução do programa — parte da lógica deste arquivo
  targetAmount: number | null; // Instrução do programa — parte da lógica deste arquivo
  durationMonths: number | null; // Instrução do programa — parte da lógica deste arquivo
  deadlineAt: string | null; // Instrução do programa — parte da lógica deste arquivo
  isActive: boolean; // Instrução do programa — parte da lógica deste arquivo
  categoryName: string | null; // Instrução do programa — parte da lógica deste arquivo
  categoryId: string | null; // Instrução do programa — parte da lógica deste arquivo
  categoryIcon: string | null; // Instrução do programa — parte da lógica deste arquivo
  currentAmount: number; // Valor acumulado no período
  percentage: number; // % do alvo atingido
  riskLevel: "low" | "medium" | "high"; // Semáforo para UI
  exceeded: boolean; // true se gasto passou do limite
}; // Fecha bloco de objeto ou estrutura

type PeriodBoundsInput = { // Define formato de dados usado só pelo TypeScript
  periodType: string; // Instrução do programa — parte da lógica deste arquivo
  goalType: string; // Instrução do programa — parte da lógica deste arquivo
  durationMonths: number | null; // Instrução do programa — parte da lógica deste arquivo
  createdAt: Date; // Instrução do programa — parte da lógica deste arquivo
  deadlineAt: Date | null; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/** Calcula intervalo [from, to] — poupança usa prazo total; limite usa ciclo mensal/trimestral/anual. */
function periodBounds(input: PeriodBoundsInput): { from: Date; to: Date } { // Bloco de código reutilizável com um nome
  const now = new Date(); // Guarda um valor que não muda durante a execução deste trecho

  if (input.goalType === "saving" && input.durationMonths != null && input.durationMonths > 0) { // Só executa o bloco abaixo se esta condição for verdadeira
    const from = new Date(input.createdAt); // Guarda um valor que não muda durante a execução deste trecho
    from.setUTCHours(0, 0, 0, 0); // Instrução do programa — parte da lógica deste arquivo
    const to = input.deadlineAt ? new Date(input.deadlineAt) : new Date(from); // Guarda um valor que não muda durante a execução deste trecho
    if (!input.deadlineAt) { // Só executa o bloco abaixo se esta condição for verdadeira
      to.setUTCMonth(to.getUTCMonth() + input.durationMonths); // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)
    return { from, to: now < to ? now : to }; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const month = monthKey(now); // Guarda um valor que não muda durante a execução deste trecho
  const from = new Date(`${month}-01T00:00:00.000Z`); // Guarda um valor que não muda durante a execução deste trecho
  const to = new Date(from); // Guarda um valor que não muda durante a execução deste trecho

  if (input.periodType === "yearly") { // Só executa o bloco abaixo se esta condição for verdadeira
    to.setUTCFullYear(to.getUTCFullYear() + 1); // Instrução do programa — parte da lógica deste arquivo
  } else if (input.periodType === "quarterly") { // Fecha bloco iniciado anteriormente
    to.setUTCMonth(to.getUTCMonth() + 3); // Instrução do programa — parte da lógica deste arquivo
  } else { // Fecha bloco iniciado anteriormente
    to.setUTCMonth(to.getUTCMonth() + 1); // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)

  return { from, to: now < to ? now : to }; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Calcula deadline a partir do prazo em meses. */
export function computeGoalDeadline(from: Date, durationMonths: number): Date { // Função exportada — pode ser usada em outros arquivos
  const deadline = new Date(from); // Guarda um valor que não muda durante a execução deste trecho
  deadline.setUTCMonth(deadline.getUTCMonth() + durationMonths); // Instrução do programa — parte da lógica deste arquivo
  return deadline; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Define nível de risco conforme % e tipo de meta (limite vs poupança). */
function riskFromPercentage(pct: number, goalType: string): "low" | "medium" | "high" { // Bloco de código reutilizável com um nome
  if (goalType === "saving") { // Só executa o bloco abaixo se esta condição for verdadeira
    if (pct >= 80) return "low"; // Poupança perto do alvo = bom
    if (pct >= 50) return "medium"; // Só executa o bloco abaixo se esta condição for verdadeira
    return "high"; // Poupança baixa = alerta
  } // Fecha um bloco de código (if, função, objeto, etc.)
  if (pct >= 100) return "high"; // Limite estourado
  if (pct >= 80) return "medium"; // Próximo do teto
  return "low"; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Lista metas do usuário com progresso real agregado das transações. */
export async function getEnrichedGoals(userId: string): Promise<EnrichedGoal[]> { // Função assíncrona exportada — outros módulos podem chamar
  const rows = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ // Instrução do programa — parte da lógica deste arquivo
      id: goals.id, // Instrução do programa — parte da lógica deste arquivo
      name: goals.name, // Instrução do programa — parte da lógica deste arquivo
      color: goals.color, // Instrução do programa — parte da lógica deste arquivo
      limitAmount: goals.limitAmount, // Instrução do programa — parte da lógica deste arquivo
      periodType: goals.periodType, // Instrução do programa — parte da lógica deste arquivo
      goalType: goals.goalType, // Instrução do programa — parte da lógica deste arquivo
      targetAmount: goals.targetAmount, // Instrução do programa — parte da lógica deste arquivo
      durationMonths: goals.durationMonths, // Instrução do programa — parte da lógica deste arquivo
      deadlineAt: goals.deadlineAt, // Instrução do programa — parte da lógica deste arquivo
      createdAt: goals.createdAt, // Instrução do programa — parte da lógica deste arquivo
      isActive: goals.isActive, // Instrução do programa — parte da lógica deste arquivo
      categoryName: categories.name, // Instrução do programa — parte da lógica deste arquivo
      categoryId: goals.categoryId, // Instrução do programa — parte da lógica deste arquivo
      categoryIcon: categories.icon, // Instrução do programa — parte da lógica deste arquivo
    }) // Fecha bloco iniciado anteriormente
    .from(goals) // Instrução do programa — parte da lógica deste arquivo
    .leftJoin(categories, eq(goals.categoryId, categories.id)) // Nome/ícone da categoria
    .where(eq(goals.userId, userId)) // Filtra quais linhas do banco entram na consulta
    .orderBy(sql`${goals.createdAt} desc`); // Mais recentes primeiro

  const enriched: EnrichedGoal[] = []; // Guarda um valor que não muda durante a execução deste trecho

  for (const g of rows) { // Repete o bloco para cada item da lista
    const { from, to } = periodBounds({ // Guarda um valor que não muda durante a execução deste trecho
      periodType: g.periodType, // Instrução do programa — parte da lógica deste arquivo
      goalType: g.goalType, // Instrução do programa — parte da lógica deste arquivo
      durationMonths: g.durationMonths, // Instrução do programa — parte da lógica deste arquivo
      createdAt: g.createdAt, // Instrução do programa — parte da lógica deste arquivo
      deadlineAt: g.deadlineAt, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
    const target = g.targetAmount != null ? num(g.targetAmount) : num(g.limitAmount); // Alvo numérico

    let currentAmount = 0; // Variável que pode mudar de valor conforme o programa roda

    if (g.goalType === "limit" && g.categoryId) { // Só executa o bloco abaixo se esta condição for verdadeira
      // Soma despesas da categoria no período
      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` }) // Instrução do programa — parte da lógica deste arquivo
        .from(transactions) // Instrução do programa — parte da lógica deste arquivo
        .where( // Filtra quais linhas do banco entram na consulta
          and( // Condição SQL: todas as partes precisam ser verdadeiras
            eq(transactions.userId, userId), // Condição SQL: coluna deve ser igual ao valor
            eq(transactions.categoryId, g.categoryId), // Condição SQL: coluna deve ser igual ao valor
            eq(transactions.type, "expense"), // Condição SQL: coluna deve ser igual ao valor
            eq(transactions.isActive, true), // Condição SQL: coluna deve ser igual ao valor
            gte(transactions.occurredAt, from), // Condição SQL: maior ou igual (a partir de uma data, por ex.)
            lte(transactions.occurredAt, to), // Condição SQL: menor ou igual (até uma data, por ex.)
          ), // Fecha parêntese e continua parâmetros ou argumentos
        ); // Fecha parêntese e encerra instrução
      currentAmount = num(row?.total ?? "0"); // Atribui ou calcula um valor para usar adiante
    } else if (g.goalType === "saving") { // Fecha bloco iniciado anteriormente
      // Soma receitas no período (meta de poupança)
      const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` }) // Instrução do programa — parte da lógica deste arquivo
        .from(transactions) // Instrução do programa — parte da lógica deste arquivo
        .where( // Filtra quais linhas do banco entram na consulta
          and( // Condição SQL: todas as partes precisam ser verdadeiras
            eq(transactions.userId, userId), // Condição SQL: coluna deve ser igual ao valor
            eq(transactions.type, "income"), // Condição SQL: coluna deve ser igual ao valor
            eq(transactions.isActive, true), // Condição SQL: coluna deve ser igual ao valor
            gte(transactions.occurredAt, from), // Condição SQL: maior ou igual (a partir de uma data, por ex.)
            lte(transactions.occurredAt, to), // Condição SQL: menor ou igual (até uma data, por ex.)
          ), // Fecha parêntese e continua parâmetros ou argumentos
        ); // Fecha parêntese e encerra instrução
      currentAmount = num(row?.total ?? "0"); // Atribui ou calcula um valor para usar adiante
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const percentage = target > 0 ? Math.round((currentAmount / target) * 1000) / 10 : 0; // 1 casa decimal
    const exceeded = g.goalType === "limit" ? currentAmount > target : false; // Guarda um valor que não muda durante a execução deste trecho

    enriched.push({ // Instrução do programa — parte da lógica deste arquivo
      id: g.id, // Instrução do programa — parte da lógica deste arquivo
      name: g.name, // Instrução do programa — parte da lógica deste arquivo
      color: g.color, // Instrução do programa — parte da lógica deste arquivo
      limitAmount: num(g.limitAmount), // Instrução do programa — parte da lógica deste arquivo
      periodType: g.periodType, // Instrução do programa — parte da lógica deste arquivo
      goalType: g.goalType, // Instrução do programa — parte da lógica deste arquivo
      targetAmount: g.targetAmount != null ? num(g.targetAmount) : null, // Atribui ou calcula um valor para usar adiante
      durationMonths: g.durationMonths ?? null, // Instrução do programa — parte da lógica deste arquivo
      deadlineAt: g.deadlineAt ? g.deadlineAt.toISOString() : null, // Instrução do programa — parte da lógica deste arquivo
      isActive: g.isActive, // Instrução do programa — parte da lógica deste arquivo
      categoryName: g.categoryName, // Instrução do programa — parte da lógica deste arquivo
      categoryId: g.categoryId, // Instrução do programa — parte da lógica deste arquivo
      categoryIcon: g.categoryIcon, // Instrução do programa — parte da lógica deste arquivo
      currentAmount: Math.round(currentAmount * 100) / 100, // Instrução do programa — parte da lógica deste arquivo
      percentage, // Instrução do programa — parte da lógica deste arquivo
      riskLevel: riskFromPercentage(percentage, g.goalType), // Instrução do programa — parte da lógica deste arquivo
      exceeded, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método
  } // Fecha um bloco de código (if, função, objeto, etc.)

  return enriched; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Payload para criar meta via API ou agente IA. */
export type CreateGoalInput = { // Exporta um tipo de dados para outros arquivos usarem
  name: string; // Instrução do programa — parte da lógica deste arquivo
  limitAmount: number; // Instrução do programa — parte da lógica deste arquivo
  goalType?: "limit" | "saving"; // Instrução do programa — parte da lógica deste arquivo
  periodType?: "monthly" | "quarterly" | "yearly"; // Instrução do programa — parte da lógica deste arquivo
  targetAmount?: number | null; // Instrução do programa — parte da lógica deste arquivo
  durationMonths?: number | null; // Instrução do programa — parte da lógica deste arquivo
  categoryId?: string | null; // Instrução do programa — parte da lógica deste arquivo
  color?: string; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/** Paleta padrão quando cor não informada. */
const GOAL_COLORS = ["#6366f1", "#4CAF50", "#42A5F5", "#FFB300", "#AB47BC", "#26C6DA"]; // Guarda um valor que não muda durante a execução deste trecho

/** Conta metas ativas do usuário. */
export async function countUserGoals(userId: string): Promise<number> { // Função assíncrona exportada — outros módulos podem chamar
  const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ count: sql<number>`count(*)::int` }) // Instrução do programa — parte da lógica deste arquivo
    .from(goals) // Instrução do programa — parte da lógica deste arquivo
    .where(eq(goals.userId, userId)); // Filtra quais linhas do banco entram na consulta
  return row?.count ?? 0; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Insere nova meta financeira para o usuário. */
export async function createGoalForUser(userId: string, input: CreateGoalInput) { // Função assíncrona exportada — outros módulos podem chamar
  const goalType = input.goalType ?? "limit"; // Padrão: teto de gasto
  const targetAmount = // Guarda um valor que não muda durante a execução deste trecho
    input.targetAmount ?? (goalType === "saving" ? input.limitAmount : null); // Poupança usa limit como alvo

  const now = new Date(); // Guarda um valor que não muda durante a execução deste trecho
  const durationMonths = // Guarda um valor que não muda durante a execução deste trecho
    input.durationMonths != null && input.durationMonths > 0 ? input.durationMonths : null; // Atribui ou calcula um valor para usar adiante
  const deadlineAt = // Guarda um valor que não muda durante a execução deste trecho
    durationMonths != null ? computeGoalDeadline(now, durationMonths) : null; // Atribui ou calcula um valor para usar adiante

  const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
    .insert(goals) // Instrução do programa — parte da lógica deste arquivo
    .values({ // Informa os valores a inserir na tabela
      userId, // Instrução do programa — parte da lógica deste arquivo
      name: input.name, // Instrução do programa — parte da lógica deste arquivo
      categoryId: input.categoryId ?? null, // Instrução do programa — parte da lógica deste arquivo
      limitAmount: String(input.limitAmount), // Instrução do programa — parte da lógica deste arquivo
      periodType: input.periodType ?? "monthly", // Instrução do programa — parte da lógica deste arquivo
      goalType, // Instrução do programa — parte da lógica deste arquivo
      targetAmount: targetAmount != null ? String(targetAmount) : null, // Atribui ou calcula um valor para usar adiante
      durationMonths, // Instrução do programa — parte da lógica deste arquivo
      deadlineAt, // Instrução do programa — parte da lógica deste arquivo
      color: input.color ?? GOAL_COLORS[Math.floor(Math.random() * GOAL_COLORS.length)], // Instrução do programa — parte da lógica deste arquivo
    }) // Fecha bloco iniciado anteriormente
    .returning(); // Pede ao banco devolver os dados gravados

  return row; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
