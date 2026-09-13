/**
 * Deduplicação de mensagens WhatsApp — evita reprocessar replays na reconexão.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { eq } from "drizzle-orm"; // Importa código de outro arquivo para usar aqui
import { db } from "../src/db/index.js"; // Importa código de outro arquivo para usar aqui
import { whatsappMessages } from "../src/db/schema.js"; // Importa código de outro arquivo para usar aqui

/** Cache em memória dos IDs já processados (evita query repetida na mesma sessão). */
const processedIds = new Set<string>(); // Guarda um valor que não muda durante a execução deste trecho

const MAX_CACHE = 5000; // Guarda um valor que não muda durante a execução deste trecho

/** Marca messageId como processado em memória. */
export function markMessageIdProcessed(messageId: string): void { // Função exportada — pode ser usada em outros arquivos
  if (!messageId) return; // Só executa o bloco abaixo se esta condição for verdadeira
  processedIds.add(messageId); // Instrução do programa — parte da lógica deste arquivo
  if (processedIds.size > MAX_CACHE) { // Só executa o bloco abaixo se esta condição for verdadeira
    const first = processedIds.values().next().value; // Guarda um valor que não muda durante a execução deste trecho
    if (first) processedIds.delete(first); // Só executa o bloco abaixo se esta condição for verdadeira
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Verifica se messageId já foi processado (memória ou banco). */
export async function isMessageIdAlreadyProcessed(messageId: string): Promise<boolean> { // Função assíncrona exportada — outros módulos podem chamar
  if (!messageId) return false; // Só executa o bloco abaixo se esta condição for verdadeira
  if (processedIds.has(messageId)) return true; // Só executa o bloco abaixo se esta condição for verdadeira

  const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ id: whatsappMessages.id }) // Instrução do programa — parte da lógica deste arquivo
    .from(whatsappMessages) // Instrução do programa — parte da lógica deste arquivo
    .where(eq(whatsappMessages.whatsappMessageId, messageId)) // Filtra quais linhas do banco entram na consulta
    .limit(1); // Limita quantos registros voltam da consulta

  if (row) { // Só executa o bloco abaixo se esta condição for verdadeira
    processedIds.add(messageId); // Instrução do programa — parte da lógica deste arquivo
    return true; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return false; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
