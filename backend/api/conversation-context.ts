/**
 * Fase conversacional pós-setup — guia o agente entre cadastro → metas → gastos.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
export type ConversationPhase = "registration" | "income" | "goals" | "expenses";

const phases = new Map<string, ConversationPhase>();

/** Usuários que acabaram de se registrar e ainda não receberam parabéns. */
const justRegisteredUsers = new Set<string>();

export function markJustRegistered(userId: string): void {
  justRegisteredUsers.add(userId);
}

export function consumeJustRegistered(userId: string): boolean {
  if (!justRegisteredUsers.has(userId)) return false;
  justRegisteredUsers.delete(userId);
  return true;
}

export function isJustRegistered(userId: string): boolean {
  return justRegisteredUsers.has(userId);
}

export function setConversationPhase(userId: string, phase: ConversationPhase): void {
  phases.set(userId, phase);
}

export function getConversationPhase(userId: string): ConversationPhase | null {
  return phases.get(userId) ?? null;
}

export function clearConversationPhase(userId: string): void {
  phases.delete(userId);
}

const ACK_RE =
  /^(beleza|blz|ok|okay|valeu|obrigad[oa]?|show|perfeito|entendi|certo|combinado|isso|sim|ta\s+bom|t[aá]\s+bom|top|massa|fechou|pode ser|manda ver|bora|vamos|legal|certinho)([!?.…,\s]*|$)/i;

export function isAcknowledgment(text: string): boolean {
  const t = text.trim();
  return t.length <= 40 && ACK_RE.test(t);
}
