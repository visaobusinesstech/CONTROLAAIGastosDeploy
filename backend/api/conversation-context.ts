/**
 * Fase conversacional pós-setup — guia o agente entre cadastro → metas → gastos.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Etapas do funil conversacional: cadastro, renda, metas ou lançamentos. */
export type ConversationPhase = "registration" | "income" | "goals" | "expenses";

/** Mapa em memória: userId → fase atual (não persiste no banco — reinicia com o servidor). */
const phases = new Map<string, ConversationPhase>();

/** Usuários que acabaram de se registrar e ainda não receberam parabéns. */
const justRegisteredUsers = new Set<string>();

/** Marca usuário como recém-cadastrado para disparar fluxo de boas-vindas na próxima mensagem. */
export function markJustRegistered(userId: string): void {
  justRegisteredUsers.add(userId); // Adiciona ID ao conjunto temporário
}

/** Consome flag de recém-cadastrado — retorna true apenas na primeira vez. */
export function consumeJustRegistered(userId: string): boolean {
  if (!justRegisteredUsers.has(userId)) return false; // Já consumiu ou nunca foi marcado
  justRegisteredUsers.delete(userId); // Remove para não repetir parabéns
  return true; // Era recém-cadastrado
}

/** Verifica se usuário ainda está marcado como recém-cadastrado (sem consumir). */
export function isJustRegistered(userId: string): boolean {
  return justRegisteredUsers.has(userId); // Consulta sem remover
}

/** Define em qual fase da conversa o usuário está (renda, metas, gastos, etc.). */
export function setConversationPhase(userId: string, phase: ConversationPhase): void {
  phases.set(userId, phase); // Grava ou sobrescreve fase do usuário
}

/** Retorna fase atual ou null se o agente ainda não classificou o usuário. */
export function getConversationPhase(userId: string): ConversationPhase | null {
  return phases.get(userId) ?? null; // null = sem fase definida
}

/** Remove fase conversacional — usado ao concluir onboarding ou resetar fluxo. */
export function clearConversationPhase(userId: string): void {
  phases.delete(userId); // Limpa entrada do mapa
}

/** Regex para detectar confirmações curtas: ok, beleza, valeu, etc. */
const ACK_RE =
  /^(beleza|blz|ok|okay|valeu|obrigad[oa]?|show|perfeito|entendi|certo|combinado|isso|sim|ta\s+bom|t[aá]\s+bom|top|massa|fechou|pode ser|manda ver|bora|vamos|legal|certinho)([!?.…,\s]*|$)/i;

/** True se a mensagem é só uma confirmação curta — agente responde contextualmente em vez de parsear. */
export function isAcknowledgment(text: string): boolean {
  const t = text.trim(); // Remove espaços nas pontas
  return t.length <= 40 && ACK_RE.test(t); // Só frases curtas batem no regex
}
