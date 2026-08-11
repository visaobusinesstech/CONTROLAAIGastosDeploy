/**
 * Respostas humanizadas do assistente — pós-registro, análise e continuidade — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { formatBrl } from "../src/utils/money.js";
import { getFinancialSnapshot, generateInsights } from "./insights.js";
import { getPublicDashboardUrl } from "./app-links.js";
import { getEnrichedGoals } from "../src/goals-service.js";

/** Monta mensagem rica após registrar gasto ou receita. */
export async function buildRichPostTransactionResponse(
  userId: string,
  opts: {
    type: "expense" | "income";
    categoryName: string;
    amount: number;
    userName?: string | null;
  },
): Promise<string> {
  const snap = await getFinancialSnapshot(userId);
  const insights = await generateInsights(userId);
  const enrichedGoals = await getEnrichedGoals(userId);
  const name = opts.userName?.trim();
  const hello = name ? `${name}, ` : "";

  const lines: string[] = [];

  if (opts.type === "expense") {
    lines.push(`✅ *Registrado!* ${hello}gasto de ${formatBrl(opts.amount)} em *${opts.categoryName}*.`);
  } else {
    lines.push(`💰 *Registrado!* ${hello}entrada de ${formatBrl(opts.amount)} · *${opts.categoryName}*.`);
  }

  lines.push("");
  lines.push(`📊 *Seu mês agora*`);
  lines.push(`• Gastos: ${formatBrl(snap.expense)}`);
  if (snap.expectedIncome > 0) {
    lines.push(`• Renda prevista: ${formatBrl(snap.expectedIncome)}`);
    lines.push(`• *Disponível estimado: ${formatBrl(snap.projectedAvailable)}*`);
  } else {
    lines.push(`• Receitas lançadas: ${formatBrl(snap.income)}`);
    lines.push(`• Saldo do mês: ${formatBrl(snap.balance)}`);
  }

  const topGoal = enrichedGoals[0];
  if (topGoal) {
    const pct = Math.min(100, Math.round(topGoal.percentage));
    lines.push(`• Meta *${topGoal.name}*: ${pct}% do alvo`);
  }

  const tip = insights[0];
  if (tip) {
    lines.push("");
    lines.push(`💡 ${tip}`);
  }

  const dashboard = getPublicDashboardUrl();
  lines.push("");
  lines.push(`Acompanhe relatórios e gráficos no painel:\n${dashboard}`);

  lines.push("");
  if (topGoal && topGoal.percentage < 50) {
    lines.push(`Quer uma *análise completa* do mês ou registrar outra meta? Me diga o que prefere 😊`);
  } else if (snap.projectedAvailable < snap.expectedIncome * 0.2 && snap.expectedIncome > 0) {
    lines.push(`Seu disponível está apertando. Quer uma *análise* ou *dicas* para economizar este mês?`);
  } else {
    lines.push(`Gostaria de uma *análise* do mês ou registrar uma *nova meta*?`);
  }

  return lines.join("\n");
}

/** Resposta quando usuário pergunta se já tem renda cadastrada. */
export async function buildIncomeStatusResponse(userId: string, userName?: string | null): Promise<string> {
  const snap = await getFinancialSnapshot(userId);
  const hello = userName?.trim() ? `${userName.trim()}, ` : "";

  if (snap.expectedIncome <= 0) {
    return `${hello}ainda *não* tenho sua renda mensal cadastrada.\n\nMe informe, ex: _"Minha renda é 5 mil"_ ou _4500_.\n\nAssim calculo quanto você ainda pode gastar no mês.`;
  }

  const parts = [`${hello}sim! Tenho sua renda registrada:`];
  parts.push(`• *${formatBrl(snap.expectedIncome)}* por mês`);
  if (snap.incomePayDay) parts.push(`• Recebe dia *${snap.incomePayDay}*`);
  parts.push(`• Gastos do mês: ${formatBrl(snap.expense)}`);
  parts.push(`• *Disponível estimado: ${formatBrl(snap.projectedAvailable)}*`);
  parts.push("");
  parts.push(`Quer atualizar a renda ou ver uma *análise* completa?`);

  return parts.join("\n");
}
