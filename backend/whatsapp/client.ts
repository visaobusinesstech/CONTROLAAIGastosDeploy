/**
 * =============================================================================
 * CLIENTE WHATSAPP (BAILEYS) — Controla.ai
 * =============================================================================
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Responsabilidades:
 *   • Conectar o número oficial via QR Code (admin em /admin/whatsapp)
 *   • Persistir sessão em disco para não pedir QR de novo
 *   • Receber mensagens → repassar ao message-handler → IA → banco
 *   • Reconectar automaticamente quando cair
 *   • Fallback inteligente a cada 30 min (módulo keep-alive.ts)
 *
 * Fluxo resumido:
 *   initWhatsApp() → carrega estado do banco → conecta se já pareado
 *   keep-alive (30 min) → verifica saúde → refresh ou reconecta
 * =============================================================================
 */

import { eq } from "drizzle-orm"; // Igualdade em WHERE/UPDATE
import pino from "pino"; // Logger estruturado usado pelo Baileys
import { Writable } from "node:stream"; // Stream customizado para capturar logs Baileys
import makeWASocket, {
  DisconnectReason, // Códigos de desconexão (logout, restart, etc.)
  Browsers, // User-agent simulado (macOS Chrome)
  fetchLatestWaWebVersion, // Versão compatível do protocolo WA Web
  downloadMediaMessage, // Baixa áudio/imagem/documento
  useMultiFileAuthState, // Persiste credenciais em arquivos
  type WASocket, // Tipo do socket Baileys
  type WAMessage, // Tipo de mensagem recebida
} from "@whiskeysockets/baileys";
import { db } from "../src/db/index.js"; // Cliente PostgreSQL
import { whatsappConnection } from "../src/db/schema.js"; // Estado singleton da conexão
import { processIncomingMessage } from "./message-handler.js"; // Pipeline IA/financeiro
import { resolveWhatsAppSender } from "./jid-resolver.js"; // Telefone + JID (LID/PN)
import { normalizePhone } from "../src/utils/phone.js";
import {
  SESSION_DIR, // Pasta .baileys-session
  hasRegisteredSession, // true após escanear QR
  clearSessionDir, // Apaga sessão no logout
  ensureSessionDir, // Cria pasta se não existir
} from "./session-utils.js";
import { getWhatsAppKeepAlive, type KeepAliveStats } from "./keep-alive.js"; // Timer 30 min
import { appendBaileysLog } from "./baileys-log.js"; // Buffer logs admin
import { isReplyAuthorized } from "./inbound-reply-guard.js"; // Bloqueia envio sem inbound
import { isMessageIdAlreadyProcessed, markMessageIdProcessed } from "./message-dedup.js"; // Evita replay

const baileysLogStream = new Writable({
  write(chunk, _enc, cb) {
    try {
      const row = JSON.parse(chunk.toString()) as {
        level: number;
        msg?: string;
        [key: string]: unknown; // Abre lista de valores
      };
      const levelMap: Record<number, "debug" | "info" | "warn" | "error"> = {
        10: "debug",
        20: "debug",
        30: "info",
        40: "warn",
        50: "error",
        60: "error",
      };
      const level = levelMap[row.level] ?? "info";
      const { msg, level: _l, time, pid, hostname, v, ...rest } = row;
      appendBaileysLog(level, String(msg ?? "evento Baileys"), Object.keys(rest).length ? rest : undefined);
    } catch {
      appendBaileysLog("info", chunk.toString().trim());
    }
    cb();
  },
});

/** Logger Baileys — captura eventos internos para o painel admin. */
const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? "warn" }, baileysLogStream);

/** Tempo máximo aguardando QR antes de mostrar erro ao admin. */
const QR_WAIT_TIMEOUT_MS = 45_000;

/** Estado público da conexão — espelhado no banco e na API /admin/whatsapp/status. */
export type ConnectionState = {
  status: "disconnected" | "connecting" | "qr" | "connected" | "error";
  qrCode: string | null;
  phoneNumber: string | null;
  lastActivityAt: string | null;
  connectedAt: string | null;
  errorMessage: string | null;
};

export type KeepAliveResult = "skipped" | "healthy" | "refreshed" | "reconnected";

