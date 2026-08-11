/**
 * Handler de mensagens WhatsApp → ControlaAI.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * REGRA: identificar usuário pelo telefone ANTES de qualquer ação.
 * Todas as transações/consultas usam exclusivamente user_id da conversa.
 */

import { eq } from "drizzle-orm";
import { db } from "../src/db/index.js";
import { users, whatsappConnection, whatsappMessages } from "../src/db/schema.js";
import { parseReceiptImage, parseDocumentText } from "../api/parser.js";
import {
  createTransactionFromIntent,
  createBulkTransactions,
  listAvailableCategories,
} from "../api/transaction-service.js";
import { processFinancialAgentMessage } from "../api/financial-agent.js";
import { clearOnboardingSession } from "../api/onboarding-agent.js";
import { clearGoalSession } from "../api/goal-agent.js";
import { clearIncomeClarifySession } from "../api/income-classifier.js";
import { isGreetingMessage, isHelpMessage, normalizeInboundText } from "../api/message-text.js";
import { getTopCategories } from "../api/financial-memory.js";
import { transcribeAudio, extractPdfText } from "../api/media-processor.js";
import { buildRegistrationBubbles, buildExpenseInviteBubbles } from "../api/app-links.js";
import { markJustRegistered } from "../api/conversation-context.js";
import {
  markPendingRegistration,
  wasPendingRegistration,
  clearPendingRegistration,
  getRecentOutboundMessages,
} from "../api/conversation-history.js";
import { sendBubbles } from "./whatsapp-bubbles.js";
import { runWithInboundReply } from "./inbound-reply-guard.js";
import { markMessageIdProcessed } from "./message-dedup.js";
import {
  resolveUserFromConversationPhone,
  type ResolvedConversationUser,
} from "./user-resolver.js";
import type { WhatsAppClient } from "./client.js";

/** Payload normalizado de uma mensagem recebida pelo Baileys. */
export type IncomingMessage = {
  remotePhone: string;
  replyJid: string;
  messageId: string;
  type: "text" | "audio" | "image" | "document" | "video" | "other";
  text?: string;
  mediaBuffer?: Buffer;
  mediaMimeType?: string;
  fileName?: string;
};

/** Verifica se usuário foi criado recentemente (cadastro acabou de acontecer). */
async function isRecentlyRegistered(userId: string, withinMinutes = 30): Promise<boolean> {
  const [row] = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row?.createdAt) return false;
  const ageMs = Date.now() - row.createdAt.getTime();
  return ageMs <= withinMinutes * 60 * 1000;
}

/** Envia resposta em bolhas e retorna texto completo logado. */
async function replyWithBubbles(
  client: WhatsAppClient,
  replyJid: string,
  response: string,
): Promise<string> {
  return sendBubbles(client, replyJid, response);
}

/** Grava inbound e marca messageId como processado (evita replay). */
async function logInbound(msg: IncomingMessage, content: string, userId?: string | null): Promise<void> {
  await logMessage(
    msg.remotePhone,
    "inbound",
    msg.type === "text" ? "text" : msg.type,
    content,
    userId ?? null,
    null,
    msg.messageId,
  );
  markMessageIdProcessed(msg.messageId);
}

/** Grava mensagem em whatsapp_messages e atualiza lastActivityAt da conexão. */
async function logMessage(
  remotePhone: string,
  direction: "inbound" | "outbound",
  messageType: IncomingMessage["type"],
  content: string | null,
  userId?: string | null,
  transactionId?: string | null,
  whatsappMessageId?: string,
): Promise<void> {
  await db.insert(whatsappMessages).values({
    userId: userId ?? null,
    remotePhone,
    direction,
    messageType,
    content,
    whatsappMessageId: whatsappMessageId ?? null,
    processed: direction === "outbound",
    transactionId: transactionId ?? null,
  });

  await db
    .update(whatsappConnection)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(whatsappConnection.id, "main"));
}

/** Pipeline principal: identifica usuário → processa mídia/texto → responde via IA. */
export async function processIncomingMessage(
  msg: IncomingMessage,
  client: WhatsAppClient,
): Promise<void> {
  return runWithInboundReply(
    { chatJid: msg.replyJid, messageId: msg.messageId, remotePhone: msg.remotePhone },
    () => processIncomingMessageInner(msg, client),
  );
}

