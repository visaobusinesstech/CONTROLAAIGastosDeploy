/**
 * Handler de mensagens WhatsApp → ControlaAI.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * REGRA: identificar usuário pelo telefone ANTES de qualquer ação.
 * Todas as transações/consultas usam exclusivamente user_id da conversa.
 */

import { eq } from "drizzle-orm"; // Importa código de outro arquivo para usar aqui
import { db } from "../src/db/index.js"; // Importa código de outro arquivo para usar aqui
import { users, whatsappConnection, whatsappMessages } from "../src/db/schema.js"; // Importa código de outro arquivo para usar aqui
import { parseReceiptImage, parseDocumentText } from "../api/parser.js"; // Importa código de outro arquivo para usar aqui
import { // Importa código de outro arquivo para usar aqui
  createTransactionFromIntent, // Instrução do programa — parte da lógica deste arquivo
  createBulkTransactions, // Instrução do programa — parte da lógica deste arquivo
  listAvailableCategories, // Instrução do programa — parte da lógica deste arquivo
} from "../api/transaction-service.js"; // Fecha bloco iniciado anteriormente
import { processFinancialAgentMessage } from "../api/financial-agent.js"; // Importa código de outro arquivo para usar aqui
import { clearOnboardingSession } from "../api/onboarding-agent.js"; // Importa código de outro arquivo para usar aqui
import { clearGoalSession } from "../api/goal-agent.js"; // Importa código de outro arquivo para usar aqui
import { clearIncomeClarifySession } from "../api/income-classifier.js"; // Importa código de outro arquivo para usar aqui
import { isGreetingMessage, isHelpMessage, normalizeInboundText } from "../api/message-text.js"; // Importa código de outro arquivo para usar aqui
import { getTopCategories } from "../api/financial-memory.js"; // Importa código de outro arquivo para usar aqui
import { transcribeAudio, extractPdfText } from "../api/media-processor.js"; // Importa código de outro arquivo para usar aqui
import { buildRegistrationBubbles, buildExpenseInviteBubbles } from "../api/app-links.js"; // Importa código de outro arquivo para usar aqui
import { markJustRegistered } from "../api/conversation-context.js"; // Importa código de outro arquivo para usar aqui
import { // Importa código de outro arquivo para usar aqui
  markPendingRegistration, // Instrução do programa — parte da lógica deste arquivo
  wasPendingRegistration, // Instrução do programa — parte da lógica deste arquivo
  clearPendingRegistration, // Instrução do programa — parte da lógica deste arquivo
  getRecentOutboundMessages, // Instrução do programa — parte da lógica deste arquivo
} from "../api/conversation-history.js"; // Fecha bloco iniciado anteriormente
import { sendBubbles } from "./whatsapp-bubbles.js"; // Importa código de outro arquivo para usar aqui
import { runWithInboundReply } from "./inbound-reply-guard.js"; // Importa código de outro arquivo para usar aqui
import { markMessageIdProcessed } from "./message-dedup.js"; // Importa código de outro arquivo para usar aqui
import { // Importa código de outro arquivo para usar aqui
  resolveUserFromConversationPhone, // Instrução do programa — parte da lógica deste arquivo
  type ResolvedConversationUser, // Define formato de dados usado só pelo TypeScript
} from "./user-resolver.js"; // Fecha bloco iniciado anteriormente
import type { WhatsAppClient } from "./client.js"; // Importa apenas tipos TypeScript (não vira código no programa final)

