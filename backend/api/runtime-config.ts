/**
 * Configuração em runtime da OpenAI — modelo escolhido pelo admin — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"; // I/O do arquivo runtime.json
import { dirname, join } from "node:path"; // Montagem de caminhos multiplataforma
import { SESSION_DIR } from "../whatsapp/session-utils.js"; // Pasta Baileys — config fica ao lado (.controlaai)

/** Opção de modelo exibida no dropdown do painel admin. */
export type OpenAIModelOption = {
  id: string; // ID OpenAI (ex: gpt-4o-mini)
  label: string; // Texto amigável na UI
  inputPer1M: number; // USD por 1M tokens de entrada
  outputPer1M: number; // USD por 1M tokens de saída
};

/** Modelos suportados pelo painel admin — tarifas aproximadas para estimativa de custo. */
export const AVAILABLE_OPENAI_MODELS: OpenAIModelOption[] = [
  { id: "gpt-4o-mini", label: "GPT-4o Mini — rápido e econômico", inputPer1M: 0.15, outputPer1M: 0.6 },
  { id: "gpt-4o", label: "GPT-4o — mais preciso", inputPer1M: 2.5, outputPer1M: 10 },
  { id: "gpt-4.1-mini", label: "GPT-4.1 Mini", inputPer1M: 0.4, outputPer1M: 1.6 },
  { id: "gpt-4.1", label: "GPT-4.1", inputPer1M: 2.0, outputPer1M: 8.0 },
  { id: "o4-mini", label: "o4-mini — raciocínio leve", inputPer1M: 1.1, outputPer1M: 4.4 },
  { id: "o3-mini", label: "o3-mini — raciocínio", inputPer1M: 1.1, outputPer1M: 4.4 },
];

const CONFIG_DIR = process.env.RUNTIME_CONFIG_DIR ?? join(dirname(SESSION_DIR), ".controlaai"); // backend/.controlaai
const CONFIG_FILE = join(CONFIG_DIR, "runtime.json"); // Arquivo com override do modelo GPT

type RuntimeFile = { openaiModel?: string }; // Formato JSON persistido em disco

let runtimeOverride: string | null = null; // Modelo escolhido pelo admin (em memória)

/** Verifica se o modelo está na lista permitida do painel admin. */
function isSupportedModel(model: string): boolean {
  return AVAILABLE_OPENAI_MODELS.some((m) => m.id === model); // Busca id na lista AVAILABLE_OPENAI_MODELS
}

/** Grava override atual em disco para sobreviver a restart do servidor. */
function persist(): void {
  mkdirSync(CONFIG_DIR, { recursive: true }); // Cria pasta .controlaai se não existir
  const payload: RuntimeFile = {};
  if (runtimeOverride) payload.openaiModel = runtimeOverride; // Só grava se houver override
  writeFileSync(CONFIG_FILE, JSON.stringify(payload, null, 2), "utf8"); // JSON formatado
}

/** Carrega override salvo — chamar no boot do servidor (src/index.ts). */
export function initRuntimeConfig(): void {
  try {
    if (!existsSync(CONFIG_FILE)) return; // Primeira execução — usa OPENAI_MODEL do .env
    const raw = readFileSync(CONFIG_FILE, "utf8"); // Lê runtime.json
    const data = JSON.parse(raw) as RuntimeFile; // Parse JSON
    if (data.openaiModel && isSupportedModel(data.openaiModel)) {
      runtimeOverride = data.openaiModel; // Aplica override válido em memória
    }
  } catch (err) {
    console.warn("[runtime-config] falha ao carregar:", err); // Não bloqueia boot se arquivo corrompido
  }
}

/** Modelo padrão definido no .env (fallback quando admin não escolheu override). */
export function getEnvOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini"; // Default econômico
}

/** Retorna override admin ou null se usa .env. */
export function getRuntimeOpenAIModel(): string | null {
  return runtimeOverride; // null = sem override em memória
}

/** Modelo efetivo usado em todas as chamadas OpenAI (parser, chat, visão). */
export function getEffectiveOpenAIModel(): string {
  return runtimeOverride ?? getEnvOpenAIModel(); // Prioridade: admin > env > default
}

/** Define modelo em runtime; retorna false se id inválido (não está em AVAILABLE_OPENAI_MODELS). */
export function setRuntimeOpenAIModel(model: string): boolean {
  const trimmed = model.trim();
  if (!isSupportedModel(trimmed)) return false; // Rejeita modelos fora da lista
  runtimeOverride = trimmed; // Aplica em memória
  persist(); // Salva em runtime.json
  return true;
}

/** Remove override — volta ao OPENAI_MODEL do .env. */
export function clearRuntimeOpenAIModel(): void {
  runtimeOverride = null; // Limpa memória
  persist(); // Grava arquivo vazio (sem openaiModel)
}

/** Tarifas USD/1M tokens para estimativa de custo em ai_logs. */
export function getModelPricing(model: string): { inputPer1M: number; outputPer1M: number } {
  const found = AVAILABLE_OPENAI_MODELS.find((m) => m.id === model); // Busca tarifas do modelo
  return found ?? { inputPer1M: 0.15, outputPer1M: 0.6 }; // Fallback gpt-4o-mini se modelo desconhecido
}
