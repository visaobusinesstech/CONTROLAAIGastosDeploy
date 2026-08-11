/**
 * Deduplicação de mensagens WhatsApp — evita reprocessar replays na reconexão.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { whatsappMessages } from "../src/db/schema.js";

/** Cache em memória dos IDs já processados (evita query repetida na mesma sessão). */
const processedIds = new Set<string>();

const MAX_CACHE = 5000;

/** Marca messageId como processado em memória. */
export function markMessageIdProcessed(messageId: string): void {
  if (!messageId) return;
  processedIds.add(messageId);
  if (processedIds.size > MAX_CACHE) {
    const first = processedIds.values().next().value;
    if (first) processedIds.delete(first);
  }
}

/** Verifica se messageId já foi processado (memória ou banco). */
export async function isMessageIdAlreadyProcessed(messageId: string): Promise<boolean> {
  if (!messageId) return false;
  if (processedIds.has(messageId)) return true;

  const [row] = await db
    .select({ id: whatsappMessages.id })
    .from(whatsappMessages)
    .where(eq(whatsappMessages.whatsappMessageId, messageId))
    .limit(1);

  if (row) {
    processedIds.add(messageId);
    return true;
  }
  return false;
}
