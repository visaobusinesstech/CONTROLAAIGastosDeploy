/**
 * Envio de mensagens em bolhas (WhatsApp) — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Divide respostas longas em mensagens curtas com pausa entre elas,
 * simulando conversa humanizada no WhatsApp.
 */

import type { WhatsAppClient } from "./client.js"; // Importa apenas tipos TypeScript (não vira código no programa final)

/** Pausa entre bolhas (ms) — simula digitação humana. */
const BUBBLE_DELAY_MS = 900; // Guarda um valor que não muda durante a execução deste trecho

/** Aguarda N milissegundos. */
function sleep(ms: number): Promise<void> { // Bloco de código reutilizável com um nome
  return new Promise((resolve) => setTimeout(resolve, ms)); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Divide texto em bolhas por parágrafos duplos; se curto, retorna uma só. */
export function splitIntoBubbles(text: string): string[] { // Função exportada — pode ser usada em outros arquivos
  const trimmed = text.trim(); // Guarda um valor que não muda durante a execução deste trecho
  if (!trimmed) return []; // Só executa o bloco abaixo se esta condição for verdadeira

  // Se já vier como array explícito (separador especial), respeita
  if (trimmed.includes("|||")) { // Só executa o bloco abaixo se esta condição for verdadeira
    return trimmed // Devolve um valor e encerra a função aqui
      .split("|||") // Divide texto em partes menores
      .map((b) => b.trim()) // Transforma cada item de uma lista em outro formato
      .filter(Boolean); // Mantém só os itens que passam no teste
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const parts = trimmed // Guarda um valor que não muda durante a execução deste trecho
    .split(/\n{2,}/) // Divide texto em partes menores
    .map((p) => p.trim()) // Transforma cada item de uma lista em outro formato
    .filter(Boolean); // Mantém só os itens que passam no teste

  if (parts.length <= 1) return [trimmed]; // Só executa o bloco abaixo se esta condição for verdadeira
  return parts; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Envia uma ou várias bolhas para o chat; retorna texto completo enviado. */
export async function sendBubbles( // Função assíncrona exportada — outros módulos podem chamar
  client: WhatsAppClient, // Instrução do programa — parte da lógica deste arquivo
  chatJid: string, // Instrução do programa — parte da lógica deste arquivo
  textOrBubbles: string | string[], // Instrução do programa — parte da lógica deste arquivo
  options?: { delayMs?: number }, // Instrução do programa — parte da lógica deste arquivo
): Promise<string> { // Fecha parêntese aberto antes
  const bubbles = Array.isArray(textOrBubbles) ? textOrBubbles : splitIntoBubbles(textOrBubbles); // Guarda um valor que não muda durante a execução deste trecho
  if (bubbles.length === 0) return ""; // Só executa o bloco abaixo se esta condição for verdadeira

  const delay = options?.delayMs ?? BUBBLE_DELAY_MS; // Guarda um valor que não muda durante a execução deste trecho

  for (let i = 0; i < bubbles.length; i++) { // Repete o bloco para cada item da lista
    if (i > 0) await sleep(delay); // Só executa o bloco abaixo se esta condição for verdadeira
    await client.sendToChat(chatJid, bubbles[i]); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  return bubbles.join("\n\n"); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
