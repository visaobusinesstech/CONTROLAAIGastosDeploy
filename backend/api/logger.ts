/**
 * Registro de operações OpenAI na tabela ai_logs — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { db } from "../src/db/index.js"; // Cliente Drizzle para inserir em ai_logs
import { aiLogs } from "../src/db/schema.js"; // Tabela de auditoria de chamadas IA
import { estimateCostUsd } from "./openai-client.js"; // Calcula custo USD por tokens input/output

/** Dados de entrada para registrar uma operação de IA no banco. */
export type AiLogInput = {
  userId?: string | null; // Usuário dono da operação (null = sistema)
  source: string; // Origem: whatsapp, web_chat, import, admin
  operation: string; // Tipo: parse, chat, transcribe, vision, parse_document
  prompt?: string | null; // Texto enviado ao modelo
  response?: string | null; // Resposta bruta do modelo
  model?: string | null; // Ex: gpt-4o-mini
  inputTokens?: number | null; // Tokens de entrada (prompt)
  outputTokens?: number | null; // Tokens de saída (completion)
  processingMs?: number | null; // Latência em milissegundos
  status?: "success" | "error" | "pending"; // Resultado da operação
  errorMessage?: string | null; // Mensagem se status=error
  metadata?: Record<string, unknown> | null; // JSON extra (intent parseado, etc.)
};

/** Insere registro em ai_logs e retorna o UUID gerado para correlacionar com transações. */
export async function logAiOperation(input: AiLogInput): Promise<string> {
  const cost =
    input.inputTokens != null && input.outputTokens != null
      ? estimateCostUsd(input.inputTokens, input.outputTokens, input.model ?? undefined) // Só calcula custo se tokens informados
      : null;

  const [row] = await db
    .insert(aiLogs) // INSERT na tabela de auditoria
    .values({
      userId: input.userId ?? null, // FK opcional para users
      source: input.source,
      operation: input.operation,
      prompt: input.prompt ?? null,
      response: input.response ?? null,
      model: input.model ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      costUsd: cost != null ? String(cost) : null, // numeric no Postgres = string no Drizzle
      processingMs: input.processingMs ?? null,
      status: input.status ?? "success", // Padrão: sucesso
      errorMessage: input.errorMessage ?? null,
      metadata: input.metadata ?? null,
    })
    .returning({ id: aiLogs.id }); // Retorna id para correlacionar com transação

  return row.id; // UUID do log criado
}
