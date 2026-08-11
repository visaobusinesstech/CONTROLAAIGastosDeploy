/**
 * Parser financeiro OpenAI — extrai gastos/receitas de texto, áudio, imagem e PDF — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { z } from "zod";
import { getOpenAI, getOpenAIModel, isOpenAIConfigured } from "./openai-client.js";
import { logAiOperation } from "./logger.js";
import {
  buildParserPromptWithContext,
  CONTROLAAI_DOCUMENT_PROMPT,
  CONTROLAAI_VISION_SUFFIX,
} from "./prompts.js";
import { inferCategoryFromDescription } from "./category-resolver.js";
import { parseMoneyAmount } from "../src/utils/money.js";
import { isGreetingMessage } from "./message-text.js";
import {
  isExpenseMessage,
  isIncomeMessage,
  isTransactionMessage,
  isQueryMessage,
} from "./transaction-intent.js";

export const financialIntentSchema = z.object({
  intent: z.enum(["transaction", "query", "report", "goal", "unknown"]),
  type: z.enum(["expense", "income", "transfer"]).optional(),
  value: z.number().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  installments: z.number().int().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  queryType: z.string().optional(),
});

export type FinancialIntent = z.infer<typeof financialIntentSchema>;

/** Inferência local de categoria a partir do texto. */
function inferLocalCategory(text: string, type: "expense" | "income"): string {
  const inferred = inferCategoryFromDescription(text, type);
  if (inferred) return inferred;
  return type === "income" ? "Outras receitas" : "Outros gastos";
}

/** Parser local (regex) — fallback quando OpenAI indisponível ou JSON inválido. */
function parseLocalIntent(text: string): FinancialIntent {
  const lower = text.toLowerCase();
  if (isGreetingMessage(text)) {
    return { intent: "unknown" };
  }
  const value = parseMoneyAmount(text) ?? undefined;

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
    if (!isTransactionMessage(text)) return { intent: "goal" };
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
      description: text.slice(0, 200),
    };
  }

  return { intent: "unknown" };
}

/** Corrige intent com valor/tipo inferidos localmente quando a IA erra. */
function enrichIntentFromText(intent: FinancialIntent, text: string): FinancialIntent {
  if (isQueryMessage(text)) {
    const local = parseLocalIntent(text);
    if (local.intent === "query") return local;
  }

  const localValue = parseMoneyAmount(text);
  let enriched: FinancialIntent = { ...intent };

  if (localValue && (!enriched.value || enriched.value <= 0)) {
    enriched = { ...enriched, value: localValue };
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
      };
    }
  }

  if (enriched.intent === "transaction" && enriched.type && enriched.type !== "transfer") {
    const fromText = inferLocalCategory(text, enriched.type);
    const fallback = enriched.type === "income" ? "Outras receitas" : "Outros gastos";
    if (!enriched.category || enriched.category === fallback) {
      enriched = { ...enriched, category: fromText };
    } else if (fromText !== fallback && fromText !== enriched.category) {
      enriched = { ...enriched, category: fromText };
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
  const start = Date.now();

  if (!isOpenAIConfigured()) {
    return enrichIntentFromText(parseLocalIntent(text), text);
  }

  const categoryHint = buildParserPromptWithContext(
    context?.topCategories ?? [],
    context?.expenseCategories,
    context?.incomeCategories,
    context?.conversationHistory,
  );

  try {
    const openai = getOpenAI();
    const model = getOpenAIModel();
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: categoryHint },
        { role: "user", content: text },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = financialIntentSchema.safeParse(JSON.parse(raw));
    const base = parsed.success ? parsed.data : parseLocalIntent(text);
    const result = enrichIntentFromText(base, text);

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
    return enrichIntentFromText(parseLocalIntent(text), text);
  }
}

export async function parseDocumentText(
  extractedText: string,
  userId: string,
): Promise<Array<{ type: "expense" | "income"; value: number; description: string; category?: string; date?: string }>> {
  if (!isOpenAIConfigured()) {
    return [];
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
        content: CONTROLAAI_DOCUMENT_PROMPT,
      },
      { role: "user", content: extractedText.slice(0, 12000) },
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
      .filter((t) => t.value > 0 && (t.type === "expense" || t.type === "income"))
      .map((t) => ({
        type: t.type as "expense" | "income",
        value: t.value,
        description: t.description ?? "",
        category: t.category,
        date: t.date,
      }));
  } catch {
    return [];
  }
}

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
        content: buildParserPromptWithContext([]) + CONTROLAAI_VISION_SUFFIX,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extraia os dados financeiros desta imagem." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
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
