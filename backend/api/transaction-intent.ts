/**
 * Detecção de transações e normalização de valores — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
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

export function isTransactionMessage(text: string): boolean {
  if (isQueryMessage(text)) return false;
  return /gastei|paguei|comprei|despesa|gasto|sa[ií]|debitou|cart[aã]o|pix\s+(?:de|no|pro)|recebi|ganhei|entrada|entrou|sal[aá]rio|vendi|faturei|depositei|caiu|transfer[ií]|rendimento|freela|cliente\s+pagou/i.test(
    text.trim(),
  );
}

/** Verbo de receita na mensagem. */
export function isIncomeMessage(text: string): boolean {
  return /recebi|ganhei|entrada|entrou|sal[aá]rio|vendi|faturei|depositei|caiu|rendimento|freela|cliente\s+pagou|pagamento\s+de/i.test(
    text.trim(),
  );
}

/** Verbo de despesa na mensagem. */
export function isExpenseMessage(text: string): boolean {
  return /gastei|paguei|comprei|despesa|gasto|sa[ií]|debitou|cart[aã]o|pix\s+(?:de|no|pro)/i.test(
    text.trim(),
  );
}

/** Apenas valor numérico, sem verbo de transação. */
export function isBareAmountMessage(text: string): boolean {
  const t = text.trim();
  if (!t || isTransactionMessage(t)) return false;
  return /^[\d\s.,r$kKmMil]+$/i.test(t) && parseMoneyAmount(t) != null;
}
