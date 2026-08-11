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
import { normalizePhone } from "../src/utils/phone.js"; // Formato 55DDD9NUMERO
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
        [key: string]: unknown;
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
  private sock: WASocket | null = null;
  private qrCode: string | null = null;
  private status: ConnectionState["status"] = "disconnected";
  private phoneNumber: string | null = null;
  private connectedAt: Date | null = null;
  private errorMessage: string | null = null;

  // --- Controle de reconexão ---
  private reconnectAttempts = 0;
  private connecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private qrTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private keepAliveBusy = false;

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
      .onConflictDoUpdate({
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
      this.status = row.status as ConnectionState["status"];
      this.qrCode = row.qrCode;
      this.phoneNumber = row.phoneNumber;
      this.connectedAt = row.connectedAt;
      this.errorMessage = row.errorMessage;
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

    this.keepAliveBusy = true;
    try {
      const healthy = this.status === "connected" && (await this.probeConnectionHealth());

      if (healthy) {
        await this.touchActivity();
        console.log(`[whatsapp-keepalive] refresh preventivo (${reason})`);
        await this.softReconnectWithSession("keepalive-preventive");
        return "refreshed";
      }

      if (this.status === "connected" && !healthy) {
        console.log(`[whatsapp-keepalive] socket frágil — reconectando (${reason})`);
        await this.softReconnectWithSession("keepalive-unhealthy");
        return "reconnected";
      }

      if (this.status === "disconnected" || this.status === "error" || this.status === "connecting") {
        console.log(`[whatsapp-keepalive] offline (${this.status}) — reconectando (${reason})`);
        this.reconnectAttempts = 0;
        await this.connect(false);
        return "reconnected";
      }

      return "healthy";
    } finally {
      this.keepAliveBusy = false;
    }
  }

  /** Verifica se o socket Baileys ainda responde (usuário logado + websocket aberto). */
  private async probeConnectionHealth(): Promise<boolean> {
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
  private async softReconnectWithSession(tag: string): Promise<void> {
    if (!hasRegisteredSession()) return;
    console.log(`[whatsapp] soft reconnect (${tag})`);
    this.clearTimers();
    this.teardownSocket();
    this.connecting = false;
    this.reconnectAttempts = 0;
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
      this.clearTimers();
      this.reconnectAttempts = 0;
      this.connecting = false;
      this.teardownSocket();
      // Só limpa pasta de sessão se ainda não pareou (primeiro QR)
      if (!hasRegisteredSession()) {
        clearSessionDir();
      }
    }

    this.connecting = true;
    this.status = "connecting";
    this.errorMessage = null;
    this.qrCode = null;
    await this.updateDbState();
    this.startQrTimeout();

    try {
      ensureSessionDir();
      this.teardownSocket();

      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      const { version } = await fetchLatestWaWebVersion({});
      console.log("[whatsapp] versão WA Web:", version.join("."));

      this.sock = makeWASocket({
        auth: state,
        version,
        logger: baileysLogger,
        browser: Browsers.macOS("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 25_000,
      });

      this.sock.ev.on("creds.update", saveCreds);
      this.sock.ev.on("connection.update", (update) => void this.onConnectionUpdate(update));
      this.sock.ev.on("messages.upsert", ({ messages, type }) => void this.onMessagesUpsert(messages, type));
    } catch (err) {
      this.clearQrTimeout();
      const msg = err instanceof Error ? err.message : String(err);
      this.status = "error";
      this.errorMessage = msg;
      await this.updateDbState();
      if (hasRegisteredSession()) {
        this.scheduleReconnect(msg, true);
      }
    } finally {
      this.connecting = false;
    }
  }

  /** Eventos de conexão Baileys — QR, aberto, fechado. */
  private async onConnectionUpdate(update: {
    connection?: string;
    lastDisconnect?: { error?: unknown };
    qr?: string;
  }): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.clearQrTimeout();
      this.qrCode = qr;
      this.status = "qr";
      console.log("[whatsapp] QR gerado — escaneie em /admin/whatsapp");
      appendBaileysLog("info", "QR Code gerado — aguardando escaneamento no admin");
      await this.updateDbState();
    }

    if (connection === "open") {
      this.clearQrTimeout();
      this.status = "connected";
      this.qrCode = null;
      this.connectedAt = new Date();
      this.reconnectAttempts = 0;
      const me = this.sock?.user;
      if (me?.id) {
        this.phoneNumber = normalizePhone(me.id.split(":")[0]) ?? me.id.split("@")[0];
      }
      await this.updateDbState();
      await this.touchActivity();
      console.log("[whatsapp] conectado como", this.phoneNumber);
      appendBaileysLog("info", `Conectado como +${this.phoneNumber ?? "?"}`, {
        phoneNumber: this.phoneNumber,
      });
    }

    if (connection === "close") {
      await this.onConnectionClosed(lastDisconnect);
    }
  }

  /** Trata queda de conexão — distingue logout, erro 405, restart pós-QR, etc. */
  private async onConnectionClosed(lastDisconnect?: { error?: unknown }): Promise<void> {
    this.clearQrTimeout();
    const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;
    const paired = hasRegisteredSession();

    console.warn("[whatsapp] conexão fechada", { statusCode, loggedOut, paired });
    appendBaileysLog("warn", "Conexão fechada", { statusCode, loggedOut, paired });

    this.teardownSocket();
    this.qrCode = null;

    if (statusCode === DisconnectReason.restartRequired) {
      console.log("[whatsapp] restart pós-pareamento — reconectando…");
      appendBaileysLog("info", "Restart pós-pareamento — reconectando");
      await this.updateDbState();
      this.scheduleReconnect("restartRequired", true);
      return;
    }

    if (loggedOut || !paired) {
      this.status = "disconnected";
      this.errorMessage = loggedOut
        ? "Sessão encerrada. Clique em Conectar WhatsApp e escaneie o QR."
        : statusCode === 405
          ? "WhatsApp recusou (405). Clique em Conectar WhatsApp."
          : `Conexão interrompida (${statusCode ?? "?"}). Clique em Conectar WhatsApp.`;
      await this.updateDbState();
      if (paired && !loggedOut && statusCode !== 405) {
        this.scheduleReconnect(`code ${statusCode ?? "unknown"}`, true);
      }
      return;
    }

    this.status = "connecting";
    this.errorMessage = null;
    await this.updateDbState();
    this.scheduleReconnect(`code ${statusCode ?? "unknown"}`, true);
  }

  /** Mensagens recebidas — repassa ao handler de IA/financeiro (somente notify + inbound real). */
  private async onMessagesUpsert(messages: WAMessage[], type: string): Promise<void> {
    if (type !== "notify") return;
    for (const m of messages) {
      if (m.key.fromMe) continue;
      await this.handleMessage(m);
    }
    await this.touchActivity();
  }

  /** Tipos de mensagem que NÃO são ação do usuário — ignorados sem resposta. */
  private isNonUserMessage(msgContent: NonNullable<WAMessage["message"]>): boolean {
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
  private unwrapUserMessage(msgContent: NonNullable<WAMessage["message"]>): NonNullable<WAMessage["message"]> | null {
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
  private isStaleInboundReplay(m: WAMessage): boolean {
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

  private async handleMessage(m: WAMessage): Promise<void> {
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
          {
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
          {
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
          {
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
      console.error("[whatsapp] erro ao processar mensagem:", err);
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
      throw new Error("WhatsApp not connected");
    }
    if (!isReplyAuthorized(chatJid)) {
      console.warn("[whatsapp] envio bloqueado — nenhuma mensagem inbound em processamento:", chatJid);
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
    this.clearTimers();
    if (this.sock) {
      await this.sock.logout();
      this.teardownSocket();
    }
    this.status = "disconnected";
    this.qrCode = null;
    this.phoneNumber = null;
    this.connectedAt = null;
    await this.updateDbState();
  }

  /** Aguardando admin escanear QR pela primeira vez. */
  async markAwaitingPairing(): Promise<void> {
    this.clearTimers();
    this.teardownSocket();
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.status = "disconnected";
    this.qrCode = null;
    this.errorMessage = null;
    await this.updateDbState();
  }

  /** Desbloqueia status "connecting" travado no banco após crash do servidor. */
  async recoverStaleConnecting(maxAgeMs = 30_000): Promise<boolean> {
    const [row] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main"));
    if (!row) return false;
    if (row.status !== "connecting" && row.status !== "qr") return false;
    if (row.qrCode) return false;
    if (Date.now() - row.updatedAt.getTime() < maxAgeMs) return false;
    console.warn("[whatsapp] recuperando estado travado");
    await this.markAwaitingPairing();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------------------

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearQrTimeout();
  }

  private clearQrTimeout(): void {
    if (this.qrTimeoutTimer) {
      clearTimeout(this.qrTimeoutTimer);
      this.qrTimeoutTimer = null;
    }
  }

  private startQrTimeout(): void {
    this.clearQrTimeout();
    this.qrTimeoutTimer = setTimeout(() => {
      if (this.status === "connecting" && !this.qrCode) {
        this.teardownSocket();
        this.connecting = false;
        this.status = "error";
        this.errorMessage = "QR não gerado a tempo. Verifique internet e clique em Conectar WhatsApp.";
        void this.updateDbState();
      }
    }, QR_WAIT_TIMEOUT_MS);
  }

  private teardownSocket(): void {
    if (this.sock) {
      this.sock.ev.removeAllListeners("connection.update");
      this.sock.ev.removeAllListeners("creds.update");
      this.sock.ev.removeAllListeners("messages.upsert");
      this.sock.end(undefined);
      this.sock = null;
    }
  }

  /** Reconexão rápida com backoff — usada após quedas inesperadas. */
  private scheduleReconnect(reason?: string, allowWhenUnpaired = true): void {
    if (this.reconnectTimer) return;
    if (!allowWhenUnpaired && !hasRegisteredSession()) return;
    if (!hasRegisteredSession() && this.reconnectAttempts >= 2) {
      this.status = "error";
      this.errorMessage = "Falha ao parear. Clique em Conectar WhatsApp.";
      void this.updateDbState();
      return;
    }

    this.reconnectAttempts++;
    const delayMs = Math.min(3000 * this.reconnectAttempts, 60_000);
    console.log(`[whatsapp] reconectando em ${delayMs / 1000}s${reason ? ` (${reason})` : ""}`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect(false);
    }, delayMs);
  }
}

// --- Singleton — uma instância por processo Node ---

let singleton: WhatsAppClient | null = null;

export function getWhatsAppClient(): WhatsAppClient {
  if (!singleton) {
    singleton = new WhatsAppClient();
  }
  return singleton;
}

export function isWhatsAppEnabled(): boolean {
  return process.env.ENABLE_WHATSAPP !== "false";
}

/**
 * Boot do módulo WhatsApp — chamado uma vez em index.ts ao subir o servidor.
 * Inicia keep-alive de 30 min independente de já estar pareado.
 */
export async function initWhatsApp(): Promise<void> {
  if (!isWhatsAppEnabled()) {
    console.log("[whatsapp] desabilitado (ENABLE_WHATSAPP=false)");
    return;
  }

  const client = getWhatsAppClient();
  await client.loadStateFromDb();

  console.log(`[whatsapp] pasta de sessão: ${SESSION_DIR}`);

  if (hasRegisteredSession()) {
    console.log("[whatsapp] sessão encontrada — reconectando…");
    await client.connect(false);
  } else {
    console.log("[whatsapp] aguardando pareamento em /admin/whatsapp");
    await client.markAwaitingPairing();
  }

  getWhatsAppKeepAlive().start(client);
}