async function processIncomingMessageInner(
  msg: IncomingMessage,
  client: WhatsAppClient,
): Promise<void> {
  let text = msg.text?.trim() ?? "";
  let resolved: ResolvedConversationUser | null = null;

  try {
    resolved = await resolveUserFromConversationPhone(msg.remotePhone);

    if (!resolved) {
      const isReminder = wasPendingRegistration(msg.remotePhone);
      markPendingRegistration(msg.remotePhone);
      const registrationBubbles = buildRegistrationBubbles(isReminder);
      const registrationMsg = registrationBubbles.join("\n\n");

      await logInbound(msg, text || msg.text || "[mensagem]");
      await sendBubbles(client, msg.replyJid, registrationBubbles);
      await logMessage(msg.remotePhone, "outbound", "text", registrationMsg, null);
      return;
    }

    const { userId, name } = resolved;

    // Detecta cadastro recém-concluído — telefone estava pendente ou conta nova sem histórico WA
    const hadPending = wasPendingRegistration(msg.remotePhone);
    clearPendingRegistration(msg.remotePhone);
    const priorOutbound = await getRecentOutboundMessages(userId, 1);
    const neverWelcomedOnWa = priorOutbound.length === 0;

    if (hadPending || ((await isRecentlyRegistered(userId)) && neverWelcomedOnWa)) {
      markJustRegistered(userId);
    }

    if (msg.type === "audio" && msg.mediaBuffer) {
      const transcribed = await transcribeAudio(msg.mediaBuffer, userId);
      if (transcribed) {
        text = transcribed;
      } else {
        await logInbound(msg, msg.text ?? "[audio]", userId);
        await replyWithBubbles(
          client,
          msg.replyJid,
          "❌ Não consegui transcrever o áudio. Tente enviar como texto.",
        );
        return;
      }
    }

    if (msg.type === "image" && msg.mediaBuffer && msg.mediaMimeType) {
      const intent = await parseReceiptImage(msg.mediaBuffer.toString("base64"), msg.mediaMimeType, userId);
      if (intent.intent === "transaction") {
        const result = await createTransactionFromIntent(userId, intent, "[imagem]");
        if (result) {
          await logInbound(msg, "[imagem]", userId);
          await replyWithBubbles(client, msg.replyJid, result.response);
          await logMessage(msg.remotePhone, "outbound", "text", result.response, userId, result.transactionId || null);
          return;
        }
      }
      text = text || "Comprovante enviado";
    }

    if (msg.type === "document" && msg.mediaBuffer) {
      const isPdf = msg.mediaMimeType?.includes("pdf") || msg.fileName?.endsWith(".pdf");
      if (isPdf) {
        const extracted = await extractPdfText(msg.mediaBuffer);
        if (extracted) {
          const parsed = await parseDocumentText(extracted, userId);
          if (parsed.length > 0) {
            const count = await createBulkTransactions(userId, parsed);
            const response = `📄 *Importação concluída*|||${count} transação(ões) registrada(s) do PDF.`;
            await logInbound(msg, `[pdf: ${msg.fileName}]`, userId);
            await replyWithBubbles(client, msg.replyJid, response);
            await logMessage(msg.remotePhone, "outbound", "text", response.replace(/\|\|\|/g, "\n\n"), userId);
            return;
          }
        }
        await logInbound(msg, `[pdf: ${msg.fileName}]`, userId);
        await replyWithBubbles(client, msg.replyJid, "❌ Não encontrei transações no PDF.");
        return;
      }
    }

    if (!text) {
      await logInbound(msg, `[${msg.type}]`, userId);
      await replyWithBubbles(
        client,
        msg.replyJid,
        "Envie uma mensagem de texto, áudio ou comprovante para registrar suas finanças.",
      );
      return;
    }

    await logInbound(msg, text, userId);

    const topCategories = await getTopCategories(userId);
    const expenseCategories = await listAvailableCategories(userId, "expense");
    const incomeCategories = await listAvailableCategories(userId, "income");

    const normalizedText = normalizeInboundText(text);

    // Saudação — resposta direta; limpa fluxos presos (onboarding/metas/clarificação)
    if (isGreetingMessage(normalizedText) || isHelpMessage(normalizedText)) {
      clearOnboardingSession(userId);
      clearGoalSession(userId);
      clearIncomeClarifySession(userId);
      const welcome = buildExpenseInviteBubbles(name).join("|||");
      const sentText = await replyWithBubbles(client, msg.replyJid, welcome);
      await logMessage(msg.remotePhone, "outbound", "text", sentText || welcome, userId);
      return;
    }

    const agentResult = await processFinancialAgentMessage(userId, normalizedText, {
      userName: name,
      topCategories,
      expenseCategories,
      incomeCategories,
    });

    const sentText = await replyWithBubbles(client, msg.replyJid, agentResult.response);
    await logMessage(
      msg.remotePhone,
      "outbound",
      "text",
      sentText || agentResult.response,
      userId,
      agentResult.transactionId ?? null,
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] process error:", errMsg);
    try {
      await logInbound(msg, text || msg.text || "[erro]", resolved?.userId ?? null);
      await replyWithBubbles(
        client,
        msg.replyJid,
        "⚠️ Ocorreu um erro ao processar sua mensagem. Tente novamente.",
      );
    } catch {
      /* socket pode estar reconectando */
    }
  }
}