/** Payload normalizado de uma mensagem recebida pelo Baileys. */
export type IncomingMessage = { // Exporta um tipo de dados para outros arquivos usarem
  remotePhone: string; // Instrução do programa — parte da lógica deste arquivo
  replyJid: string; // Instrução do programa — parte da lógica deste arquivo
  messageId: string; // Instrução do programa — parte da lógica deste arquivo
  type: "text" | "audio" | "image" | "document" | "video" | "other"; // Instrução do programa — parte da lógica deste arquivo
  text?: string; // Instrução do programa — parte da lógica deste arquivo
  mediaBuffer?: Buffer; // Instrução do programa — parte da lógica deste arquivo
  mediaMimeType?: string; // Instrução do programa — parte da lógica deste arquivo
  fileName?: string; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

/** Verifica se usuário foi criado recentemente (cadastro acabou de acontecer). */
async function isRecentlyRegistered(userId: string, withinMinutes = 30): Promise<boolean> { // Função que pode esperar operações demoradas (banco, rede)
  const [row] = await db // Guarda um valor que não muda durante a execução deste trecho
    .select({ createdAt: users.createdAt }) // Instrução do programa — parte da lógica deste arquivo
    .from(users) // Instrução do programa — parte da lógica deste arquivo
    .where(eq(users.id, userId)) // Filtra quais linhas do banco entram na consulta
    .limit(1); // Limita quantos registros voltam da consulta
  if (!row?.createdAt) return false; // Só executa o bloco abaixo se esta condição for verdadeira
  const ageMs = Date.now() - row.createdAt.getTime(); // Guarda um valor que não muda durante a execução deste trecho
  return ageMs <= withinMinutes * 60 * 1000; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Envia resposta em bolhas e retorna texto completo logado. */
async function replyWithBubbles( // Função que pode esperar operações demoradas (banco, rede)
  client: WhatsAppClient, // Instrução do programa — parte da lógica deste arquivo
  replyJid: string, // Instrução do programa — parte da lógica deste arquivo
  response: string, // Instrução do programa — parte da lógica deste arquivo
): Promise<string> { // Fecha parêntese aberto antes
  return sendBubbles(client, replyJid, response); // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Grava inbound e marca messageId como processado (evita replay). */
async function logInbound(msg: IncomingMessage, content: string, userId?: string | null): Promise<void> { // Função que pode esperar operações demoradas (banco, rede)
  await logMessage( // Espera terminar uma tarefa assíncrona antes de continuar
    msg.remotePhone, // Instrução do programa — parte da lógica deste arquivo
    "inbound", // Instrução do programa — parte da lógica deste arquivo
    msg.type === "text" ? "text" : msg.type, // Instrução do programa — parte da lógica deste arquivo
    content, // Instrução do programa — parte da lógica deste arquivo
    userId ?? null, // Instrução do programa — parte da lógica deste arquivo
    null, // Instrução do programa — parte da lógica deste arquivo
    msg.messageId, // Instrução do programa — parte da lógica deste arquivo
  ); // Fecha parêntese e encerra instrução
  markMessageIdProcessed(msg.messageId); // Instrução do programa — parte da lógica deste arquivo
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Grava mensagem em whatsapp_messages e atualiza lastActivityAt da conexão. */
async function logMessage( // Função que pode esperar operações demoradas (banco, rede)
  remotePhone: string, // Instrução do programa — parte da lógica deste arquivo
  direction: "inbound" | "outbound", // Instrução do programa — parte da lógica deste arquivo
  messageType: IncomingMessage["type"], // Instrução do programa — parte da lógica deste arquivo
  content: string | null, // Instrução do programa — parte da lógica deste arquivo
  userId?: string | null, // Instrução do programa — parte da lógica deste arquivo
  transactionId?: string | null, // Instrução do programa — parte da lógica deste arquivo
  whatsappMessageId?: string, // Instrução do programa — parte da lógica deste arquivo
): Promise<void> { // Fecha parêntese aberto antes
  await db.insert(whatsappMessages).values({ // Grava um registro novo no banco PostgreSQL
    userId: userId ?? null, // Instrução do programa — parte da lógica deste arquivo
    remotePhone, // Instrução do programa — parte da lógica deste arquivo
    direction, // Instrução do programa — parte da lógica deste arquivo
    messageType, // Instrução do programa — parte da lógica deste arquivo
    content, // Instrução do programa — parte da lógica deste arquivo
    whatsappMessageId: whatsappMessageId ?? null, // Instrução do programa — parte da lógica deste arquivo
    processed: direction === "outbound", // Instrução do programa — parte da lógica deste arquivo
    transactionId: transactionId ?? null, // Instrução do programa — parte da lógica deste arquivo
  }); // Fecha chamada de função ou método

  await db // Operação no banco de dados
    .update(whatsappConnection) // Instrução do programa — parte da lógica deste arquivo
    .set({ lastActivityAt: new Date(), updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
    .where(eq(whatsappConnection.id, "main")); // Filtra quais linhas do banco entram na consulta
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Pipeline principal: identifica usuário → processa mídia/texto → responde via IA. */
export async function processIncomingMessage( // Função assíncrona exportada — outros módulos podem chamar
  msg: IncomingMessage, // Instrução do programa — parte da lógica deste arquivo
  client: WhatsAppClient, // Instrução do programa — parte da lógica deste arquivo
): Promise<void> { // Fecha parêntese aberto antes
  return runWithInboundReply( // Devolve um valor e encerra a função aqui
    { chatJid: msg.replyJid, messageId: msg.messageId, remotePhone: msg.remotePhone }, // Abre bloco ou objeto com vários campos
    () => processIncomingMessageInner(msg, client), // Atribui ou calcula um valor para usar adiante
  ); // Fecha parêntese e encerra instrução
} // Fecha um bloco de código (if, função, objeto, etc.)

async function processIncomingMessageInner( // Função que pode esperar operações demoradas (banco, rede)
  msg: IncomingMessage, // Instrução do programa — parte da lógica deste arquivo
  client: WhatsAppClient, // Instrução do programa — parte da lógica deste arquivo
): Promise<void> { // Fecha parêntese aberto antes
  let text = msg.text?.trim() ?? ""; // Variável que pode mudar de valor conforme o programa roda
  let resolved: ResolvedConversationUser | null = null; // Variável que pode mudar de valor conforme o programa roda

  try { // Tenta executar código que pode falhar
    resolved = await resolveUserFromConversationPhone(msg.remotePhone); // Atribui ou calcula um valor para usar adiante

    if (!resolved) { // Só executa o bloco abaixo se esta condição for verdadeira
      const isReminder = wasPendingRegistration(msg.remotePhone); // Guarda um valor que não muda durante a execução deste trecho
      markPendingRegistration(msg.remotePhone); // Instrução do programa — parte da lógica deste arquivo
      const registrationBubbles = buildRegistrationBubbles(isReminder); // Guarda um valor que não muda durante a execução deste trecho
      const registrationMsg = registrationBubbles.join("\n\n"); // Guarda um valor que não muda durante a execução deste trecho

      await logInbound(msg, text || msg.text || "[mensagem]"); // Espera terminar uma tarefa assíncrona antes de continuar
      await sendBubbles(client, msg.replyJid, registrationBubbles); // Espera terminar uma tarefa assíncrona antes de continuar
      await logMessage(msg.remotePhone, "outbound", "text", registrationMsg, null); // Espera terminar uma tarefa assíncrona antes de continuar
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const { userId, name } = resolved; // Guarda um valor que não muda durante a execução deste trecho

    // Detecta cadastro recém-concluído — telefone estava pendente ou conta nova sem histórico WA
    const hadPending = wasPendingRegistration(msg.remotePhone); // Guarda um valor que não muda durante a execução deste trecho
    clearPendingRegistration(msg.remotePhone); // Instrução do programa — parte da lógica deste arquivo
    const priorOutbound = await getRecentOutboundMessages(userId, 1); // Guarda um valor que não muda durante a execução deste trecho
    const neverWelcomedOnWa = priorOutbound.length === 0; // Guarda um valor que não muda durante a execução deste trecho

    if (hadPending || ((await isRecentlyRegistered(userId)) && neverWelcomedOnWa)) { // Só executa o bloco abaixo se esta condição for verdadeira
      markJustRegistered(userId); // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (msg.type === "audio" && msg.mediaBuffer) { // Só executa o bloco abaixo se esta condição for verdadeira
      const transcribed = await transcribeAudio(msg.mediaBuffer, userId); // Guarda um valor que não muda durante a execução deste trecho
      if (transcribed) { // Só executa o bloco abaixo se esta condição for verdadeira
        text = transcribed; // Atribui ou calcula um valor para usar adiante
      } else { // Fecha bloco iniciado anteriormente
        await logInbound(msg, msg.text ?? "[audio]", userId); // Espera terminar uma tarefa assíncrona antes de continuar
        await replyWithBubbles( // Espera terminar uma tarefa assíncrona antes de continuar
          client, // Instrução do programa — parte da lógica deste arquivo
          msg.replyJid, // Instrução do programa — parte da lógica deste arquivo
          "❌ Não consegui transcrever o áudio. Tente enviar como texto.", // Instrução do programa — parte da lógica deste arquivo
        ); // Fecha parêntese e encerra instrução
        return; // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (msg.type === "image" && msg.mediaBuffer && msg.mediaMimeType) { // Só executa o bloco abaixo se esta condição for verdadeira
      const intent = await parseReceiptImage(msg.mediaBuffer.toString("base64"), msg.mediaMimeType, userId); // Guarda um valor que não muda durante a execução deste trecho
      if (intent.intent === "transaction") { // Só executa o bloco abaixo se esta condição for verdadeira
        const result = await createTransactionFromIntent(userId, intent, "[imagem]"); // Guarda um valor que não muda durante a execução deste trecho
        if (result) { // Só executa o bloco abaixo se esta condição for verdadeira
          await logInbound(msg, "[imagem]", userId); // Espera terminar uma tarefa assíncrona antes de continuar
          await replyWithBubbles(client, msg.replyJid, result.response); // Espera terminar uma tarefa assíncrona antes de continuar
          await logMessage(msg.remotePhone, "outbound", "text", result.response, userId, result.transactionId || null); // Espera terminar uma tarefa assíncrona antes de continuar
          return; // Instrução do programa — parte da lógica deste arquivo
        } // Fecha um bloco de código (if, função, objeto, etc.)
      } // Fecha um bloco de código (if, função, objeto, etc.)
      text = text || "Comprovante enviado"; // Atribui ou calcula um valor para usar adiante
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (msg.type === "document" && msg.mediaBuffer) { // Só executa o bloco abaixo se esta condição for verdadeira
      const isPdf = msg.mediaMimeType?.includes("pdf") || msg.fileName?.endsWith(".pdf"); // Guarda um valor que não muda durante a execução deste trecho
      if (isPdf) { // Só executa o bloco abaixo se esta condição for verdadeira
        const extracted = await extractPdfText(msg.mediaBuffer); // Guarda um valor que não muda durante a execução deste trecho
        if (extracted) { // Só executa o bloco abaixo se esta condição for verdadeira
          const parsed = await parseDocumentText(extracted, userId); // Guarda um valor que não muda durante a execução deste trecho
          if (parsed.length > 0) { // Só executa o bloco abaixo se esta condição for verdadeira
            const count = await createBulkTransactions(userId, parsed); // Guarda um valor que não muda durante a execução deste trecho
            const response = `📄 *Importação concluída*|||${count} transação(ões) registrada(s) do PDF.`; // Guarda um valor que não muda durante a execução deste trecho
            await logInbound(msg, `[pdf: ${msg.fileName}]`, userId); // Espera terminar uma tarefa assíncrona antes de continuar
            await replyWithBubbles(client, msg.replyJid, response); // Espera terminar uma tarefa assíncrona antes de continuar
            await logMessage(msg.remotePhone, "outbound", "text", response.replace(/\|\|\|/g, "\n\n"), userId); // Espera terminar uma tarefa assíncrona antes de continuar
            return; // Instrução do programa — parte da lógica deste arquivo
          } // Fecha um bloco de código (if, função, objeto, etc.)
        } // Fecha um bloco de código (if, função, objeto, etc.)
        await logInbound(msg, `[pdf: ${msg.fileName}]`, userId); // Espera terminar uma tarefa assíncrona antes de continuar
        await replyWithBubbles(client, msg.replyJid, "❌ Não encontrei transações no PDF."); // Espera terminar uma tarefa assíncrona antes de continuar
        return; // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (!text) { // Só executa o bloco abaixo se esta condição for verdadeira
      await logInbound(msg, `[${msg.type}]`, userId); // Espera terminar uma tarefa assíncrona antes de continuar
      await replyWithBubbles( // Espera terminar uma tarefa assíncrona antes de continuar
        client, // Instrução do programa — parte da lógica deste arquivo
        msg.replyJid, // Instrução do programa — parte da lógica deste arquivo
        "Envie uma mensagem de texto, áudio ou comprovante para registrar suas finanças.", // Instrução do programa — parte da lógica deste arquivo
      ); // Fecha parêntese e encerra instrução
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    await logInbound(msg, text, userId); // Espera terminar uma tarefa assíncrona antes de continuar

    const topCategories = await getTopCategories(userId); // Guarda um valor que não muda durante a execução deste trecho
    const expenseCategories = await listAvailableCategories(userId, "expense"); // Guarda um valor que não muda durante a execução deste trecho
    const incomeCategories = await listAvailableCategories(userId, "income"); // Guarda um valor que não muda durante a execução deste trecho

    const normalizedText = normalizeInboundText(text); // Guarda um valor que não muda durante a execução deste trecho

    // Saudação — resposta direta; limpa fluxos presos (onboarding/metas/clarificação)
    if (isGreetingMessage(normalizedText) || isHelpMessage(normalizedText)) { // Só executa o bloco abaixo se esta condição for verdadeira
      clearOnboardingSession(userId); // Instrução do programa — parte da lógica deste arquivo
      clearGoalSession(userId); // Instrução do programa — parte da lógica deste arquivo
      clearIncomeClarifySession(userId); // Instrução do programa — parte da lógica deste arquivo
      const welcome = buildExpenseInviteBubbles(name).join("|||"); // Guarda um valor que não muda durante a execução deste trecho
      const sentText = await replyWithBubbles(client, msg.replyJid, welcome); // Guarda um valor que não muda durante a execução deste trecho
      await logMessage(msg.remotePhone, "outbound", "text", sentText || welcome, userId); // Espera terminar uma tarefa assíncrona antes de continuar
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const agentResult = await processFinancialAgentMessage(userId, normalizedText, { // Guarda um valor que não muda durante a execução deste trecho
      userName: name, // Instrução do programa — parte da lógica deste arquivo
      topCategories, // Instrução do programa — parte da lógica deste arquivo
      expenseCategories, // Instrução do programa — parte da lógica deste arquivo
      incomeCategories, // Instrução do programa — parte da lógica deste arquivo
    }); // Fecha chamada de função ou método

    const sentText = await replyWithBubbles(client, msg.replyJid, agentResult.response); // Guarda um valor que não muda durante a execução deste trecho
    await logMessage( // Espera terminar uma tarefa assíncrona antes de continuar
      msg.remotePhone, // Instrução do programa — parte da lógica deste arquivo
      "outbound", // Instrução do programa — parte da lógica deste arquivo
      "text", // Instrução do programa — parte da lógica deste arquivo
      sentText || agentResult.response, // Instrução do programa — parte da lógica deste arquivo
      userId, // Instrução do programa — parte da lógica deste arquivo
      agentResult.transactionId ?? null, // Instrução do programa — parte da lógica deste arquivo
    ); // Fecha parêntese e encerra instrução
  } catch (err) { // Fecha bloco iniciado anteriormente
    const errMsg = err instanceof Error ? err.message : String(err); // Guarda um valor que não muda durante a execução deste trecho
    console.error("[whatsapp] process error:", errMsg); // Escreve mensagem no terminal para diagnóstico
    try { // Tenta executar código que pode falhar
      await logInbound(msg, text || msg.text || "[erro]", resolved?.userId ?? null); // Espera terminar uma tarefa assíncrona antes de continuar
      await replyWithBubbles( // Espera terminar uma tarefa assíncrona antes de continuar
        client, // Instrução do programa — parte da lógica deste arquivo
        msg.replyJid, // Instrução do programa — parte da lógica deste arquivo
        "⚠️ Ocorreu um erro ao processar sua mensagem. Tente novamente.", // Instrução do programa — parte da lógica deste arquivo
      ); // Fecha parêntese e encerra instrução
    } catch { // Fecha bloco iniciado anteriormente
      /* socket pode estar reconectando */ // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)
