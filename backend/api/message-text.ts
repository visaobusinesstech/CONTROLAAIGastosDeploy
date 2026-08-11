/**
 * Normalização e detecção de saudações em mensagens inbound — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

const GREETING_RE =
  /^(oi|ol[aá]|opa|eai|e\s*a[ií]|bom\s+dia|boa\s+tarde|boa\s+noite|hey|hello|hi|salve|tudo\s+bem|td\s+bem|menu|ajuda|help|start|in[ií]cio|come[cç]ar|comecar|cad[eê]|e\s*a[ií]\s*(\?|$)|fala|beleza|blz)([!?.…,\s]*|$)/i;

const HELP_RE = /^(como\s+(usar|funciona)|o\s+que\s+(voc[eê]|vc)\s+faz|quais\s+comandos)/i;

/** Remove emojis e caracteres invisíveis comuns no WhatsApp. */
export function stripMessageDecorations(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u2060\u2066-\u2069]/g, "")
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .normalize("NFC")
    .trim();
}

/** Remove caracteres invisíveis comuns no WhatsApp e normaliza Unicode. */
export function normalizeInboundText(text: string): string {
  return stripMessageDecorations(text);
}

/** Saudação curta — não exige valor numérico. */
export function isGreetingMessage(text: string): boolean {
  const t = stripMessageDecorations(text);
  if (!t || t.length > 60) return false;
  if (GREETING_RE.test(t)) return true;
  const core = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!core) return false;
  const words = core.split(" ");
  const first = words[0] ?? "";
  if (["oi", "ola", "opa", "eai", "hey", "hi", "hello", "salve", "menu", "ajuda", "help", "start", "fala", "beleza", "blz", "cade"].includes(first)) {
    return words.length <= 6;
  }
  if (core.startsWith("bom dia") || core.startsWith("boa tarde") || core.startsWith("boa noite")) {
    return true;
  }
  if (/^(oi|ola|opa|hey|salve|bom dia|boa tarde|boa noite)/.test(core) && /tudo bem|como vai|beleza|blz/.test(core)) {
    return true;
  }
  return false;
}

/** Pedido explícito de ajuda. */
export function isHelpMessage(text: string): boolean {
  return HELP_RE.test(normalizeInboundText(text));
}

/** Mensagem curta sem verbo financeiro — preferir menu em vez de erro genérico. */
export function isAmbiguousShortMessage(text: string): boolean {
  const t = normalizeInboundText(text);
  if (!t || t.length > 80) return false;
  if (isGreetingMessage(t) || isHelpMessage(t)) return true;
  if (/gastei|paguei|comprei|recebi|ganhei|quanto|quais|meta|junt|saldo|relat/i.test(t)) return false;
  if (/^\d+([.,]\d+)?(\s*(k|mil|milh))?$/i.test(t)) return false;
  return true;
}
