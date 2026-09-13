/**
 * Envio de mensagens em bolhas (WhatsApp) — Controla.ai
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

import type { WhatsAppClient } from "./client.js"; // Importa apenas tipos TypeScript (não vira código no programa final)

/** Pausa entre bolhas (ms) — simula digitação humana. */
const BUBBLE_DELAY_MS = 900;

/** Aguarda N milissegundos. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Divide texto em bolhas por parágrafos duplos; se curto, retorna uma só. */
export function splitIntoBubbles(text: string): string[] { // Função exportada — pode ser usada em outros arquivos
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Se já vier como array explícito (separador especial), respeita
  if (trimmed.includes("|||")) {
    return trimmed
      .split("|||") // Divide texto em partes menores
      .map((b) => b.trim()) // Transforma cada item de uma lista em outro formato
      .filter(Boolean); // Mantém só os itens que passam no teste
  }
  const parts = trimmed
    .split(/\n{2,}/) // Divide texto em partes menores
    .map((p) => p.trim()) // Transforma cada item de uma lista em outro formato
    .filter(Boolean); // Mantém só os itens que passam no teste
  if (parts.length <= 1) return [trimmed];
  return parts;
}

/** Envia uma ou várias bolhas para o chat; retorna texto completo enviado. */
export async function sendBubbles(
  client: WhatsAppClient,
  chatJid: string,
  textOrBubbles: string | string[],
  options?: { delayMs?: number },
): Promise<string> {
  const bubbles = Array.isArray(textOrBubbles) ? textOrBubbles : splitIntoBubbles(textOrBubbles);
  if (bubbles.length === 0) return "";
  const delay = options?.delayMs ?? BUBBLE_DELAY_MS;
  for (let i = 0; i < bubbles.length; i++) {
    if (i > 0) await sleep(delay);
    await client.sendToChat(chatJid, bubbles[i]);
  }
  return bubbles.join("\n\n");
}
