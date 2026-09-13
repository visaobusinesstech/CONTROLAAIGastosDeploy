/**
 * Normalização e detecção de saudações em mensagens inbound — Controla.ai
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

/** Regex que reconhece saudações comuns em português e inglês no início da mensagem. */
const GREETING_RE =
  /^(oi|ol[aá]|opa|eai|e\s*a[ií]|bom\s+dia|boa\s+tarde|boa\s+noite|hey|hello|hi|salve|tudo\s+bem|td\s+bem|menu|ajuda|help|start|in[ií]cio|come[cç]ar|comecar|cad[eê]|e\s*a[ií]\s*(\?|$)|fala|beleza|blz)([!?.…,\s]*|$)/i;

/** Regex para pedidos explícitos de ajuda sobre como usar o assistente. */
const HELP_RE = /^(como\s+(usar|funciona)|o\s+que\s+(voc[eê]|vc)\s+faz|quais\s+comandos)/i;

/** Remove emojis e caracteres invisíveis comuns no WhatsApp. */
export function stripMessageDecorations(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u2060\u2066-\u2069]/g, "") // Zera-width e controles invisíveis
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "") // Remove emojis Unicode
    .normalize("NFC") // Unifica formas de caracteres (acentos consistentes)
    .trim(); // Espaços extras nas pontas
}

/** Remove caracteres invisíveis comuns no WhatsApp e normaliza Unicode. */
export function normalizeInboundText(text: string): string {
  return stripMessageDecorations(text); // Alias — ponto único de normalização
}

/** Saudação curta — não exige valor numérico; evita tratar "oi" como erro de parser. */
export function isGreetingMessage(text: string): boolean {
  const t = stripMessageDecorations(text); // Texto limpo para análise
  if (!t || t.length > 60) return false; // Vazio ou mensagem longa demais para ser só saudação
  if (GREETING_RE.test(t)) return true; // Match direto no regex principal
  const core = t
    .toLowerCase() // Minúsculas para comparar palavras
    .normalize("NFD") // Decompõe acentos
    .replace(/[\u0300-\u036f]/g, "") // Remove marcas diacríticas
    .replace(/[^a-z0-9\s]/g, " ") // Pontuação vira espaço
    .replace(/\s+/g, " ") // Colapsa espaços múltiplos
    .trim(); // Texto núcleo sem decoração
  if (!core) return false; // Só emojis/símbolos — não é saudação
  const words = core.split(" "); // Divide em palavras
  const first = words[0] ?? ""; // Primeira palavra guia a heurística
  if (["oi", "ola", "opa", "eai", "hey", "hi", "hello", "salve", "menu", "ajuda", "help", "start", "fala", "beleza", "blz", "cade"].includes(first)) {
    return words.length <= 6; // "Oi tudo bem?" — curto o bastante
  }
  if (core.startsWith("bom dia") || core.startsWith("boa tarde") || core.startsWith("boa noite")) {
    return true; // Cumprimentos com período do dia
  }
  if (/^(oi|ola|opa|hey|salve|bom dia|boa tarde|boa noite)/.test(core) && /tudo bem|como vai|beleza|blz/.test(core)) {
    return true; // "Oi, tudo bem?" — combinação típica
  }
  return false; // Não classificado como saudação
}

/** Pedido explícito de ajuda — mostra menu de capacidades do assistente. */
export function isHelpMessage(text: string): boolean {
  return HELP_RE.test(normalizeInboundText(text)); // "Como funciona?" etc.
}

/** Mensagem curta sem verbo financeiro — preferir menu em vez de erro genérico do parser. */
export function isAmbiguousShortMessage(text: string): boolean {
  const t = normalizeInboundText(text); // Texto normalizado
  if (!t || t.length > 80) return false; // Só mensagens curtas entram aqui
  if (isGreetingMessage(t) || isHelpMessage(t)) return true; // Saudação/ajuda = ambígua útil
  if (/gastei|paguei|comprei|recebi|ganhei|quanto|quais|meta|junt|saldo|relat/i.test(t)) return false; // Tem intenção financeira clara
  if (/^\d+([.,]\d+)?(\s*(k|mil|milh))?$/i.test(t)) return false; // Só número — pode ser renda
  return true; // Curta e sem pista — mostrar menu
}
