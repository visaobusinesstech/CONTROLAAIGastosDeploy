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
import makeWASocket, { // Importa código de outro arquivo para usar aqui
  DisconnectReason, // Códigos de desconexão (logout, restart, etc.)
  Browsers, // User-agent simulado (macOS Chrome)
  fetchLatestWaWebVersion, // Versão compatível do protocolo WA Web
  downloadMediaMessage, // Baixa áudio/imagem/documento
  useMultiFileAuthState, // Persiste credenciais em arquivos
  type WASocket, // Tipo do socket Baileys
  type WAMessage, // Tipo de mensagem recebida
} from "@whiskeysockets/baileys"; // Fecha bloco iniciado anteriormente
import { db } from "../src/db/index.js"; // Cliente PostgreSQL
import { whatsappConnection } from "../src/db/schema.js"; // Estado singleton da conexão
import { processIncomingMessage } from "./message-handler.js"; // Pipeline IA/financeiro
import { resolveWhatsAppSender } from "./jid-resolver.js"; // Telefone + JID (LID/PN)
import { normalizePhone } from "../src/utils/phone.js"; // Formato 55DDD9NUMERO
import { // Importa código de outro arquivo para usar aqui
  SESSION_DIR, // Pasta .baileys-session
  hasRegisteredSession, // true após escanear QR
  clearSessionDir, // Apaga sessão no logout
  ensureSessionDir, // Cria pasta se não existir
} from "./session-utils.js"; // Fecha bloco iniciado anteriormente
import { getWhatsAppKeepAlive, type KeepAliveStats } from "./keep-alive.js"; // Timer 30 min
import { appendBaileysLog } from "./baileys-log.js"; // Buffer logs admin
import { isReplyAuthorized } from "./inbound-reply-guard.js"; // Bloqueia envio sem inbound
import { isMessageIdAlreadyProcessed, markMessageIdProcessed } from "./message-dedup.js"; // Evita replay

const baileysLogStream = new Writable({ // Guarda um valor que não muda durante a execução deste trecho
  write(chunk, _enc, cb) { // Instrução do programa — parte da lógica deste arquivo
    try { // Tenta executar código que pode falhar
      const row = JSON.parse(chunk.toString()) as { // Guarda um valor que não muda durante a execução deste trecho
        level: number; // Instrução do programa — parte da lógica deste arquivo
        msg?: string; // Instrução do programa — parte da lógica deste arquivo
        [key: string]: unknown; // Abre lista de valores
      }; // Fecha bloco de objeto ou estrutura
      const levelMap: Record<number, "debug" | "info" | "warn" | "error"> = { // Guarda um valor que não muda durante a execução deste trecho
        10: "debug", // Instrução do programa — parte da lógica deste arquivo
        20: "debug", // Instrução do programa — parte da lógica deste arquivo
        30: "info", // Instrução do programa — parte da lógica deste arquivo
        40: "warn", // Instrução do programa — parte da lógica deste arquivo
        50: "error", // Instrução do programa — parte da lógica deste arquivo
        60: "error", // Instrução do programa — parte da lógica deste arquivo
      }; // Fecha bloco de objeto ou estrutura
      const level = levelMap[row.level] ?? "info"; // Guarda um valor que não muda durante a execução deste trecho
      const { msg, level: _l, time, pid, hostname, v, ...rest } = row; // Guarda um valor que não muda durante a execução deste trecho
      appendBaileysLog(level, String(msg ?? "evento Baileys"), Object.keys(rest).length ? rest : undefined); // Instrução do programa — parte da lógica deste arquivo
    } catch { // Fecha bloco iniciado anteriormente
      appendBaileysLog("info", chunk.toString().trim()); // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)
    cb(); // Instrução do programa — parte da lógica deste arquivo
  }, // Fecha um bloco de código (if, função, objeto, etc.)
}); // Fecha chamada de função ou método

/** Logger Baileys — captura eventos internos para o painel admin. */
const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL ?? "warn" }, baileysLogStream); // Guarda um valor que não muda durante a execução deste trecho

/** Tempo máximo aguardando QR antes de mostrar erro ao admin. */
const QR_WAIT_TIMEOUT_MS = 45_000; // Guarda um valor que não muda durante a execução deste trecho

/** Estado público da conexão — espelhado no banco e na API /admin/whatsapp/status. */
export type ConnectionState = { // Exporta um tipo de dados para outros arquivos usarem
  status: "disconnected" | "connecting" | "qr" | "connected" | "error"; // Instrução do programa — parte da lógica deste arquivo
  qrCode: string | null; // Instrução do programa — parte da lógica deste arquivo
  phoneNumber: string | null; // Instrução do programa — parte da lógica deste arquivo
  lastActivityAt: string | null; // Instrução do programa — parte da lógica deste arquivo
  connectedAt: string | null; // Instrução do programa — parte da lógica deste arquivo
  errorMessage: string | null; // Instrução do programa — parte da lógica deste arquivo
}; // Fecha bloco de objeto ou estrutura

export type KeepAliveResult = "skipped" | "healthy" | "refreshed" | "reconnected"; // Exporta um tipo de dados para outros arquivos usarem

export class WhatsAppClient { // Instrução do programa — parte da lógica deste arquivo
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

