/**
 * Parser financeiro OpenAI — extrai gastos/receitas de texto, áudio, imagem e PDF — Controla.ai
 *
 * Papel no sistema: Lógica de domínio/IA compartilhada entre HTTP e WhatsApp.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { z } from "zod"; // Validação do JSON retornado pela IA
import { getOpenAI, getOpenAIModel, isOpenAIConfigured } from "./openai-client.js"; // Cliente e modelo GPT
import { logAiOperation } from "./logger.js"; // Auditoria em ai_logs
import {
  buildParserPromptWithContext,
  CONTROLAAI_DOCUMENT_PROMPT,
  CONTROLAAI_VISION_SUFFIX,
} from "./prompts.js"; // Prompts oficiais do sistema
import { inferCategoryFromDescription } from "./category-resolver.js"; // Fallback local de categoria
import { parseMoneyAmount } from "../src/utils/money.js"; // Extrai valores monetários
import { isGreetingMessage } from "./message-text.js"; // Ignora "oi" no parser local
import {
  isExpenseMessage,
  isIncomeMessage,
  isTransactionMessage,
  isQueryMessage,
} from "./transaction-intent.js"; // Heurísticas de intenção

/** Schema Zod — define formato válido do JSON que a OpenAI deve retornar. */
export const financialIntentSchema = z.object({
  intent: z.enum(["transaction", "query", "report", "goal", "unknown"]), // Tipo principal da mensagem
  type: z.enum(["expense", "income", "transfer"]).optional(), // Subtipo financeiro
  value: z.number().optional(), // Valor em reais
  category: z.string().optional(), // Nome da categoria
  description: z.string().optional(), // Descrição livre
  date: z.string().optional(), // Data YYYY-MM-DD
  installments: z.number().int().optional(), // Número de parcelas
  paymentMethod: z.string().optional(), // pix, cartão, etc.
  notes: z.string().optional(), // Observações da IA
  queryType: z.string().optional(), // Subtipo de consulta (monthly_spending, etc.)
});

/** Tipo TypeScript inferido do schema — usado em todo o backend. */
export type FinancialIntent = z.infer<typeof financialIntentSchema>;

/** Inferência local de categoria a partir do texto quando a IA não informou. */
function inferLocalCategory(text: string, type: "expense" | "income"): string {
  const inferred = inferCategoryFromDescription(text, type); // Keywords na descrição
  if (inferred) return inferred;
  return type === "income" ? "Outras receitas" : "Outros gastos"; // Fallback genérico
}

/** Parser local (regex) — fallback quando OpenAI indisponível ou JSON inválido. */
function parseLocalIntent(text: string): FinancialIntent {
  const lower = text.toLowerCase();
  if (isGreetingMessage(text)) {
    return { intent: "unknown" }; // Saudação não é intent financeiro
  }
  const value = parseMoneyAmount(text) ?? undefined; // Tenta extrair valor
  if (/quais dias.*gast|dia.*mais gast|dias que.*gast/i.test(lower)) {
    return { intent: "query", queryType: "top_spending_days" };
  }
  if (/j[aá]\s+tem.*renda|tenho.*renda.*sistema|minha renda.*sistema|cadastr.*renda/i.test(lower)) {
    return { intent: "query", queryType: "income_profile_status" };
  }
  if (/quanto gastei|gastos? (do|desse|deste) m[eê]s|resumo/i.test(lower)) {
    return { intent: "query", queryType: "monthly_spending" };
  }
  if (/maior despesa|gastei mais/i.test(lower)) {
    return { intent: "query", queryType: "biggest_expense" };
  }
  if (/posso gastar|tenho para gastar/i.test(lower)) {
    return { intent: "query", queryType: "can_spend", value: value || undefined };
  }
  if (/saud[aá]vel|situa[cç][aã]o financeira/i.test(lower)) {
    return { intent: "query", queryType: "health_check" };
  }
  if (/economizei|compar/i.test(lower)) {
    return { intent: "query", queryType: "month_comparison" };
  }
  if (/\b(meta|metas|objetivo)\b|quero\s+(registrar|criar|cadastrar).*meta|criar\s+(uma\s+)?meta/i.test(lower)) {
    // Gasto explícito vence meta mesmo se a frase tiver palavras ambíguas
    if (!isTransactionMessage(text) && !isExpenseMessage(text)) return { intent: "goal" };
  }
  const isIncome = isIncomeMessage(text);
  const isExpense = isExpenseMessage(text);
  if (isIncome || isExpense) {
    const type = isIncome ? "income" : "expense";
    return {
      intent: "transaction",
      type,
      value,
      category: inferLocalCategory(text, type),
      description: text.slice(0, 200), // Limita tamanho da descrição
    };
  }
  return { intent: "unknown" }; // Não reconheceu padrão
}

