/**
 * Guarda de resposta WhatsApp — só permite envio durante processamento de inbound.
 *
 * Papel no sistema: Módulo WhatsApp/Baileys — canal alternativo ao frontend web.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { AsyncLocalStorage } from "node:async_hooks";

/** Contexto da mensagem recebida que autoriza uma resposta. */
export type InboundReplyContext = {
  chatJid: string;
  messageId: string;
  remotePhone: string;
};

const storage = new AsyncLocalStorage<InboundReplyContext>();

/** Executa fn com contexto de resposta autorizado (mensagem inbound em processamento). */
export function runWithInboundReply<T>(ctx: InboundReplyContext, fn: () => Promise<T>): Promise<T> { // Função exportada — pode ser usada em outros arquivos
  return storage.run(ctx, fn);
}

/** Verifica se o envio para chatJid está autorizado por inbound em processamento. */
export function isReplyAuthorized(chatJid: string): boolean { // Função exportada — pode ser usada em outros arquivos
  const ctx = storage.getStore();
  if (!ctx) return false;
  return ctx.chatJid === chatJid;
}

/** Retorna contexto ativo ou null. */
export function getInboundReplyContext(): InboundReplyContext | null { // Função exportada — pode ser usada em outros arquivos
  return storage.getStore() ?? null;
}
