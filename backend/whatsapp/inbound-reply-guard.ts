/**
 * Guarda de resposta WhatsApp — só permite envio durante processamento de inbound.
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
export function runWithInboundReply<T>(ctx: InboundReplyContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

/** Verifica se o envio para chatJid está autorizado por inbound em processamento. */
export function isReplyAuthorized(chatJid: string): boolean {
  const ctx = storage.getStore();
  if (!ctx) return false;
  return ctx.chatJid === chatJid;
}

/** Retorna contexto ativo ou null. */
export function getInboundReplyContext(): InboundReplyContext | null {
  return storage.getStore() ?? null;
}