/** Corrige intent com valor/tipo inferidos localmente quando a IA erra. */
function enrichIntentFromText(intent: FinancialIntent, text: string): FinancialIntent {
  if (isQueryMessage(text)) {
    const local = parseLocalIntent(text);
    if (local.intent === "query") return local; // Consulta local prevalece
  }
  const localValue = parseMoneyAmount(text);
  let enriched: FinancialIntent = { ...intent };
  if (localValue && (!enriched.value || enriched.value <= 0)) {
    enriched = { ...enriched, value: localValue }; // Preenche valor ausente
  }
  if (isTransactionMessage(text)) {
    const local = parseLocalIntent(text);
    if (local.intent === "transaction" && local.type) {
      enriched = {
        ...enriched,
        intent: "transaction",
        type: local.type,
        value: enriched.value ?? local.value,
        category: enriched.category ?? local.category,
        description: enriched.description ?? local.description,
      }; // Força transaction quando regex detectou
    }
  }
  if (enriched.intent === "transaction" && enriched.type && enriched.type !== "transfer") {
    const fromText = inferLocalCategory(text, enriched.type);
    const fallback = enriched.type === "income" ? "Outras receitas" : "Outros gastos";
    if (!enriched.category || enriched.category === fallback) {
      enriched = { ...enriched, category: fromText }; // Melhora categoria genérica
    } else if (fromText !== fallback && fromText !== enriched.category) {
      enriched = { ...enriched, category: fromText }; // Descrição prevalece sobre IA
    }
  }
  return enriched;
}

/** Parser principal — OpenAI com contexto + histórico; fallback local se indisponível. */
export async function parseFinancialIntent(
  text: string,
  context?: {
    userId?: string;
    topCategories?: string[];
    expenseCategories?: string[];
    incomeCategories?: string[];
    conversationHistory?: string;
  },
): Promise<FinancialIntent> {
  const start = Date.now(); // Marca início para latência em ai_logs
  if (!isOpenAIConfigured()) {
    return enrichIntentFromText(parseLocalIntent(text), text); // Sem API key — só regex
  }
  const categoryHint = buildParserPromptWithContext(
    context?.topCategories ?? [],
    context?.expenseCategories,
    context?.incomeCategories,
    context?.conversationHistory,
  ); // Prompt enriquecido com contexto do usuário
  try {
    const openai = getOpenAI();
    const model = getOpenAIModel();
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.1, // Baixa criatividade — JSON determinístico
      response_format: { type: "json_object" }, // Força resposta JSON
      messages: [
        { role: "system", content: categoryHint },
        { role: "user", content: text },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = financialIntentSchema.safeParse(JSON.parse(raw)); // Valida com Zod
    const base = parsed.success ? parsed.data : parseLocalIntent(text); // Fallback se JSON inválido
    const result = enrichIntentFromText(base, text); // Corrige com heurísticas locais
    await logAiOperation({
      userId: context?.userId,
      source: "whatsapp",
      operation: "parse",
      prompt: text,
      response: raw,
      model,
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
      processingMs: Date.now() - start,
      metadata: { parsed: result },
    });
    return result;
  } catch (err) {
    await logAiOperation({
      userId: context?.userId,
      source: "whatsapp",
      operation: "parse",
      prompt: text,
      status: "error",
      errorMessage: err instanceof Error ? err.message : String(err),
      processingMs: Date.now() - start,
    });
    return enrichIntentFromText(parseLocalIntent(text), text); // Erro de rede/API — regex
  }
}

/** Extrai lista de transações de texto de PDF/extrato via OpenAI. */
export async function parseDocumentText(
  extractedText: string,
  userId: string,
): Promise<Array<{ type: "expense" | "income"; value: number; description: string; category?: string; date?: string }>> {
  if (!isOpenAIConfigured()) {
    return []; // Sem IA — import vazio
  }
  const start = Date.now();
  const openai = getOpenAI();
  const model = getOpenAIModel();
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: CONTROLAAI_DOCUMENT_PROMPT, // Prompt especializado em extratos
      },
      { role: "user", content: extractedText.slice(0, 12000) }, // Limita tokens do PDF
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? '{"transactions":[]}';
  await logAiOperation({
    userId,
    source: "import",
    operation: "parse_document",
    prompt: extractedText.slice(0, 500),
    response: raw,
    model,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    processingMs: Date.now() - start,
  });
  try {
    const data = JSON.parse(raw) as { transactions?: Array<{ type: string; value: number; description: string; category?: string; date?: string }> };
    return (data.transactions ?? [])
      .filter((t) => t.value > 0 && (t.type === "expense" || t.type === "income")) // Só lançamentos válidos
      .map((t) => ({
        type: t.type as "expense" | "income",
        value: t.value,
        description: t.description ?? "",
        category: t.category,
        date: t.date,
      }));
  } catch {
    return []; // JSON malformado
  }
}

/** Analisa imagem de comprovante/nota fiscal via GPT-4 Vision. */
export async function parseReceiptImage(
  imageBase64: string,
  mimeType: string,
  userId: string,
): Promise<FinancialIntent> {
  if (!isOpenAIConfigured()) {
    return { intent: "unknown" };
  }
  const start = Date.now();
  const openai = getOpenAI();
  const model = getOpenAIModel();
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildParserPromptWithContext([]) + CONTROLAAI_VISION_SUFFIX, // Parser + instrução OCR
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia os dados financeiros desta imagem." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } }, // Imagem inline
        ],
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  await logAiOperation({
    userId,
    source: "whatsapp",
    operation: "vision",
    response: raw,
    model,
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
    processingMs: Date.now() - start,
  });
  try {
    const parsed = financialIntentSchema.safeParse(JSON.parse(raw));
    return parsed.success ? enrichIntentFromText(parsed.data, "[imagem]") : { intent: "unknown" };
  } catch {
    return { intent: "unknown" };
  }
}
