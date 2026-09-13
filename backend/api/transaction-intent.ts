/**
 * Detecção de transações e normalização de valores — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Prioridade absoluta: gasto/ganho explícito NUNCA vira meta.
 */
import { parseMoneyAmount } from "../src/utils/money.js"; // Converte "5 mil", "R$ 50" em número

export { parseMoneyAmount }; // Reexporta para outros módulos da API

/** Mensagem é pergunta/consulta — não registrar como transação. */
export function isQueryMessage(text: string): boolean {
  const t = text.trim(); // Remove espaços
  if (!t) return false; // Vazio não é consulta
  const lower = t.toLowerCase(); // Minúsculas para regex
  if (/^(quanto|quais|qual|onde|como|when|which|what)\b/i.test(lower)) return true; // Perguntas interrogativas
  if (/\?\s*$/.test(t) && /gast|receit|saldo|meta|renda|an[aá]lise|relat[oó]rio|dias?|categor|economiz|posso gastar/i.test(lower)) {
    return true; // Frase com ? e tema financeiro
  }
  if (/quais dias|qual dia|mais gastei|j[aá] tem.*renda|tenho.*renda|minha renda no sistema|situa[cç][aã]o financeira|quanto gastei|quanto recebi|resumo|proje[cç]/i.test(lower)) {
    return true; // Consultas financeiras comuns em PT-BR
  }
  return false; // Não parece pergunta
}

/**
 * Intenção explícita de REGISTRAR despesa (não meta).
 * Cobre: "quero registrar um gasto", "lançar despesa", "gastei 30", etc.
 */
export function isExplicitExpenseRegistration(text: string): boolean {
  const t = text.trim().toLowerCase(); // Texto normalizado
  if (!t || isQueryMessage(t)) return false; // Vazio ou pergunta — não é registro

  // Pedido direto de cadastro de gasto/despesa
  if (
    /\b(quero|preciso|vou|pode|pod[eê]|me\s+ajuda\s+a)?\s*(registrar|cadastrar|lan[cç]ar|anotar|adicionar|incluir|salvar|criar)\s+(um[a]?\s+)?(gasto|despesa|compra|pagamento)/i.test(
      t,
    )
  ) {
    return true; // "Quero registrar um gasto"
  }
  // "registrar um gasto de 30", "gasto de 30 reais em comida"
  if (/\b(gasto|despesa)\s+(de\s+)?(r\$\s*)?\d/i.test(t)) return true; // Gasto + valor numérico
  if (/\b(gasto|despesa)\s+(com|em|no|na|de)\b/i.test(t) && parseMoneyAmount(t) != null) {
    return true; // Gasto + preposição + valor parseável
  }
  // Verbos clássicos de saída de dinheiro
  if (/\b(gastei|paguei|comprei|debitou|sa[ií]u)\b/i.test(t)) return true; // Verbo de despesa
  return false;
}

/**
 * Intenção explícita de REGISTRAR ganho/receita (não meta de poupança).
 */
export function isExplicitIncomeRegistration(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || isQueryMessage(t)) return false;
  if (
    /\b(quero|preciso|vou)?\s*(registrar|cadastrar|lan[cç]ar|anotar|adicionar)\s+(um[a]?\s+)?(ganho|receita|entrada|faturamento)/i.test(
      t,
    )
  ) {
    return true; // Pedido explícito de lançar receita
  }
  if (/\b(recebi|ganhei|faturei|vendi|depositei)\b/i.test(t)) return true; // Verbos de entrada
  return false;
}

/** Mensagem clara de lançamento financeiro (gasto OU ganho) — prioridade sobre meta. */
export function isExplicitTransactionRegistration(text: string): boolean {
  return isExplicitExpenseRegistration(text) || isExplicitIncomeRegistration(text); // União dos dois tipos
}

/** Heurística ampla: mensagem parece falar de movimentação financeira. */
export function isTransactionMessage(text: string): boolean {
  if (isQueryMessage(text)) return false; // Perguntas não são transações
  if (isExplicitTransactionRegistration(text)) return true; // Registro explícito
  return /gastei|paguei|comprei|despesa|gasto|sa[ií]|debitou|cart[aã]o|pix\s+(?:de|no|pro)|recebi|ganhei|entrada|entrou|sal[aá]rio|vendi|faturei|depositei|caiu|transfer[ií]|rendimento|freela|cliente\s+pagou/i.test(
    text.trim(),
  ); // Regex amplo de verbos financeiros
}

/** Verbo de receita na mensagem — dinheiro entrando. */
export function isIncomeMessage(text: string): boolean {
  if (isExplicitIncomeRegistration(text)) return true; // Registro explícito de receita
  return /recebi|ganhei|entrada|entrou|sal[aá]rio|vendi|faturei|depositei|caiu|rendimento|freela|cliente\s+pagou|pagamento\s+de/i.test(
    text.trim(),
  ); // Verbos típicos de entrada
}

/** Verbo de despesa na mensagem — dinheiro saindo. */
export function isExpenseMessage(text: string): boolean {
  if (isExplicitExpenseRegistration(text)) return true; // Registro explícito de gasto
  return /gastei|paguei|comprei|despesa|gasto|sa[ií]|debitou|cart[aã]o|pix\s+(?:de|no|pro)/i.test(
    text.trim(),
  ); // Verbos típicos de saída
}

/**
 * True quando o texto é claramente um lançamento, NÃO uma meta.
 * Usado para bloquear auto-captura de metas em frases como:
 * "Quero registrar um gasto de 30 reais em comida"
 */
export function isExpenseNotGoal(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  // Se menciona meta explicitamente junto, deixa o fluxo de meta decidir
  if (/\b(meta|metas|objetivo|objetivos)\b/i.test(t) && !isExplicitExpenseRegistration(t)) {
    return false; // "Meta de gastar menos" — ambíguo
  }
  if (isExplicitExpenseRegistration(t)) return true; // Gasto explícito vence
  if (isExpenseMessage(t) && !/\b(junt|poupar|economiz|guardar|limite\s+de|teto\s+de)\b/i.test(t)) {
    return true; // Despesa sem palavras de meta/poupança
  }
  return false;
}

/** Apenas valor numérico, sem verbo de transação — pode ser renda no onboarding. */
export function isBareAmountMessage(text: string): boolean {
  const t = text.trim();
  if (!t || isTransactionMessage(t)) return false; // Com verbo financeiro não é "nu"
  return /^[\d\s.,r$kKmMil]+$/i.test(t) && parseMoneyAmount(t) != null; // Só dígitos/símbolos monetários
}
