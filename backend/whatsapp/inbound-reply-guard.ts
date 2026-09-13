/**
 * Guarda de resposta WhatsApp — só permite envio durante processamento de inbound.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { AsyncLocalStorage } from "node:async_hooks"; // Importa código de outro arquivo para usar aqui

/** Contexto da mensagem recebida que autoriza uma resposta. */
export type InboundReplyContext = { // Exporta um tipo de dados para outros arquivos usarem
  chatJid: string; // Instrução do programa — parte da lógica deste arquivo
  messageId: string; // Instrução do programa — parte da lógica deste arquivo
  remotePhone: string; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

const storage = new AsyncLocalStorage<InboundReplyContext>(); // Guarda um valor que não muda durante a execução deste trecho

/** Executa fn com contexto de resposta autorizado (mensagem inbound em processamento). */
export function runWithInboundReply<T>(ctx: InboundReplyContext, fn: () => Promise<T>): Promise<T> { // Função exportada — pode ser usada em outros arquivos
  return storage.run(ctx, fn); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Verifica se o envio para chatJid está autorizado por inbound em processamento. */
export function isReplyAuthorized(chatJid: string): boolean { // Função exportada — pode ser usada em outros arquivos
  const ctx = storage.getStore(); // Guarda um valor que não muda durante a execução deste trecho
  if (!ctx) return false; // Só executa o bloco abaixo se esta condição for verdadeira
  return ctx.chatJid === chatJid; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Retorna contexto ativo ou null. */
export function getInboundReplyContext(): InboundReplyContext | null { // Função exportada — pode ser usada em outros arquivos
  return storage.getStore() ?? null; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
