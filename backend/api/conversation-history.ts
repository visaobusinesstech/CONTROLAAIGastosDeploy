/**
 * Histórico conversacional WhatsApp — evita repetição e mantém contexto — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { and, desc, eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { whatsappMessages } from "../src/db/schema.js";

/** Telefones que receberam link de cadastro e ainda não registraram. */
const pendingRegistrationPhones = new Set<string>();

/** Marca telefone como aguardando cadastro. */
export function markPendingRegistration(phone: string): void {
  pendingRegistrationPhones.add(phone);
}

/** Verifica se telefone estava aguardando cadastro. */
export function wasPendingRegistration(phone: string): boolean {
  return pendingRegistrationPhones.has(phone);
}

/** Remove telefone da lista de pendentes (após identificar usuário). */
export function clearPendingRegistration(phone: string): void {
  pendingRegistrationPhones.delete(phone);
}

/** Últimas N mensagens outbound do usuário (para anti-repetição). */
export async function getRecentOutboundMessages(
  userId: string,
  limit = 5,
): Promise<string[]> {
  const rows = await db
    .select({ content: whatsappMessages.content })
    .from(whatsappMessages)
    .where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.direction, "outbound")))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit);

  return rows.map((r) => r.content?.trim() ?? "").filter(Boolean);
}

/** Últimas N mensagens inbound do usuário (contexto da conversa). */
export async function getRecentInboundMessages(
  userId: string,
  limit = 5,
): Promise<string[]> {
  const rows = await db
    .select({ content: whatsappMessages.content })
    .from(whatsappMessages)
    .where(and(eq(whatsappMessages.userId, userId), eq(whatsappMessages.direction, "inbound")))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit);

  return rows.map((r) => r.content?.trim() ?? "").filter(Boolean);
}

/** Normaliza texto para comparação (remove espaços extras, lowercase). */
function normalizeForCompare(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Verifica se a resposta é idêntica ou muito similar a uma recente. */
export function isDuplicateResponse(response: string, recentOutbound: string[]): boolean {
  const norm = normalizeForCompare(response);
  if (!norm) return false;

  for (const prev of recentOutbound) {
    const prevNorm = normalizeForCompare(prev);
    if (prevNorm === norm) return true;
    // Similaridade alta — mesma mensagem com pequenas variações
    if (prevNorm.length > 20 && norm.length > 20) {
      const shorter = prevNorm.length < norm.length ? prevNorm : norm;
      const longer = prevNorm.length < norm.length ? norm : prevNorm;
      if (longer.includes(shorter.slice(0, Math.min(shorter.length, 80)))) return true;
    }
  }
  return false;
}

/** Variações para evitar repetir a mesma frase. */
const VARIATION_SUFFIXES = [
  "",
  " Estou por aqui se precisar.",
  " Qualquer dúvida, é só chamar.",
  " Conte comigo para organizar suas finanças.",
];

let variationIndex = 0;

/** Retorna resposta alternativa se for duplicata das recentes. */
export function ensureUniqueResponse(response: string, recentOutbound: string[]): string {
  if (!isDuplicateResponse(response, recentOutbound)) return response;

  variationIndex = (variationIndex + 1) % VARIATION_SUFFIXES.length;
  const suffix = VARIATION_SUFFIXES[variationIndex];
  if (!suffix) {
    // Se ainda duplicar, retorna versão encurtada
    const lines = response.split("\n").filter(Boolean);
    if (lines.length > 1) return lines.slice(-1)[0];
    return response;
  }

  const varied = response + suffix;
  if (isDuplicateResponse(varied, recentOutbound)) {
    return response.split("\n\n")[0] ?? response;
  }
  return varied;
}

/** Monta resumo de contexto para o agente (últimas trocas). */
export async function buildConversationContextSummary(userId: string): Promise<string> {
  const inbound = await getRecentInboundMessages(userId, 3);
  const outbound = await getRecentOutboundMessages(userId, 2);
  if (inbound.length === 0 && outbound.length === 0) return "";

  const parts: string[] = [];
  if (inbound.length) parts.push(`Usuário disse recentemente: ${inbound.reverse().join(" | ")}`);
  if (outbound.length) parts.push(`Assistente respondeu: ${outbound.reverse().join(" | ")}`);
  return parts.join(". ");
}

/** Histórico formatado para o parser OpenAI — últimas mensagens em ordem cronológica. */
export async function buildParserConversationHistory(userId: string, limit = 6): Promise<string> {
  const rows = await db
    .select({
      direction: whatsappMessages.direction,
      content: whatsappMessages.content,
    })
    .from(whatsappMessages)
    .where(eq(whatsappMessages.userId, userId))
    .orderBy(desc(whatsappMessages.createdAt))
    .limit(limit);

  if (rows.length === 0) return "";

  const lines = rows
    .reverse()
    .map((r) => {
      const role = r.direction === "inbound" ? "Usuário" : "Assistente";
      const text = r.content?.trim().slice(0, 180) ?? "";
      return text ? `${role}: ${text}` : null;
    })
    .filter(Boolean);

  return lines.join("\n");
}
