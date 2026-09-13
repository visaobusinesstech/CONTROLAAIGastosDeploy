/**
 * =============================================================================
 * KEEP-ALIVE WHATSAPP — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * =============================================================================
 *
 * Objetivo: manter o número oficial conectado 24/7 sem intervenção manual.
 *
 * A cada 30 minutos (configurável) o guardian:
 *   1. Ignora se ainda não há sessão pareada (admin escaneando QR).
 *   2. Verifica se o socket Baileys está saudável.
 *   3. Se saudável → registra atividade e, se passou 30 min, faz refresh preventivo.
 *   4. Se frágil ou offline → reconecta usando a sessão salva em disco.
 *
 * Variável de ambiente:
 *   WHATSAPP_KEEPALIVE_INTERVAL_MS — intervalo em ms (padrão: 1_800_000 = 30 min)
 * =============================================================================
 */

import type { WhatsAppClient } from "./client.js"; // Classe Baileys com runKeepAliveFallback()
import { appendBaileysLog } from "./baileys-log.js"; // Registra ciclos no painel admin

/** Intervalo padrão: 30 minutos em milissegundos */
export const DEFAULT_KEEPALIVE_MS = 30 * 60 * 1000; // Constante exportada — valor fixo compartilhado com o resto do sistema

/** Lê intervalo do .env ou usa DEFAULT_KEEPALIVE_MS (mínimo 60s). */
export function getKeepAliveIntervalMs(): number { // Função exportada — pode ser usada em outros arquivos
  const raw = process.env.WHATSAPP_KEEPALIVE_INTERVAL_MS; // Ex: 1800000
  const parsed = raw ? Number(raw) : DEFAULT_KEEPALIVE_MS;
  return Number.isFinite(parsed) && parsed >= 60_000 ? parsed : DEFAULT_KEEPALIVE_MS; // Clamp mínimo 1 min
}

/** Estatísticas expostas em GET /api/admin/whatsapp/keepalive */
export type KeepAliveStats = {
  lastRunAt: string | null; // ISO da última execução
  lastResult: "skipped" | "healthy" | "refreshed" | "reconnected" | "failed" | null;
  lastError: string | null; // Mensagem se failed
  intervalMs: number; // Intervalo configurado
  runCount: number; // Total de ciclos desde boot
};

/**
 * Timer periódico que delega a lógica de fallback para o WhatsAppClient.
 * Um único timer por processo — evita múltiplos intervals ao reiniciar hot-reload.
 */
export class WhatsAppKeepAlive {
  private timer: ReturnType<typeof setInterval> | null = null; // Handle do setInterval
  private client: WhatsAppClient | null = null; // Referência ao cliente Baileys
  private stats: KeepAliveStats = { // Membro interno da classe — só usado dentro dela
    lastRunAt: null,
    lastResult: null,
    lastError: null,
    intervalMs: getKeepAliveIntervalMs(),
    runCount: 0,
  };
  /** Inicia o ciclo de fallback. Seguro chamar mais de uma vez — reinicia o timer. */
  start(client: WhatsAppClient): void {
    this.stop(); // Limpa timer anterior se existir
    this.client = client; // Guarda referência para tick()
    this.stats.intervalMs = getKeepAliveIntervalMs(); // Acessa propriedade ou método desta instância da classe
    const minutes = Math.round(this.stats.intervalMs / 60_000);
    console.log(`[whatsapp-keepalive] ativo — verificação a cada ${minutes} min`); // Escreve mensagem no terminal para diagnóstico
    appendBaileysLog("info", `Keep-alive ativo — verificação a cada ${minutes} min`, {
      intervalMs: this.stats.intervalMs,
    });
    setTimeout(() => void this.tick("boot-delay"), 2 * 60_000); // Primeira checagem após 2 min (boot)
    this.timer = setInterval(() => void this.tick("interval"), this.stats.intervalMs); // Ciclo periódico
  }
  /** Para o timer (ex.: logout admin ou desligar WhatsApp). */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null; // Acessa propriedade ou método desta instância da classe
    }
  }
  /** Retorna cópia das estatísticas (evita mutação externa). */
  getStats(): KeepAliveStats {
    return { ...this.stats };
  }
  /** Executa um ciclo manual — usado pelo timer e POST /keepalive/run. */
  async tick(reason = "manual"): Promise<KeepAliveStats> {
    if (!this.client) {
      return this.stats; // Sem cliente — nada a fazer
    }
    this.stats.runCount++; // Incrementa contador
    this.stats.lastRunAt = new Date().toISOString(); // Acessa propriedade ou método desta instância da classe
    this.stats.lastError = null; // Acessa propriedade ou método desta instância da classe
    try {
      const result = await this.client.runKeepAliveFallback(reason); // Delega ao client.ts
      this.stats.lastResult = result; // Acessa propriedade ou método desta instância da classe
      appendBaileysLog("info", `Keep-alive: ${result}`, { reason, result });
    } catch (err) {
      this.stats.lastResult = "failed"; // Acessa propriedade ou método desta instância da classe
      this.stats.lastError = err instanceof Error ? err.message : String(err); // Acessa propriedade ou método desta instância da classe
      console.error("[whatsapp-keepalive] erro no ciclo:", this.stats.lastError); // Escreve mensagem no terminal para diagnóstico
      appendBaileysLog("error", "Erro no keep-alive", { error: this.stats.lastError, reason });
    }
    return this.getStats();
  }
}

let guardianSingleton: WhatsAppKeepAlive | null = null; // Uma instância por processo Node

/** Singleton — mesmo guardian usado por client.ts e routes.ts */
export function getWhatsAppKeepAlive(): WhatsAppKeepAlive { // Função exportada — pode ser usada em outros arquivos
  if (!guardianSingleton) {
    guardianSingleton = new WhatsAppKeepAlive();
  }
  return guardianSingleton;
}
