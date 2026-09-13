/**
 * Respostas humanizadas do assistente — pós-registro, análise e continuidade — Controla.ai
 *
 * Papel no sistema: Lógica de domínio/IA compartilhada entre HTTP e WhatsApp.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { formatBrl } from "../src/utils/money.js"; // Formata números como R$ 1.234,56
import { getFinancialSnapshot, generateInsights } from "./insights.js"; // KPIs e dicas do mês
import { getPublicDashboardUrl } from "./app-links.js"; // URL do painel web
import { getEnrichedGoals } from "../src/goals-service.js"; // Metas com percentual de progresso

/** Monta mensagem rica após registrar gasto ou receita — inclui resumo do mês e dica. */
export async function buildRichPostTransactionResponse(
  userId: string,
  opts: {
    type: "expense" | "income"; // Tipo do lançamento recém-salvo
    categoryName: string; // Nome legível da categoria
    amount: number; // Valor em reais
    userName?: string | null; // Nome do usuário para personalizar saudação
  },
): Promise<string> {
  const snap = await getFinancialSnapshot(userId); // Gastos, renda prevista e disponível
  const insights = await generateInsights(userId); // Frases comparativas (ex.: gastou mais em X)
  const enrichedGoals = await getEnrichedGoals(userId); // Metas com % concluído
  const name = opts.userName?.trim(); // Nome limpo ou undefined
  const hello = name ? `${name}, ` : ""; // "João, " ou vazio
  const lines: string[] = []; // Acumula linhas da resposta WhatsApp
  if (opts.type === "expense") {
    lines.push(`✅ *Registrado!* ${hello}gasto de ${formatBrl(opts.amount)} em *${opts.categoryName}*.`); // Confirma despesa
  } else {
    lines.push(`💰 *Registrado!* ${hello}entrada de ${formatBrl(opts.amount)} · *${opts.categoryName}*.`); // Confirma receita
  }
  lines.push(""); // Linha em branco para separar blocos
  lines.push(`📊 *Seu mês agora*`); // Cabeçalho do mini-relatório
  lines.push(`• Gastos: ${formatBrl(snap.expense)}`); // Total de despesas no mês
  if (snap.expectedIncome > 0) {
    lines.push(`• Renda prevista: ${formatBrl(snap.expectedIncome)}`); // Renda cadastrada no perfil
    lines.push(`• *Disponível estimado: ${formatBrl(snap.projectedAvailable)}*`); // Quanto ainda pode gastar
  } else {
    lines.push(`• Receitas lançadas: ${formatBrl(snap.income)}`); // Soma de entradas registradas
    lines.push(`• Saldo do mês: ${formatBrl(snap.balance)}`); // Receitas − despesas
  }
  const topGoal = enrichedGoals[0]; // Meta principal (primeira da lista)
  if (topGoal) {
    const pct = Math.min(100, Math.round(topGoal.percentage)); // Percentual capped em 100%
    lines.push(`• Meta *${topGoal.name}*: ${pct}% do alvo`); // Progresso da meta
  }
  const tip = insights[0]; // Primeira dica gerada automaticamente
  if (tip) {
    lines.push(""); // Espaço antes da dica
    lines.push(`💡 ${tip}`); // Insight contextual
  }
  const dashboard = getPublicDashboardUrl(); // Link do painel web
  lines.push("");
  lines.push(`Acompanhe relatórios e gráficos no painel:\n${dashboard}`); // Convite ao dashboard
  lines.push(""); // Separa pergunta final
  if (topGoal && topGoal.percentage < 50) {
    lines.push(`Quer uma *análise completa* do mês ou registrar outra meta? Me diga o que prefere 😊`); // Meta longe do alvo
  } else if (snap.projectedAvailable < snap.expectedIncome * 0.2 && snap.expectedIncome > 0) {
    lines.push(`Seu disponível está apertando. Quer uma *análise* ou *dicas* para economizar este mês?`); // Pouco sobra (<20%)
  } else {
    lines.push(`Gostaria de uma *análise* do mês ou registrar uma *nova meta*?`); // Situação neutra/positiva
  }
  return lines.join("\n"); // Junta tudo em texto multilinha
}

/** Resposta quando usuário pergunta se já tem renda cadastrada no sistema. */
export async function buildIncomeStatusResponse(userId: string, userName?: string | null): Promise<string> {
  const snap = await getFinancialSnapshot(userId); // Snapshot com renda e gastos
  const hello = userName?.trim() ? `${userName.trim()}, ` : ""; // Personalização opcional
  if (snap.expectedIncome <= 0) {
    return `${hello}ainda *não* tenho sua renda mensal cadastrada.\n\nMe informe, ex: _"Minha renda é 5 mil"_ ou _4500_.\n\nAssim calculo quanto você ainda pode gastar no mês.`; // Orienta cadastro
  }
  const parts = [`${hello}sim! Tenho sua renda registrada:`]; // Confirma que há renda
  parts.push(`• *${formatBrl(snap.expectedIncome)}* por mês`); // Valor mensal
  if (snap.incomePayDay) parts.push(`• Recebe dia *${snap.incomePayDay}*`); // Dia do pagamento se informado
  parts.push(`• Gastos do mês: ${formatBrl(snap.expense)}`); // Despesas acumuladas
  parts.push(`• *Disponível estimado: ${formatBrl(snap.projectedAvailable)}*`); // Saldo projetado
  parts.push("");
  parts.push(`Quer atualizar a renda ou ver uma *análise* completa?`); // Próximos passos
  return parts.join("\n"); // Resposta formatada
}
