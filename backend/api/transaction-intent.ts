/**
 * Detecção de transações e normalização de valores — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Prioridade absoluta: gasto/ganho explícito NUNCA vira meta.
 */
import { parseMoneyAmount } from "../src/utils/money.js";

export { parseMoneyAmount };

/** Mensagem é pergunta/consulta — não registrar como transação. */
export function isQueryMessage(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (/^(quanto|quais|qual|onde|como|when|which|what)\b/i.test(lower)) return true;
  if (/\?\s*$/.test(t) && /gast|receit|saldo|meta|renda|an[aá]lise|relat[oó]rio|dias?|categor|economiz|posso gastar/i.test(lower)) {
    return true;
  }
  if (/quais dias|qual dia|mais gastei|j[aá] tem.*renda|tenho.*renda|minha renda no sistema|situa[cç][aã]o financeira|quanto gastei|quanto recebi|resumo|proje[cç]/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Intenção explícita de REGISTRAR despesa (não meta).
 * Cobre: "quero registrar um gasto", "lançar despesa", "gastei 30", etc.
 */
export function isExplicitExpenseRegistration(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || isQueryMessage(t)) return false;

  // Pedido direto de cadastro de gasto/despesa
  if (
    /\b(quero|preciso|vou|pode|pod[eê]|me\s+ajuda\s+a)?\s*(registrar|cadastrar|lan[cç]ar|anotar|adicionar|incluir|salvar|criar)\s+(um[a]?\s+)?(gasto|despesa|compra|pagamento)/i.test(
      t,
    )
  ) {
    return true;
  }
  // "registrar um gasto de 30", "gasto de 30 reais em comida"
  if (/\b(gasto|despesa)\s+(de\s+)?(r\$\s*)?\d/i.test(t)) return true;
  if (/\b(gasto|despesa)\s+(com|em|no|na|de)\b/i.test(t) && parseMoneyAmount(t) != null) {
    return true;
  }
  // Verbos clássicos de saída
  if (/\b(gastei|paguei|comprei|debitou|sa[ií]u)\b/i.test(t)) return true;
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
    return true;
  }
  if (/\b(recebi|ganhei|faturei|vendi|depositei)\b/i.test(t)) return true;
  return false;
}

/** Mensagem clara de lançamento financeiro (gasto OU ganho) — prioridade sobre meta. */
export function isExplicitTransactionRegistration(text: string): boolean {
  return isExplicitExpenseRegistration(text) || isExplicitIncomeRegistration(text);
}

export function isTransactionMessage(text: string): boolean {
  if (isQueryMessage(text)) return false;
  if (isExplicitTransactionRegistration(text)) return true;
  return /gastei|paguei|comprei|despesa|gasto|sa[ií]|debitou|cart[aã]o|pix\s+(?:de|no|pro)|recebi|ganhei|entrada|entrou|sal[aá]rio|vendi|faturei|depositei|caiu|transfer[ií]|rendimento|freela|cliente\s+pagou/i.test(
    text.trim(),
  );
}

/** Verbo de receita na mensagem. */
export function isIncomeMessage(text: string): boolean {
  if (isExplicitIncomeRegistration(text)) return true;
  return /recebi|ganhei|entrada|entrou|sal[aá]rio|vendi|faturei|depositei|caiu|rendimento|freela|cliente\s+pagou|pagamento\s+de/i.test(
    text.trim(),
  );
}

/** Verbo de despesa na mensagem. */
export function isExpenseMessage(text: string): boolean {
  if (isExplicitExpenseRegistration(text)) return true;
  return /gastei|paguei|comprei|despesa|gasto|sa[ií]|debitou|cart[aã]o|pix\s+(?:de|no|pro)/i.test(
    text.trim(),
  );
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
    return false;
  }
  if (isExplicitExpenseRegistration(t)) return true;
  if (isExpenseMessage(t) && !/\b(junt|poupar|economiz|guardar|limite\s+de|teto\s+de)\b/i.test(t)) {
    return true;
  }
  return false;
}

/** Apenas valor numérico, sem verbo de transação. */
export function isBareAmountMessage(text: string): boolean {
  const t = text.trim();
  if (!t || isTransactionMessage(t)) return false;
  return /^[\d\s.,r$kKmMil]+$/i.test(t) && parseMoneyAmount(t) != null;
}