  getState(): ConnectionState { // Instrução do programa — parte da lógica deste arquivo
    return { // Devolve um valor e encerra a função aqui
      status: this.status, // Instrução do programa — parte da lógica deste arquivo
      qrCode: this.qrCode, // Instrução do programa — parte da lógica deste arquivo
      phoneNumber: this.phoneNumber, // Instrução do programa — parte da lógica deste arquivo
      lastActivityAt: null, // Instrução do programa — parte da lógica deste arquivo
      connectedAt: this.connectedAt?.toISOString() ?? null, // Instrução do programa — parte da lógica deste arquivo
      errorMessage: this.errorMessage, // Instrução do programa — parte da lógica deste arquivo
    }; // Fecha bloco de objeto ou estrutura
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Mescla memória + banco — usado pela rota GET /status (QR pode estar só no banco). */
  async getMergedState(): Promise<ConnectionState> { // Instrução do programa — parte da lógica deste arquivo
    const memory = this.getState(); // Guarda um valor que não muda durante a execução deste trecho
    const [dbRow] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main")); // Guarda um valor que não muda durante a execução deste trecho

    const qrCode = memory.qrCode ?? dbRow?.qrCode ?? null; // Guarda um valor que não muda durante a execução deste trecho
    let status = memory.status; // Variável que pode mudar de valor conforme o programa roda
    if (memory.status === "connected") { // Só executa o bloco abaixo se esta condição for verdadeira
      status = "connected"; // Atribui ou calcula um valor para usar adiante
    } else if (qrCode) { // Fecha bloco iniciado anteriormente
      status = "qr"; // Atribui ou calcula um valor para usar adiante
    } else if (memory.status === "disconnected" && dbRow?.status) { // Fecha bloco iniciado anteriormente
      status = dbRow.status as ConnectionState["status"]; // Atribui ou calcula um valor para usar adiante
    } // Fecha um bloco de código (if, função, objeto, etc.)

    return { // Devolve um valor e encerra a função aqui
      status, // Instrução do programa — parte da lógica deste arquivo
      qrCode, // Instrução do programa — parte da lógica deste arquivo
      phoneNumber: memory.phoneNumber ?? dbRow?.phoneNumber ?? null, // Instrução do programa — parte da lógica deste arquivo
      lastActivityAt: dbRow?.lastActivityAt?.toISOString() ?? null, // Instrução do programa — parte da lógica deste arquivo
      connectedAt: memory.connectedAt ?? dbRow?.connectedAt?.toISOString() ?? null, // Instrução do programa — parte da lógica deste arquivo
      errorMessage: memory.errorMessage ?? dbRow?.errorMessage ?? null, // Instrução do programa — parte da lógica deste arquivo
    }; // Fecha bloco de objeto ou estrutura
  } // Fecha um bloco de código (if, função, objeto, etc.)

  getKeepAliveStats(): KeepAliveStats { // Instrução do programa — parte da lógica deste arquivo
    return getWhatsAppKeepAlive().getStats(); // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)

  // ---------------------------------------------------------------------------
  // Persistência no PostgreSQL
  // ---------------------------------------------------------------------------

  async updateDbState(): Promise<void> { // Instrução do programa — parte da lógica deste arquivo
    await db // Operação no banco de dados
      .insert(whatsappConnection) // Instrução do programa — parte da lógica deste arquivo
      .values({ // Informa os valores a inserir na tabela
        id: "main", // Instrução do programa — parte da lógica deste arquivo
        status: this.status, // Instrução do programa — parte da lógica deste arquivo
        qrCode: this.qrCode, // Instrução do programa — parte da lógica deste arquivo
        phoneNumber: this.phoneNumber, // Instrução do programa — parte da lógica deste arquivo
        connectedAt: this.connectedAt, // Instrução do programa — parte da lógica deste arquivo
        errorMessage: this.errorMessage, // Instrução do programa — parte da lógica deste arquivo
        updatedAt: new Date(), // Instrução do programa — parte da lógica deste arquivo
      }) // Fecha bloco iniciado anteriormente
      .onConflictDoUpdate({ // Se já existir, atualiza em vez de dar erro de duplicado
        target: whatsappConnection.id, // Instrução do programa — parte da lógica deste arquivo
        set: { // Instrução do programa — parte da lógica deste arquivo
          status: this.status, // Instrução do programa — parte da lógica deste arquivo
          qrCode: this.qrCode, // Instrução do programa — parte da lógica deste arquivo
          phoneNumber: this.phoneNumber, // Instrução do programa — parte da lógica deste arquivo
          connectedAt: this.connectedAt, // Instrução do programa — parte da lógica deste arquivo
          errorMessage: this.errorMessage, // Instrução do programa — parte da lógica deste arquivo
          updatedAt: new Date(), // Instrução do programa — parte da lógica deste arquivo
        }, // Fecha um bloco de código (if, função, objeto, etc.)
      }); // Fecha chamada de função ou método
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Atualiza lastActivityAt — chamado após mensagens e ciclos de keep-alive. */
  async touchActivity(): Promise<void> { // Instrução do programa — parte da lógica deste arquivo
    await db // Operação no banco de dados
      .update(whatsappConnection) // Instrução do programa — parte da lógica deste arquivo
      .set({ lastActivityAt: new Date(), updatedAt: new Date() }) // Define quais colunas serão alteradas no UPDATE
      .where(eq(whatsappConnection.id, "main")); // Filtra quais linhas do banco entram na consulta
  } // Fecha um bloco de código (if, função, objeto, etc.)

  async loadStateFromDb(): Promise<void> { // Instrução do programa — parte da lógica deste arquivo
    const [row] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main")); // Guarda um valor que não muda durante a execução deste trecho
    if (row) { // Só executa o bloco abaixo se esta condição for verdadeira
      this.status = row.status as ConnectionState["status"]; // Acessa propriedade ou método desta instância da classe
      this.qrCode = row.qrCode; // Acessa propriedade ou método desta instância da classe
      this.phoneNumber = row.phoneNumber; // Acessa propriedade ou método desta instância da classe
      this.connectedAt = row.connectedAt; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = row.errorMessage; // Acessa propriedade ou método desta instância da classe
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

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
  async runKeepAliveFallback(reason: string): Promise<KeepAliveResult> { // Instrução do programa — parte da lógica deste arquivo
    if (!isWhatsAppEnabled()) return "skipped"; // Só executa o bloco abaixo se esta condição for verdadeira
    if (!hasRegisteredSession()) return "skipped"; // Só executa o bloco abaixo se esta condição for verdadeira
    if (this.keepAliveBusy || this.connecting) return "skipped"; // Só executa o bloco abaixo se esta condição for verdadeira
    if (this.status === "qr") return "skipped"; // Só executa o bloco abaixo se esta condição for verdadeira
    if (this.status === "connecting" && !hasRegisteredSession()) return "skipped"; // Só executa o bloco abaixo se esta condição for verdadeira

    this.keepAliveBusy = true; // Acessa propriedade ou método desta instância da classe
    try { // Tenta executar código que pode falhar
      const healthy = this.status === "connected" && (await this.probeConnectionHealth()); // Guarda um valor que não muda durante a execução deste trecho

      if (healthy) { // Só executa o bloco abaixo se esta condição for verdadeira
        await this.touchActivity(); // Espera terminar uma tarefa assíncrona antes de continuar
        console.log(`[whatsapp-keepalive] refresh preventivo (${reason})`); // Escreve mensagem no terminal para diagnóstico
        await this.softReconnectWithSession("keepalive-preventive"); // Espera terminar uma tarefa assíncrona antes de continuar
        return "refreshed"; // Devolve um valor e encerra a função aqui
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (this.status === "connected" && !healthy) { // Só executa o bloco abaixo se esta condição for verdadeira
        console.log(`[whatsapp-keepalive] socket frágil — reconectando (${reason})`); // Escreve mensagem no terminal para diagnóstico
        await this.softReconnectWithSession("keepalive-unhealthy"); // Espera terminar uma tarefa assíncrona antes de continuar
        return "reconnected"; // Devolve um valor e encerra a função aqui
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (this.status === "disconnected" || this.status === "error" || this.status === "connecting") { // Só executa o bloco abaixo se esta condição for verdadeira
        console.log(`[whatsapp-keepalive] offline (${this.status}) — reconectando (${reason})`); // Escreve mensagem no terminal para diagnóstico
        this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
        await this.connect(false); // Espera terminar uma tarefa assíncrona antes de continuar
        return "reconnected"; // Devolve um valor e encerra a função aqui
      } // Fecha um bloco de código (if, função, objeto, etc.)

      return "healthy"; // Devolve um valor e encerra a função aqui
    } finally { // Fecha bloco iniciado anteriormente
      this.keepAliveBusy = false; // Acessa propriedade ou método desta instância da classe
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Verifica se o socket Baileys ainda responde (usuário logado + websocket aberto). */
  private async probeConnectionHealth(): Promise<boolean> { // Membro interno da classe — só usado dentro dela
    if (!this.sock || this.status !== "connected") return false; // Só executa o bloco abaixo se esta condição for verdadeira
    try { // Tenta executar código que pode falhar
      if (!this.sock.user?.id) return false; // Só executa o bloco abaixo se esta condição for verdadeira
      const ws = (this.sock as { ws?: { isOpen?: boolean } }).ws; // Guarda um valor que não muda durante a execução deste trecho
      if (ws && ws.isOpen === false) return false; // Só executa o bloco abaixo se esta condição for verdadeira
      return true; // Devolve um valor e encerra a função aqui
    } catch { // Fecha bloco iniciado anteriormente
      return false; // Devolve um valor e encerra a função aqui
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /**
   * Reconexão suave: derruba socket atual e abre outro COM a mesma sessão em disco.
   * Não apaga credenciais — o admin não precisa escanear QR de novo.
   */
  private async softReconnectWithSession(tag: string): Promise<void> { // Membro interno da classe — só usado dentro dela
    if (!hasRegisteredSession()) return; // Só executa o bloco abaixo se esta condição for verdadeira
    console.log(`[whatsapp] soft reconnect (${tag})`); // Escreve mensagem no terminal para diagnóstico
    this.clearTimers(); // Acessa propriedade ou método desta instância da classe
    this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    this.connecting = false; // Acessa propriedade ou método desta instância da classe
    this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
    await this.connect(true); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  // ---------------------------------------------------------------------------
  // Conexão principal Baileys
  // ---------------------------------------------------------------------------

  async connect(force = false): Promise<void> { // Atribui ou calcula um valor para usar adiante
    if (!isWhatsAppEnabled()) return; // Só executa o bloco abaixo se esta condição for verdadeira
    if (this.connecting && !force) return; // Só executa o bloco abaixo se esta condição for verdadeira
    if (this.sock && this.status === "connected" && !force) return; // Só executa o bloco abaixo se esta condição for verdadeira

    if (force) { // Só executa o bloco abaixo se esta condição for verdadeira
      this.clearTimers(); // Acessa propriedade ou método desta instância da classe
      this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
      this.connecting = false; // Acessa propriedade ou método desta instância da classe
      this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
      // Só limpa pasta de sessão se ainda não pareou (primeiro QR)
      if (!hasRegisteredSession()) { // Só executa o bloco abaixo se esta condição for verdadeira
        clearSessionDir(); // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)
    } // Fecha um bloco de código (if, função, objeto, etc.)

    this.connecting = true; // Acessa propriedade ou método desta instância da classe
    this.status = "connecting"; // Acessa propriedade ou método desta instância da classe
    this.errorMessage = null; // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
    this.startQrTimeout(); // Acessa propriedade ou método desta instância da classe

    try { // Tenta executar código que pode falhar
      ensureSessionDir(); // Instrução do programa — parte da lógica deste arquivo
      this.teardownSocket(); // Acessa propriedade ou método desta instância da classe

      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR); // Guarda um valor que não muda durante a execução deste trecho
      const { version } = await fetchLatestWaWebVersion({}); // Guarda um valor que não muda durante a execução deste trecho
      console.log("[whatsapp] versão WA Web:", version.join(".")); // Escreve mensagem no terminal para diagnóstico

      this.sock = makeWASocket({ // Acessa propriedade ou método desta instância da classe
        auth: state, // Instrução do programa — parte da lógica deste arquivo
        version, // Instrução do programa — parte da lógica deste arquivo
        logger: baileysLogger, // Instrução do programa — parte da lógica deste arquivo
        browser: Browsers.macOS("Chrome"), // Instrução do programa — parte da lógica deste arquivo
        syncFullHistory: false, // Instrução do programa — parte da lógica deste arquivo
        markOnlineOnConnect: false, // Instrução do programa — parte da lógica deste arquivo
        connectTimeoutMs: 60_000, // Instrução do programa — parte da lógica deste arquivo
        keepAliveIntervalMs: 25_000, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método

      this.sock.ev.on("creds.update", saveCreds); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.on("connection.update", (update) => void this.onConnectionUpdate(update)); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.on("messages.upsert", ({ messages, type }) => void this.onMessagesUpsert(messages, type)); // Acessa propriedade ou método desta instância da classe
    } catch (err) { // Fecha bloco iniciado anteriormente
      this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
      const msg = err instanceof Error ? err.message : String(err); // Guarda um valor que não muda durante a execução deste trecho
      this.status = "error"; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = msg; // Acessa propriedade ou método desta instância da classe
      await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
      if (hasRegisteredSession()) { // Só executa o bloco abaixo se esta condição for verdadeira
        this.scheduleReconnect(msg, true); // Acessa propriedade ou método desta instância da classe
      } // Fecha um bloco de código (if, função, objeto, etc.)
    } finally { // Fecha bloco iniciado anteriormente
      this.connecting = false; // Acessa propriedade ou método desta instância da classe
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Eventos de conexão Baileys — QR, aberto, fechado. */
  private async onConnectionUpdate(update: { // Membro interno da classe — só usado dentro dela
    connection?: string; // Instrução do programa — parte da lógica deste arquivo
    lastDisconnect?: { error?: unknown }; // Instrução do programa — parte da lógica deste arquivo
    qr?: string; // Instrução do programa — parte da lógica deste arquivo
  }): Promise<void> { // Fecha bloco iniciado anteriormente
    const { connection, lastDisconnect, qr } = update; // Guarda um valor que não muda durante a execução deste trecho

    if (qr) { // Só executa o bloco abaixo se esta condição for verdadeira
      this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
      this.qrCode = qr; // Acessa propriedade ou método desta instância da classe
      this.status = "qr"; // Acessa propriedade ou método desta instância da classe
      console.log("[whatsapp] QR gerado — escaneie em /admin/whatsapp"); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("info", "QR Code gerado — aguardando escaneamento no admin"); // Instrução do programa — parte da lógica deste arquivo
      await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (connection === "open") { // Só executa o bloco abaixo se esta condição for verdadeira
      this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
      this.status = "connected"; // Acessa propriedade ou método desta instância da classe
      this.qrCode = null; // Acessa propriedade ou método desta instância da classe
      this.connectedAt = new Date(); // Acessa propriedade ou método desta instância da classe
      this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
      const me = this.sock?.user; // Guarda um valor que não muda durante a execução deste trecho
      if (me?.id) { // Só executa o bloco abaixo se esta condição for verdadeira
        this.phoneNumber = normalizePhone(me.id.split(":")[0]) ?? me.id.split("@")[0]; // Acessa propriedade ou método desta instância da classe
      } // Fecha um bloco de código (if, função, objeto, etc.)
      await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
      await this.touchActivity(); // Espera terminar uma tarefa assíncrona antes de continuar
      console.log("[whatsapp] conectado como", this.phoneNumber); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("info", `Conectado como +${this.phoneNumber ?? "?"}`, { // Instrução do programa — parte da lógica deste arquivo
        phoneNumber: this.phoneNumber, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (connection === "close") { // Só executa o bloco abaixo se esta condição for verdadeira
      await this.onConnectionClosed(lastDisconnect); // Espera terminar uma tarefa assíncrona antes de continuar
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Trata queda de conexão — distingue logout, erro 405, restart pós-QR, etc. */
  private async onConnectionClosed(lastDisconnect?: { error?: unknown }): Promise<void> { // Membro interno da classe — só usado dentro dela
    this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
    const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode; // Guarda um valor que não muda durante a execução deste trecho
    const loggedOut = statusCode === DisconnectReason.loggedOut; // Guarda um valor que não muda durante a execução deste trecho
    const paired = hasRegisteredSession(); // Guarda um valor que não muda durante a execução deste trecho

    console.warn("[whatsapp] conexão fechada", { statusCode, loggedOut, paired }); // Escreve mensagem no terminal para diagnóstico
    appendBaileysLog("warn", "Conexão fechada", { statusCode, loggedOut, paired }); // Instrução do programa — parte da lógica deste arquivo

    this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe

    if (statusCode === DisconnectReason.restartRequired) { // Só executa o bloco abaixo se esta condição for verdadeira
      console.log("[whatsapp] restart pós-pareamento — reconectando…"); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("info", "Restart pós-pareamento — reconectando"); // Instrução do programa — parte da lógica deste arquivo
      await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
      this.scheduleReconnect("restartRequired", true); // Acessa propriedade ou método desta instância da classe
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    if (loggedOut || !paired) { // Só executa o bloco abaixo se esta condição for verdadeira
      this.status = "disconnected"; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = loggedOut // Acessa propriedade ou método desta instância da classe
        ? "Sessão encerrada. Clique em Conectar WhatsApp e escaneie o QR." // Instrução do programa — parte da lógica deste arquivo
        : statusCode === 405 // Instrução do programa — parte da lógica deste arquivo
          ? "WhatsApp recusou (405). Clique em Conectar WhatsApp." // Instrução do programa — parte da lógica deste arquivo
          : `Conexão interrompida (${statusCode ?? "?"}). Clique em Conectar WhatsApp.`; // Instrução do programa — parte da lógica deste arquivo
      await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
      if (paired && !loggedOut && statusCode !== 405) { // Só executa o bloco abaixo se esta condição for verdadeira
        this.scheduleReconnect(`code ${statusCode ?? "unknown"}`, true); // Acessa propriedade ou método desta instância da classe
      } // Fecha um bloco de código (if, função, objeto, etc.)
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    this.status = "connecting"; // Acessa propriedade ou método desta instância da classe
    this.errorMessage = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
    this.scheduleReconnect(`code ${statusCode ?? "unknown"}`, true); // Acessa propriedade ou método desta instância da classe
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Mensagens recebidas — repassa ao handler de IA/financeiro (somente notify + inbound real). */
  private async onMessagesUpsert(messages: WAMessage[], type: string): Promise<void> { // Membro interno da classe — só usado dentro dela
    if (type !== "notify") return; // Só executa o bloco abaixo se esta condição for verdadeira
    for (const m of messages) { // Repete o bloco para cada item da lista
      if (m.key.fromMe) continue; // Só executa o bloco abaixo se esta condição for verdadeira
      await this.handleMessage(m); // Espera terminar uma tarefa assíncrona antes de continuar
    } // Fecha um bloco de código (if, função, objeto, etc.)
    await this.touchActivity(); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Tipos de mensagem que NÃO são ação do usuário — ignorados sem resposta. */
  private isNonUserMessage(msgContent: NonNullable<WAMessage["message"]>): boolean { // Membro interno da classe — só usado dentro dela
    return Boolean( // Devolve um valor e encerra a função aqui
      msgContent.protocolMessage || // Instrução do programa — parte da lógica deste arquivo
        msgContent.reactionMessage || // Instrução do programa — parte da lógica deste arquivo
        msgContent.ephemeralMessage || // Instrução do programa — parte da lógica deste arquivo
        msgContent.senderKeyDistributionMessage || // Instrução do programa — parte da lógica deste arquivo
        msgContent.pollUpdateMessage || // Instrução do programa — parte da lógica deste arquivo
        msgContent.keepInChatMessage || // Instrução do programa — parte da lógica deste arquivo
        msgContent.requestPhoneNumberMessage, // Instrução do programa — parte da lógica deste arquivo
    ); // Fecha parêntese e encerra instrução
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Extrai conteúdo útil de mensagens encapsuladas (view once, ephemeral, etc.). */
  private unwrapUserMessage(msgContent: NonNullable<WAMessage["message"]>): NonNullable<WAMessage["message"]> | null { // Membro interno da classe — só usado dentro dela
    if (this.isNonUserMessage(msgContent)) return null; // Só executa o bloco abaixo se esta condição for verdadeira
    if (msgContent.ephemeralMessage?.message) { // Só executa o bloco abaixo se esta condição for verdadeira
      return this.unwrapUserMessage(msgContent.ephemeralMessage.message) ?? null; // Devolve um valor e encerra a função aqui
    } // Fecha um bloco de código (if, função, objeto, etc.)
    if (msgContent.viewOnceMessage?.message) { // Só executa o bloco abaixo se esta condição for verdadeira
      return this.unwrapUserMessage(msgContent.viewOnceMessage.message) ?? null; // Devolve um valor e encerra a função aqui
    } // Fecha um bloco de código (if, função, objeto, etc.)
    if (msgContent.viewOnceMessageV2?.message) { // Só executa o bloco abaixo se esta condição for verdadeira
      return this.unwrapUserMessage(msgContent.viewOnceMessageV2.message) ?? null; // Devolve um valor e encerra a função aqui
    } // Fecha um bloco de código (if, função, objeto, etc.)
    return msgContent; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Mensagem antiga ou replay pós-conexão — não deve gerar resposta automática. */
  private isStaleInboundReplay(m: WAMessage): boolean { // Membro interno da classe — só usado dentro dela
    const tsSec = Number(m.messageTimestamp ?? 0); // Guarda um valor que não muda durante a execução deste trecho
    if (tsSec <= 0) return false; // Só executa o bloco abaixo se esta condição for verdadeira

    const msgAt = tsSec * 1000; // Guarda um valor que não muda durante a execução deste trecho
    const ageMs = Date.now() - msgAt; // Guarda um valor que não muda durante a execução deste trecho
    const maxAge = Number(process.env.WHATSAPP_MAX_MESSAGE_AGE_MS) || 4 * 60 * 1000; // Guarda um valor que não muda durante a execução deste trecho
    if (ageMs > maxAge) return true; // Só executa o bloco abaixo se esta condição for verdadeira

    // Fila de histórico logo após escanear QR ou reconectar
    if (this.connectedAt) { // Só executa o bloco abaixo se esta condição for verdadeira
      const openMs = this.connectedAt.getTime(); // Guarda um valor que não muda durante a execução deste trecho
      const sinceOpen = Date.now() - openMs; // Guarda um valor que não muda durante a execução deste trecho
      if (sinceOpen < 20_000 && msgAt < openMs - 5_000) return true; // Só executa o bloco abaixo se esta condição for verdadeira
    } // Fecha um bloco de código (if, função, objeto, etc.)

    return false; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)

  private async handleMessage(m: WAMessage): Promise<void> { // Membro interno da classe — só usado dentro dela
    if (!this.sock || !m.key.remoteJid) return; // Só executa o bloco abaixo se esta condição for verdadeira

    const remoteJid = m.key.remoteJid; // Guarda um valor que não muda durante a execução deste trecho
    if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) return; // Só executa o bloco abaixo se esta condição for verdadeira

    const resolved = resolveWhatsAppSender(m.key); // Guarda um valor que não muda durante a execução deste trecho
    if (!resolved?.phone) { // Só executa o bloco abaixo se esta condição for verdadeira
      appendBaileysLog("warn", "Telefone não resolvido — mensagem ignorada", { // Instrução do programa — parte da lógica deste arquivo
        remoteJid, // Instrução do programa — parte da lógica deste arquivo
        remoteJidAlt: m.key.remoteJidAlt ?? null, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    const { phone: remotePhone, replyJid } = resolved; // Guarda um valor que não muda durante a execução deste trecho
    const messageId = m.key.id ?? ""; // Guarda um valor que não muda durante a execução deste trecho

    if (!messageId) return; // Só executa o bloco abaixo se esta condição for verdadeira

    // Evita reprocessar a mesma mensagem (replay na reconexão Baileys)
    if (await isMessageIdAlreadyProcessed(messageId)) { // Só executa o bloco abaixo se esta condição for verdadeira
      appendBaileysLog("debug", "Mensagem duplicada ignorada", { messageId, remotePhone }); // Instrução do programa — parte da lógica deste arquivo
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    // Ignora replays de histórico na reconexão — só responde mensagens recentes e reais
    if (this.isStaleInboundReplay(m)) { // Só executa o bloco abaixo se esta condição for verdadeira
      markMessageIdProcessed(messageId); // Instrução do programa — parte da lógica deste arquivo
      appendBaileysLog("debug", "Replay/histórico ignorado — sem resposta automática", { // Instrução do programa — parte da lógica deste arquivo
        messageId, // Instrução do programa — parte da lógica deste arquivo
        remotePhone, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    try { // Tenta executar código que pode falhar
      const rawContent = m.message; // Guarda um valor que não muda durante a execução deste trecho
      if (!rawContent) return; // Só executa o bloco abaixo se esta condição for verdadeira

      const msgContent = this.unwrapUserMessage(rawContent); // Guarda um valor que não muda durante a execução deste trecho
      if (!msgContent) return; // Só executa o bloco abaixo se esta condição for verdadeira

      const base = { remotePhone, replyJid, messageId }; // Guarda um valor que não muda durante a execução deste trecho

      if (msgContent.conversation || msgContent.extendedTextMessage?.text) { // Só executa o bloco abaixo se esta condição for verdadeira
        const text = msgContent.conversation ?? msgContent.extendedTextMessage?.text ?? ""; // Guarda um valor que não muda durante a execução deste trecho
        await processIncomingMessage({ ...base, type: "text", text }, this); // Espera terminar uma tarefa assíncrona antes de continuar
        return; // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (msgContent.audioMessage) { // Só executa o bloco abaixo se esta condição for verdadeira
        const buffer = await downloadMediaMessage(m, "buffer", {}, { // Guarda um valor que não muda durante a execução deste trecho
          logger: undefined as never, // Instrução do programa — parte da lógica deste arquivo
          reuploadRequest: this.sock.updateMediaMessage, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
        await processIncomingMessage( // Espera terminar uma tarefa assíncrona antes de continuar
          { // Início de um bloco de código
            ...base, // Espalha campos de outro objeto neste
            type: "audio", // Instrução do programa — parte da lógica deste arquivo
            mediaBuffer: buffer as Buffer, // Instrução do programa — parte da lógica deste arquivo
            mediaMimeType: msgContent.audioMessage.mimetype ?? "audio/ogg", // Instrução do programa — parte da lógica deste arquivo
          }, // Fecha um bloco de código (if, função, objeto, etc.)
          this, // Instrução do programa — parte da lógica deste arquivo
        ); // Fecha parêntese e encerra instrução
        return; // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (msgContent.imageMessage) { // Só executa o bloco abaixo se esta condição for verdadeira
        const buffer = await downloadMediaMessage(m, "buffer", {}, { // Guarda um valor que não muda durante a execução deste trecho
          logger: undefined as never, // Instrução do programa — parte da lógica deste arquivo
          reuploadRequest: this.sock.updateMediaMessage, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
        await processIncomingMessage( // Espera terminar uma tarefa assíncrona antes de continuar
          { // Início de um bloco de código
            ...base, // Espalha campos de outro objeto neste
            type: "image", // Instrução do programa — parte da lógica deste arquivo
            mediaBuffer: buffer as Buffer, // Instrução do programa — parte da lógica deste arquivo
            mediaMimeType: msgContent.imageMessage.mimetype ?? "image/jpeg", // Instrução do programa — parte da lógica deste arquivo
            text: msgContent.imageMessage.caption ?? "", // Instrução do programa — parte da lógica deste arquivo
          }, // Fecha um bloco de código (if, função, objeto, etc.)
          this, // Instrução do programa — parte da lógica deste arquivo
        ); // Fecha parêntese e encerra instrução
        return; // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)

      if (msgContent.documentMessage) { // Só executa o bloco abaixo se esta condição for verdadeira
        const buffer = await downloadMediaMessage(m, "buffer", {}, { // Guarda um valor que não muda durante a execução deste trecho
          logger: undefined as never, // Instrução do programa — parte da lógica deste arquivo
          reuploadRequest: this.sock.updateMediaMessage, // Instrução do programa — parte da lógica deste arquivo
        }); // Fecha chamada de função ou método
        await processIncomingMessage( // Espera terminar uma tarefa assíncrona antes de continuar
          { // Início de um bloco de código
            ...base, // Espalha campos de outro objeto neste
            type: "document", // Instrução do programa — parte da lógica deste arquivo
            mediaBuffer: buffer as Buffer, // Instrução do programa — parte da lógica deste arquivo
            mediaMimeType: msgContent.documentMessage.mimetype ?? "application/octet-stream", // Instrução do programa — parte da lógica deste arquivo
            fileName: msgContent.documentMessage.fileName ?? "document", // Instrução do programa — parte da lógica deste arquivo
          }, // Fecha um bloco de código (if, função, objeto, etc.)
          this, // Instrução do programa — parte da lógica deste arquivo
        ); // Fecha parêntese e encerra instrução
        return; // Instrução do programa — parte da lógica deste arquivo
      } // Fecha um bloco de código (if, função, objeto, etc.)

      // Tipos não suportados — ignora silenciosamente (sem disparar resposta)
      appendBaileysLog("debug", "Tipo de mensagem ignorado (sem resposta)", { // Instrução do programa — parte da lógica deste arquivo
        messageId, // Instrução do programa — parte da lógica deste arquivo
        remotePhone, // Instrução do programa — parte da lógica deste arquivo
        keys: Object.keys(msgContent), // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } catch (err) { // Fecha bloco iniciado anteriormente
      console.error("[whatsapp] erro ao processar mensagem:", err); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("error", "Erro ao processar mensagem", { // Instrução do programa — parte da lógica deste arquivo
        error: err instanceof Error ? err.message : String(err), // Instrução do programa — parte da lógica deste arquivo
        remoteJid, // Instrução do programa — parte da lógica deste arquivo
        remotePhone, // Instrução do programa — parte da lógica deste arquivo
      }); // Fecha chamada de função ou método
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Envia texto — SOMENTE se houver inbound em processamento (reply autorizado). */
  async sendToChat(chatJid: string, text: string): Promise<void> { // Instrução do programa — parte da lógica deste arquivo
    if (!this.sock || this.status !== "connected") { // Só executa o bloco abaixo se esta condição for verdadeira
      throw new Error("WhatsApp not connected"); // Sinaliza erro e interrompe o fluxo normal
    } // Fecha um bloco de código (if, função, objeto, etc.)
    if (!isReplyAuthorized(chatJid)) { // Só executa o bloco abaixo se esta condição for verdadeira
      console.warn("[whatsapp] envio bloqueado — nenhuma mensagem inbound em processamento:", chatJid); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("warn", "Envio bloqueado — sem inbound correspondente", { chatJid }); // Instrução do programa — parte da lógica deste arquivo
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)
    await this.sock.sendMessage(chatJid, { text }); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  async sendText(phone: string, text: string): Promise<void> { // Instrução do programa — parte da lógica deste arquivo
    const normalized = normalizePhone(phone) ?? phone.replace(/\D/g, ""); // Guarda um valor que não muda durante a execução deste trecho
    await this.sendToChat(`${normalized}@s.whatsapp.net`, text); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Logout admin — para keep-alive e apaga sessão. */
  async disconnect(): Promise<void> { // Instrução do programa — parte da lógica deste arquivo
    getWhatsAppKeepAlive().stop(); // Instrução do programa — parte da lógica deste arquivo
    this.clearTimers(); // Acessa propriedade ou método desta instância da classe
    if (this.sock) { // Só executa o bloco abaixo se esta condição for verdadeira
      await this.sock.logout(); // Espera terminar uma tarefa assíncrona antes de continuar
      this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    } // Fecha um bloco de código (if, função, objeto, etc.)
    this.status = "disconnected"; // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe
    this.phoneNumber = null; // Acessa propriedade ou método desta instância da classe
    this.connectedAt = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Aguardando admin escanear QR pela primeira vez. */
  async markAwaitingPairing(): Promise<void> { // Instrução do programa — parte da lógica deste arquivo
    this.clearTimers(); // Acessa propriedade ou método desta instância da classe
    this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
    this.connecting = false; // Acessa propriedade ou método desta instância da classe
    this.reconnectAttempts = 0; // Acessa propriedade ou método desta instância da classe
    this.status = "disconnected"; // Acessa propriedade ou método desta instância da classe
    this.qrCode = null; // Acessa propriedade ou método desta instância da classe
    this.errorMessage = null; // Acessa propriedade ou método desta instância da classe
    await this.updateDbState(); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Desbloqueia status "connecting" travado no banco após crash do servidor. */
  async recoverStaleConnecting(maxAgeMs = 30_000): Promise<boolean> { // Atribui ou calcula um valor para usar adiante
    const [row] = await db.select().from(whatsappConnection).where(eq(whatsappConnection.id, "main")); // Guarda um valor que não muda durante a execução deste trecho
    if (!row) return false; // Só executa o bloco abaixo se esta condição for verdadeira
    if (row.status !== "connecting" && row.status !== "qr") return false; // Só executa o bloco abaixo se esta condição for verdadeira
    if (row.qrCode) return false; // Só executa o bloco abaixo se esta condição for verdadeira
    if (Date.now() - row.updatedAt.getTime() < maxAgeMs) return false; // Só executa o bloco abaixo se esta condição for verdadeira
    console.warn("[whatsapp] recuperando estado travado"); // Escreve mensagem no terminal para diagnóstico
    await this.markAwaitingPairing(); // Espera terminar uma tarefa assíncrona antes de continuar
    return true; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)

  // ---------------------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------------------

  private clearTimers(): void { // Membro interno da classe — só usado dentro dela
    if (this.reconnectTimer) { // Só executa o bloco abaixo se esta condição for verdadeira
      clearTimeout(this.reconnectTimer); // Instrução do programa — parte da lógica deste arquivo
      this.reconnectTimer = null; // Acessa propriedade ou método desta instância da classe
    } // Fecha um bloco de código (if, função, objeto, etc.)
    this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
  } // Fecha um bloco de código (if, função, objeto, etc.)

  private clearQrTimeout(): void { // Membro interno da classe — só usado dentro dela
    if (this.qrTimeoutTimer) { // Só executa o bloco abaixo se esta condição for verdadeira
      clearTimeout(this.qrTimeoutTimer); // Instrução do programa — parte da lógica deste arquivo
      this.qrTimeoutTimer = null; // Acessa propriedade ou método desta instância da classe
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  private startQrTimeout(): void { // Membro interno da classe — só usado dentro dela
    this.clearQrTimeout(); // Acessa propriedade ou método desta instância da classe
    this.qrTimeoutTimer = setTimeout(() => { // Acessa propriedade ou método desta instância da classe
      if (this.status === "connecting" && !this.qrCode) { // Só executa o bloco abaixo se esta condição for verdadeira
        this.teardownSocket(); // Acessa propriedade ou método desta instância da classe
        this.connecting = false; // Acessa propriedade ou método desta instância da classe
        this.status = "error"; // Acessa propriedade ou método desta instância da classe
        this.errorMessage = "QR não gerado a tempo. Verifique internet e clique em Conectar WhatsApp."; // Acessa propriedade ou método desta instância da classe
        void this.updateDbState(); // Dispara tarefa em segundo plano sem esperar terminar
      } // Fecha um bloco de código (if, função, objeto, etc.)
    }, QR_WAIT_TIMEOUT_MS); // Fecha bloco iniciado anteriormente
  } // Fecha um bloco de código (if, função, objeto, etc.)

  private teardownSocket(): void { // Membro interno da classe — só usado dentro dela
    if (this.sock) { // Só executa o bloco abaixo se esta condição for verdadeira
      this.sock.ev.removeAllListeners("connection.update"); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.removeAllListeners("creds.update"); // Acessa propriedade ou método desta instância da classe
      this.sock.ev.removeAllListeners("messages.upsert"); // Acessa propriedade ou método desta instância da classe
      this.sock.end(undefined); // Acessa propriedade ou método desta instância da classe
      this.sock = null; // Acessa propriedade ou método desta instância da classe
    } // Fecha um bloco de código (if, função, objeto, etc.)
  } // Fecha um bloco de código (if, função, objeto, etc.)

  /** Reconexão rápida com backoff — usada após quedas inesperadas. */
  private scheduleReconnect(reason?: string, allowWhenUnpaired = true): void { // Membro interno da classe — só usado dentro dela
    if (this.reconnectTimer) return; // Só executa o bloco abaixo se esta condição for verdadeira
    if (!allowWhenUnpaired && !hasRegisteredSession()) return; // Só executa o bloco abaixo se esta condição for verdadeira
    if (!hasRegisteredSession() && this.reconnectAttempts >= 2) { // Só executa o bloco abaixo se esta condição for verdadeira
      this.status = "error"; // Acessa propriedade ou método desta instância da classe
      this.errorMessage = "Falha ao parear. Clique em Conectar WhatsApp."; // Acessa propriedade ou método desta instância da classe
      void this.updateDbState(); // Dispara tarefa em segundo plano sem esperar terminar
      return; // Instrução do programa — parte da lógica deste arquivo
    } // Fecha um bloco de código (if, função, objeto, etc.)

    this.reconnectAttempts++; // Acessa propriedade ou método desta instância da classe
    const delayMs = Math.min(3000 * this.reconnectAttempts, 60_000); // Guarda um valor que não muda durante a execução deste trecho
    console.log(`[whatsapp] reconectando em ${delayMs / 1000}s${reason ? ` (${reason})` : ""}`); // Escreve mensagem no terminal para diagnóstico

    this.reconnectTimer = setTimeout(() => { // Acessa propriedade ou método desta instância da classe
      this.reconnectTimer = null; // Acessa propriedade ou método desta instância da classe
      void this.connect(false); // Dispara tarefa em segundo plano sem esperar terminar
    }, delayMs); // Fecha bloco iniciado anteriormente
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

// --- Singleton — uma instância por processo Node ---

let singleton: WhatsAppClient | null = null; // Variável que pode mudar de valor conforme o programa roda

export function getWhatsAppClient(): WhatsAppClient { // Função exportada — pode ser usada em outros arquivos
  if (!singleton) { // Só executa o bloco abaixo se esta condição for verdadeira
    singleton = new WhatsAppClient(); // Atribui ou calcula um valor para usar adiante
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return singleton; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

export function isWhatsAppEnabled(): boolean { // Função exportada — pode ser usada em outros arquivos
  return process.env.ENABLE_WHATSAPP !== "false"; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/**
 * Boot do módulo WhatsApp — chamado uma vez em index.ts ao subir o servidor.
 * Inicia keep-alive de 30 min independente de já estar pareado.
 */
export async function initWhatsApp(): Promise<void> { // Função assíncrona exportada — outros módulos podem chamar
  if (!isWhatsAppEnabled()) { // Só executa o bloco abaixo se esta condição for verdadeira
    console.log("[whatsapp] desabilitado (ENABLE_WHATSAPP=false)"); // Escreve mensagem no terminal para diagnóstico
    return; // Instrução do programa — parte da lógica deste arquivo
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const client = getWhatsAppClient(); // Guarda um valor que não muda durante a execução deste trecho
  await client.loadStateFromDb(); // Espera terminar uma tarefa assíncrona antes de continuar

  console.log(`[whatsapp] pasta de sessão: ${SESSION_DIR}`); // Escreve mensagem no terminal para diagnóstico

  if (hasRegisteredSession()) { // Só executa o bloco abaixo se esta condição for verdadeira
    console.log("[whatsapp] sessão encontrada — reconectando…"); // Escreve mensagem no terminal para diagnóstico
    await client.connect(false); // Espera terminar uma tarefa assíncrona antes de continuar
  } else { // Fecha bloco iniciado anteriormente
    console.log("[whatsapp] aguardando pareamento em /admin/whatsapp"); // Escreve mensagem no terminal para diagnóstico
    await client.markAwaitingPairing(); // Espera terminar uma tarefa assíncrona antes de continuar
  } // Fecha um bloco de código (if, função, objeto, etc.)

  getWhatsAppKeepAlive().start(client); // Instrução do programa — parte da lógica deste arquivo
} // Fecha um bloco de código (if, função, objeto, etc.)
