/**
 * Cliente OpenAI singleton — modelo, Whisper e estimativa de custo — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import OpenAI from "openai"; // SDK oficial OpenAI
import { getEffectiveOpenAIModel, getModelPricing } from "./runtime-config.js"; // Modelo ativo e tarifas por token

let client: OpenAI | null = null; // Instância única reutilizada (evita múltiplas conexões)

/** Retorna cliente OpenAI lazy-init; lança se OPENAI_API_KEY ausente. */
export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY; // Chave secreta do .env
    if (!apiKey) throw new Error("OPENAI_API_KEY is required"); // Bloqueia chamadas sem credencial
    client = new OpenAI({ apiKey }); // Cria cliente na primeira chamada
  }
  return client; // Reutiliza singleton nas próximas chamadas
}

/** Modelo GPT efetivo: override admin > OPENAI_MODEL env > gpt-4o-mini. */
export function getOpenAIModel(): string {
  return getEffectiveOpenAIModel(); // Delega para runtime-config (admin ou .env)
}

/** Modelo Whisper para transcrição de áudio WhatsApp. */
export function getWhisperModel(): string {
  return process.env.OPENAI_WHISPER_MODEL ?? "whisper-1"; // Padrão whisper-1 se env ausente
}

/** Custo estimado por tokens (USD) — tarifas por modelo definidas em runtime-config. */
export function estimateCostUsd(inputTokens: number, outputTokens: number, model?: string): number {
  const rates = getModelPricing(model ?? getOpenAIModel()); // USD por 1M tokens input/output
  return (inputTokens * rates.inputPer1M + outputTokens * rates.outputPer1M) / 1_000_000; // Converte para custo total
}

/** Verifica se IA está configurada (painel admin mostra aviso se false). */
export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY); // true apenas com chave definida
}