export class WhatsAppClient {
  // --- Estado em memória (fonte da verdade durante execução) ---
  private sock: WASocket | null = null; // Membro interno da classe — só usado dentro dela
  private qrCode: string | null = null; // Membro interno da classe — só usado dentro dela
  private status: ConnectionState["status"] = "disconnected"; // Membro interno da classe — só usado dentro dela
  private phoneNumber: string | null = null; // Membro interno da classe — só usado dentro dela
  private connectedAt: Date | null = null; // Membro interno da classe — só usado dentro dela
  private errorMessage: string | null = null; // Membro interno da classe — só usado dentro dela
  // --- Controle de reconexão ---
  private reconnectAttempts = 0; // Membro interno da classe — só usado dentro dela
  private connecting = false; // Membro interno da classe — só usado dentro dela
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null; // Membro interno da classe — só usado dentro dela
  private qrTimeoutTimer: ReturnType<typeof setTimeout> | null = null; // Membro interno da classe — só usado dentro dela
  private keepAliveBusy = false; // Membro interno da classe — só usado dentro dela
  // ---------------------------------------------------------------------------
  // Estado público
  // ---------------------------------------------------------------------------
  getState(): ConnectionState {
    return {
      status: this.status,
      qrCode: this.qrCode,
      phoneNumber: this.phoneNumber,
      lastActivityAt: null,
      connectedAt: this.connectedAt?.toISOString() ?? null,
      errorMessage: this.errorMessage,
    };
  }
  /** Mescla memória + banco — usado pela rota GET /status (QR pode estar só no banco). */
  async getMergedState(): Promise<ConnectionState> {
    const memory = this.getState();
    const [dbRow] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main"));
    const qrCode = memory.qrCode ?? dbRow?.qrCode ?? null;
    let status = memory.status;
    if (memory.status === "connected") {
      status = "connected";
    } else if (qrCode) {
      status = "qr";
    } else if (memory.status === "disconnected" && dbRow?.status) {
      status = dbRow.status as ConnectionState["status"];
    }
    return {
      status,
      qrCode,
      phoneNumber: memory.phoneNumber ?? dbRow?.phoneNumber ?? null,
      lastActivityAt: dbRow?.lastActivityAt?.toISOString() ?? null,
      connectedAt: memory.connectedAt ?? dbRow?.connectedAt?.toISOString() ?? null,
      errorMessage: memory.errorMessage ?? dbRow?.errorMessage ?? null,
    };
  }
  getKeepAliveStats(): KeepAliveStats {
    return getWhatsAppKeepAlive().getStats();
  }
  // ---------------------------------------------------------------------------
  // Persistência no PostgreSQL
  // ---------------------------------------------------------------------------
  async updateDbState(): Promise<void> {
    await db
      .insert(whatsappConnection)
      .values({
        id: "main",
        status: this.status,
        qrCode: this.qrCode,
        phoneNumber: this.phoneNumber,
        connectedAt: this.connectedAt,
        errorMessage: this.errorMessage,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({ // Se já existir, atualiza em vez de dar erro de duplicado
        target: whatsappConnection.id,
        set: {
          status: this.status,
          qrCode: this.qrCode,
          phoneNumber: this.phoneNumber,
          connectedAt: this.connectedAt,
          errorMessage: this.errorMessage,
          updatedAt: new Date(),
        },
      });
  }
  /** Atualiza lastActivityAt — chamado após mensagens e ciclos de keep-alive. */
  async touchActivity(): Promise<void> {
    await db
      .update(whatsappConnection)
      .set({ lastActivityAt: new Date(), updatedAt: new Date() })
      .where(eq(whatsappConnection.id, "main"));
  }
  async loadStateFromDb(): Promise<void> {
    const [row] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main"));
    if (row) {
      this.status = row.status as ConnectionState["status"]; // Acessa propriedade ou método desta instância da classe
      this.qrCode = row.qrCode; // Acessa propriedade ou método desta instância da classe
      this.phoneNumber = row.phoneNumber; // Acessa propriedade ou método desta instância da classe
      this.connectedAt = row.connectedAt; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = row.errorMessage; // Acessa propriedade ou método desta instância da classe
    }
  }
  // ---------------------------------------------------------------------------
  // Keep-alive — fallback a cada 30 minutos (delegado por keep-alive.ts)
  // ---------------------------------------------------------------------------
  /**
   * Ciclo inteligente de manutenção:
   *   • Sem sessão pareada → ignora (admin ainda não escaneou QR)
   *   • Em QR / conectando primeiro pareamento → ignora
   *   • Conectado e saudável → refresh preventivo com sessão salva
   *   • Conectado mas socket morto → reconecta
   *   • Offline / erro → reconecta com sessão
   */
  async runKeepAliveFallback(reason: string): Promise<KeepAliveResult> {
    if (!isWhatsAppEnabled()) return "skipped";
    if (!hasRegisteredSession()) return "skipped";
    if (this.keepAliveBusy || this.connecting) return "skipped";
    if (this.status === "qr") return "skipped";
    if (this.status === "connecting" && !hasRegisteredSession()) return "skipped";
    this.keepAliveBusy = true; // Acessa propriedade ou método desta instância da classe
    try {
      const healthy = this.status === "connected" && (await this.probeConnectionHealth());
      if (healthy) {
        await this.touchActivity();
        console.log(`[whatsapp-keepalive] refresh preventivo (${reason})`); // Escreve mensagem no terminal para diagnóstico
        await this.softReconnectWithSession("keepalive-preventive");
        return "refreshed";
      }
      if (this.status === "connected" && !healthy) {
        console.log(`[whatsapp-keepalive] socket frágil — reconectando (${reason})`); // Escreve mensagem no terminal para diagnóstico
        await this.softReconnectWithSession("keepalive-unhealthy");
        return "reconnected";
      }
      if (this.status === "disconnected" || this.status === "error" || this.status === "connecting") {
        console.log(`[whatsapp-keepalive] offline (${this.status}) — reconectando (${reason})`); // Escreve mensagem no terminal para diagnóstico
        this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
        await this.connect(false);
        return "reconnected";
      }
      return "healthy";
    } finally {
      this.keepAliveBusy = false; // Acessa propriedade ou método desta instância da classe
    }
  }
  /** Verifica se o socket Baileys ainda responde (usuário logado + websocket aberto). */
  private async probeConnectionHealth(): Promise<boolean> { // Membro interno da classe — só usado dentro dela
    if (!this.sock || this.status !== "connected") return false;
    try {
      if (!this.sock.user?.id) return false;
      const ws = (this.sock as { ws?: { isOpen?: boolean } }).ws;
      if (ws && ws.isOpen === false) return false;
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Reconexão suave: derruba socket atual e abre outro COM a mesma sessão em disco.
   * Não apaga credenciais — o admin não precisa escanear QR de novo.
   */
  private async softReconnectWithSession(tag: string): Promise<void> { // Membro interno da classe — só usado dentro dela
    if (!hasRegisteredSession()) return;
    console.log(`[whatsapp] soft reconnect (${tag})`); // Escreve mensagem no terminal para diagnóstico
    this.clearTimers(); // Acessa propriedade ou método desta instância da classe
    this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    this.connecting = false; // Acessa propriedade ou método desta instância da classe
    this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
    await this.connect(true);
  }
  // ---------------------------------------------------------------------------
  // Conexão principal Baileys
  // ---------------------------------------------------------------------------
  async connect(force = false): Promise<void> {
    if (!isWhatsAppEnabled()) return;
    if (this.connecting && !force) return;
    if (this.sock && this.status === "connected" && !force) return;
    if (force) {
      this.clearTimers(); // Acessa propriedade ou método desta instância da classe
      this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
      this.connecting = false; // Acessa propriedade ou método desta instância da classe
      this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
      // Só limpa pasta de sessão se ainda não pareou (primeiro QR)
      if (!hasRegisteredSession()) {
        clearSessionDir();
      }
    }
    this.connecting = true; // Acessa propriedade ou método desta instância da classe
    this.status = "connecting"; // Acessa propriedade ou método desta instância da classe
    this.errorMessage = null; // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState();
    this.startQrTimeout(); // Acessa propriedade ou método desta instância da classe
    try {
      ensureSessionDir();
      this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      const { version } = await fetchLatestWaWebVersion({});
      console.log("[whatsapp] versão WA Web:", version.join(".")); // Escreve mensagem no terminal para diagnóstico
      this.sock = makeWASocket({ // Acessa propriedade ou método desta instância da classe
        auth: state,
        version,
        logger: baileysLogger,
        browser: Browsers.macOS("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
      });
      this.sock.ev.on("creds.update", saveCreds); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.on("connection.update", (update) => void this.onConnectionUpdate(update)); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.on("messages.upsert", ({ messages, type }) => void this.onMessagesUpsert(messages, type)); // Acessa propriedade ou método desta instância da classe
    } catch (err) {
      this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
      const msg = err instanceof Error ? err.message : String(err);
      this.status = "error"; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = msg; // Acessa propriedade ou método desta instância da classe
      await this.updateDbState();
      if (hasRegisteredSession()) {
        this.scheduleReconnect(msg, true); // Acessa propriedade ou método desta instância da classe
      }
    } finally {
      this.connecting = false; // Acessa propriedade ou método desta instância da classe
    }
  }
  /** Eventos de conexão Baileys — QR, aberto, fechado. */
  private async onConnectionUpdate(update: { // Membro interno da classe — só usado dentro dela
    connection?: string;
    lastDisconnect?: { error?: unknown };
    qr?: string;
  }): Promise<void> {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
      this.qrCode = qr; // Acessa propriedade ou método desta instância da classe
      this.status = "qr"; // Acessa propriedade ou método desta instância da classe
      console.log("[whatsapp] QR gerado — escaneie em /admin/whatsapp"); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("info", "QR Code gerado — aguardando escaneamento no admin");
      await this.updateDbState();
    }
    if (connection === "open") {
      this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
      this.status = "connected"; // Acessa propriedade ou método desta instância da classe
      this.qrCode = null; // Acessa propriedade ou método desta instância da classe
      this.connectedAt = new Date(); // Acessa propriedade ou método desta instância da classe
      this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
      const me = this.sock?.user;
      if (me?.id) {
        this.phoneNumber = normalizePhone(me.id.split(":")[0]) ?? me.id.split("@")[0]; // Acessa propriedade ou método desta instância da classe
      }
      await this.updateDbState();
      await this.touchActivity();
      console.log("[whatsapp] conectado como", this.phoneNumber); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("info", `Conectado como +${this.phoneNumber ?? "?"}`, {
        phoneNumber: this.phoneNumber,
      });
    }
    if (connection === "close") {
      await this.onConnectionClosed(lastDisconnect);
    }
  }
  /** Trata queda de conexão — distingue logout, erro 405, restart pós-QR, etc. */
  private async onConnectionClosed(lastDisconnect?: { error?: unknown }): Promise<void> { // Membro interno da classe — só usado dentro dela
    this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
    const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;
    const paired = hasRegisteredSession();
    console.warn("[whatsapp] conexão fechada", { statusCode, loggedOut, paired }); // Escreve mensagem no terminal para diagnóstico
    appendBaileysLog("warn", "Conexão fechada", { statusCode, loggedOut, paired });
    this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe
    if (statusCode === DisconnectReason.restartRequired) {
      console.log("[whatsapp] restart pós-pareamento — reconectando…"); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("info", "Restart pós-pareamento — reconectando");
      await this.updateDbState();
      this.scheduleReconnect("restartRequired", true); // Acessa propriedade ou método desta instância da classe
      return;
    }
    if (loggedOut || !paired) {
      this.status = "disconnected"; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = loggedOut // Acessa propriedade ou método desta instância da classe
        ? "Sessão encerrada. Clique em Conectar WhatsApp e escaneie o QR."
        : statusCode === 405
          ? "WhatsApp recusou (405). Clique em Conectar WhatsApp."
          : `Conexão interrompida (${statusCode ?? "?"}). Clique em Conectar WhatsApp.`;
      await this.updateDbState();
      if (paired && !loggedOut && statusCode !== 405) {
        this.scheduleReconnect(`code ${statusCode ?? "unknown"}`, true); // Acessa propriedade ou método desta instância da classe
      }
      return;
    }
    this.status = "connecting"; // Acessa propriedade ou método desta instância da classe
    this.errorMessage = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState();
    this.scheduleReconnect(`code ${statusCode ?? "unknown"}`, true); // Acessa propriedade ou método desta instância da classe
  }
  /** Mensagens recebidas — repassa ao handler de IA/financeiro (somente notify + inbound real). */
  private async onMessagesUpsert(messages: WAMessage[], type: string): Promise<void> { // Membro interno da classe — só usado dentro dela
    if (type !== "notify") return;
    for (const m of messages) {
      if (m.key.fromMe) continue;
      await this.handleMessage(m);
    }
    await this.touchActivity();
  }
  /** Tipos de mensagem que NÃO são ação do usuário — ignorados sem resposta. */
  private isNonUserMessage(msgContent: NonNullable<WAMessage["message"]>): boolean { // Membro interno da classe — só usado dentro dela
    return Boolean(
      msgContent.protocolMessage ||
        msgContent.reactionMessage ||
        msgContent.ephemeralMessage ||
        msgContent.senderKeyDistributionMessage ||
        msgContent.pollUpdateMessage ||
        msgContent.keepInChatMessage ||
        msgContent.requestPhoneNumberMessage,
    );
  }
  /** Extrai conteúdo útil de mensagens encapsuladas (view once, ephemeral, etc.). */
  private unwrapUserMessage(msgContent: NonNullable<WAMessage["message"]>): NonNullable<WAMessage["message"]> | null { // Membro interno da classe — só usado dentro dela
    if (this.isNonUserMessage(msgContent)) return null;
    if (msgContent.ephemeralMessage?.message) {
      return this.unwrapUserMessage(msgContent.ephemeralMessage.message) ?? null;
    }
    if (msgContent.viewOnceMessage?.message) {
      return this.unwrapUserMessage(msgContent.viewOnceMessage.message) ?? null;
    }
    if (msgContent.viewOnceMessageV2?.message) {
      return this.unwrapUserMessage(msgContent.viewOnceMessageV2.message) ?? null;
    }
    return msgContent;
  }
  /** Mensagem antiga ou replay pós-conexão — não deve gerar resposta automática. */
  private isStaleInboundReplay(m: WAMessage): boolean { // Membro interno da classe — só usado dentro dela
    const tsSec = Number(m.messageTimestamp ?? 0);
    if (tsSec <= 0) return false;
    const msgAt = tsSec * 1000;
    const ageMs = Date.now() - msgAt;
    const maxAge = Number(process.env.WHATSAPP_MAX_MESSAGE_AGE_MS) || 4 * 60 * 1000;
    if (ageMs > maxAge) return true;
    // Fila de histórico logo após escanear QR ou reconectar
    if (this.connectedAt) {
      const openMs = this.connectedAt.getTime();
      const sinceOpen = Date.now() - openMs;
      if (sinceOpen < 20_000 && msgAt < openMs - 5_000) return true;
    }
    return false;
  }
  private async handleMessage(m: WAMessage): Promise<void> { // Membro interno da classe — só usado dentro dela
    if (!this.sock || !m.key.remoteJid) return;
    const remoteJid = m.key.remoteJid;
    if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) return;
    const resolved = resolveWhatsAppSender(m.key);
    if (!resolved?.phone) {
      appendBaileysLog("warn", "Telefone não resolvido — mensagem ignorada", {
        remoteJid,
        remoteJidAlt: m.key.remoteJidAlt ?? null,
      });
      return;
    }
    const { phone: remotePhone, replyJid } = resolved;
    const messageId = m.key.id ?? "";
    if (!messageId) return;
    // Evita reprocessar a mesma mensagem (replay na reconexão Baileys)
    if (await isMessageIdAlreadyProcessed(messageId)) {
      appendBaileysLog("debug", "Mensagem duplicada ignorada", { messageId, remotePhone });
      return;
    }
    // Ignora replays de histórico na reconexão — só responde mensagens recentes e reais
    if (this.isStaleInboundReplay(m)) {
      markMessageIdProcessed(messageId);
      appendBaileysLog("debug", "Replay/histórico ignorado — sem resposta automática", {
        messageId,
        remotePhone,
      });
      return;
    }
    try {
      const rawContent = m.message;
      if (!rawContent) return;
      const msgContent = this.unwrapUserMessage(rawContent);
      if (!msgContent) return;
      const base = { remotePhone, replyJid, messageId };
      if (msgContent.conversation || msgContent.extendedTextMessage?.text) {
        const text = msgContent.conversation ?? msgContent.extendedTextMessage?.text ?? "";
        await processIncomingMessage({ ...base, type: "text", text }, this);
        return;
      }
      if (msgContent.audioMessage) {
        const buffer = await downloadMediaMessage(m, "buffer", {}, {
          logger: undefined as never,
          reuploadRequest: this.sock.updateMediaMessage,
        });
        await processIncomingMessage(
          { // Início de um bloco de código
            ...base,
            type: "audio",
            mediaBuffer: buffer as Buffer,
            mediaMimeType: msgContent.audioMessage.mimetype ?? "audio/ogg",
          },
          this,
        );
        return;
      }
      if (msgContent.imageMessage) {
        const buffer = await downloadMediaMessage(m, "buffer", {}, {
          logger: undefined as never,
          reuploadRequest: this.sock.updateMediaMessage,
        });
        await processIncomingMessage(
          { // Início de um bloco de código
            ...base,
            type: "image",
            mediaBuffer: buffer as Buffer,
            mediaMimeType: msgContent.imageMessage.mimetype ?? "image/jpeg",
            text: msgContent.imageMessage.caption ?? "",
          },
          this,
        );
        return;
      }
      if (msgContent.documentMessage) {
        const buffer = await downloadMediaMessage(m, "buffer", {}, {
          logger: undefined as never,
          reuploadRequest: this.sock.updateMediaMessage,
        });
        await processIncomingMessage(
          { // Início de um bloco de código
            ...base,
            type: "document",
            mediaBuffer: buffer as Buffer,
            mediaMimeType: msgContent.documentMessage.mimetype ?? "application/octet-stream",
            fileName: msgContent.documentMessage.fileName ?? "document",
          },
          this,
        );
        return;
      }
      // Tipos não suportados — ignora silenciosamente (sem disparar resposta)
      appendBaileysLog("debug", "Tipo de mensagem ignorado (sem resposta)", {
        messageId,
        remotePhone,
        keys: Object.keys(msgContent),
      });
    } catch (err) {
      console.error("[whatsapp] erro ao processar mensagem:", err); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("error", "Erro ao processar mensagem", {
        error: err instanceof Error ? err.message : String(err),
        remoteJid,
        remotePhone,
      });
    }
  }
  /** Envia texto — SOMENTE se houver inbound em processamento (reply autorizado). */
  async sendToChat(chatJid: string, text: string): Promise<void> {
    if (!this.sock || this.status !== "connected") {
      throw new Error("WhatsApp not connected"); // Sinaliza erro e interrompe o fluxo normal
    }
    if (!isReplyAuthorized(chatJid)) {
      console.warn("[whatsapp] envio bloqueado — nenhuma mensagem inbound em processamento:", chatJid); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("warn", "Envio bloqueado — sem inbound correspondente", { chatJid });
      return;
    }
    await this.sock.sendMessage(chatJid, { text });
  }
  async sendText(phone: string, text: string): Promise<void> {
    const normalized = normalizePhone(phone) ?? phone.replace(/\D/g, "");
    await this.sendToChat(`${normalized}@s.whatsapp.net`, text);
  }
  /** Logout admin — para keep-alive e apaga sessão. */
  async disconnect(): Promise<void> {
    getWhatsAppKeepAlive().stop();
    this.clearTimers(); // Acessa propriedade ou método desta instância da classe
    if (this.sock) {
      await this.sock.logout();
      this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    }
    this.status = "disconnected"; // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe
    this.phoneNumber = null; // Acessa propriedade ou método desta instância da classe
    this.connectedAt = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState();
  }
  /** Aguardando admin escanear QR pela primeira vez. */
  async markAwaitingPairing(): Promise<void> {
    this.clearTimers(); // Acessa propriedade ou método desta instância da classe
    this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    this.connecting = false; // Acessa propriedade ou método desta instância da classe
    this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
    this.status = "disconnected"; // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe
    this.errorMessage = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState();
  }
  /** Desbloqueia status "connecting" travado no banco após crash do servidor. */
  async recoverStaleConnecting(maxAgeMs = 30_000): Promise<boolean> {
    const [row] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main"));
    if (!row) return false;
    if (row.status !== "connecting" && row.status !== "qr") return false;
    if (row.qrCode) return false;
    if (Date.now() - row.updatedAt.getTime() < maxAgeMs) return false;
    console.warn("[whatsapp] recuperando estado travado"); // Escreve mensagem no terminal para diagnóstico
    await this.markAwaitingPairing();
    return true;
  }
  // ---------------------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------------------
  private clearTimers(): void { // Membro interno da classe — só usado dentro dela
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null; // Acessa propriedade ou método desta instância da classe
    }
    this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
  }
  private clearQrTimeout(): void { // Membro interno da classe — só usado dentro dela
    if (this.qrTimeoutTimer) {
      clearTimeout(this.qrTimeoutTimer);
      this.qrTimeoutTimer = null; // Acessa propriedade ou método desta instância da classe
    }
  }
  private startQrTimeout(): void { // Membro interno da classe — só usado dentro dela
    this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
    this.qrTimeoutTimer = setTimeout(() => { // Acessa propriedade ou método desta instância da classe
      if (this.status === "connecting" && !this.qrCode) {
        this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
        this.connecting = false; // Acessa propriedade ou método desta instância da classe
        this.status = "error"; // Acessa propriedade ou método desta instância da classe
        this.errorMessage = "QR não gerado a tempo. Verifique internet e clique em Conectar WhatsApp."; // Acessa propriedade ou método desta instância da classe
        void this.updateDbState(); // Dispara tarefa em segundo plano sem esperar terminar
      }
    }, QR_WAIT_TIMEOUT_MS);
  }
  private teardownSocket(): void { // Membro interno da classe — só usado dentro dela
    if (this.sock) {
      this.sock.ev.removeAllListeners("connection.update"); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.removeAllListeners("creds.update"); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.removeAllListeners("messages.upsert"); // Acessa propriedade ou método desta instância da classe
      this.sock.end(undefined); // Acessa propriedade ou método desta instância da classe
      this.sock = null; // Acessa propriedade ou método desta instância da classe
    }
  }
  /** Reconexão rápida com backoff — usada após quedas inesperadas. */
  private scheduleReconnect(reason?: string, allowWhenUnpaired = true): void { // Membro interno da classe — só usado dentro dela
    if (this.reconnectTimer) return;
    if (!allowWhenUnpaired && !hasRegisteredSession()) return;
    if (!hasRegisteredSession() && this.reconnectAttempts >= 2) {
      this.status = "error"; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = "Falha ao parear. Clique em Conectar WhatsApp."; // Acessa propriedade ou método desta instância da classe
      void this.updateDbState(); // Dispara tarefa em segundo plano sem esperar terminar
      return;
    }
    this.reconnectAttempts++; // Acessa propriedade ou método desta instância da classe
    const delayMs = Math.min(3000 * this.reconnectAttempts, 60_000);
    console.log(`[whatsapp] reconectando em ${delayMs / 1000}s${reason ? ` (${reason})` : ""}`); // Escreve mensagem no terminal para diagnóstico
    this.reconnectTimer = setTimeout(() => { // Acessa propriedade ou método desta instância da classe
      this.reconnectTimer = null; // Acessa propriedade ou método desta instância da classe
      void this.connect(false); // Dispara tarefa em segundo plano sem esperar terminar
    }, delayMs);
  }
}

// --- Singleton — uma instância por processo Node ---

let singleton: WhatsAppClient | null = null;

export function getWhatsAppClient(): WhatsAppClient { // Função exportada — pode ser usada em outros arquivos
  if (!singleton) {
    singleton = new WhatsAppClient();
  }
  return singleton;
}

export function isWhatsAppEnabled(): boolean { // Função exportada — pode ser usada em outros arquivos
  return process.env.ENABLE_WHATSAPP !== "false";
}

/**
 * Boot do módulo WhatsApp — chamado uma vez em index.ts ao subir o servidor.
 * Inicia keep-alive de 30 min independente de já estar pareado.
 */
export async function initWhatsApp(): Promise<void> {
  if (!isWhatsAppEnabled()) {
    console.log("[whatsapp] desabilitado (ENABLE_WHATSAPP=false)"); // Escreve mensagem no terminal para diagnóstico
    return;
  }
  const client = getWhatsAppClient();
  await client.loadStateFromDb();
  console.log(`[whatsapp] pasta de sessão: ${SESSION_DIR}`); // Escreve mensagem no terminal para diagnóstico
  if (hasRegisteredSession()) {
    console.log("[whatsapp] sessão encontrada — reconectando…"); // Escreve mensagem no terminal para diagnóstico
    await client.connect(false);
  } else {
    console.log("[whatsapp] aguardando pareamento em /admin/whatsapp"); // Escreve mensagem no terminal para diagnóstico
    await client.markAwaitingPairing();
  }
  getWhatsAppKeepAlive().start(client);
}
