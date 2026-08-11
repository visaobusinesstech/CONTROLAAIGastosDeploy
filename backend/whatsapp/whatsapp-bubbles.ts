/**
 * Envio de mensagens em bolhas (WhatsApp) — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Divide respostas longas em mensagens curtas com pausa entre elas,
 * simulando conversa humanizada no WhatsApp.
 */

import type { WhatsAppClient } from "./client.js";

/** Pausa entre bolhas (ms) — simula digitação humana. */
const BUBBLE_DELAY_MS = 900;

/** Aguarda N milissegundos. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Divide texto em bolhas por parágrafos duplos; se curto, retorna uma só. */
export function splitIntoBubbles(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Se já vier como array explícito (separador especial), respeita
  if (trimmed.includes("|||")) {
    return trimmed
      .split("|||")
      .map((b) => b.trim())
      .filter(Boolean);
  }

  const parts = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

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
