/**
 * Persistência de transações — converte FinancialIntent em linha no banco — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { and, eq } from "drizzle-orm"; // Operadores para filtros de saldo mensal
import { db } from "../src/db/index.js"; // Cliente Drizzle PostgreSQL
import { transactions } from "../src/db/schema.js"; // Tabela transactions
import { formatBrl, monthKey } from "../src/utils/money.js";
import type { FinancialIntent } from "./parser.js";
import { recordCategoryUsage } from "./financial-memory.js";
import { findCategoryId } from "./category-resolver.js";
import { buildRichPostTransactionResponse } from "./assistant-response.js";

export { findCategoryId, listAvailableCategories, normalizeCategoryLabel } from "./category-resolver.js";

/** Cria transação a partir do intent parseado — retorna id e mensagem WhatsApp/chat. */
export async function createTransactionFromIntent(
  userId: string,
  intent: FinancialIntent,
  rawMessage?: string,
  options?: { userName?: string | null },
): Promise<{ transactionId: string; response: string } | null> {
  if (intent.intent !== "transaction" || !intent.type || intent.type === "transfer") {
    return null; // Não é transação ou é transferência — ignora
  }

  if (!intent.value || intent.value <= 0) {
    return {
      transactionId: "",
      response: "❌ Não consegui identificar o valor. Informe quanto foi, ex: *Gastei 50 no mercado*",
    }; // Valor ausente — pede esclarecimento sem salvar
  }

  const type = intent.type === "income" ? "income" : "expense"; // Normaliza tipo para o banco
  const { id: categoryId, resolvedName: categoryName } = await findCategoryId(
    userId,
    intent.category ?? "",
    type,
    intent.description ?? rawMessage, // Usa descrição ou mensagem bruta para inferência
  );

  const occurredAt = intent.date ? new Date(`${intent.date}T12:00:00.000Z`) : new Date(); // Data informada ou hoje (meio-dia UTC)

  const [row] = await db
    .insert(transactions) // INSERT na tabela transactions
    .values({
      userId,
      categoryId, // FK para categories (pode ser null)
      amount: String(intent.value), // numeric no Drizzle = string
      type,
      description: intent.description ?? categoryName, // Descrição ou nome da categoria
      occurredAt,
      source: "whatsapp", // Origem do registro
      rawMessage: rawMessage ?? null, // Mensagem original do usuário
      paymentMethod: intent.paymentMethod ?? null, // pix, cartão, etc.
      installments: intent.installments ?? null, // Parcelas se informadas
    })
    .returning({ id: transactions.id }); // Retorna UUID gerado

  await recordCategoryUsage(userId, categoryName);

  const response = await buildRichPostTransactionResponse(userId, {
    type,
    categoryName,
    amount: intent.value,
    userName: options?.userName,
  });

  return { transactionId: row.id, response };
}

/** Importa múltiplas transações de documento PDF/extrato — retorna quantidade inserida. */
export async function createBulkTransactions(
  userId: string,
  items: Array<{ type: "expense" | "income"; value: number; description: string; category?: string; date?: string }>,
): Promise<number> {
  let count = 0; // Contador de transações inseridas
  for (const item of items) {
    const categoryId = item.category
      ? (await findCategoryId(userId, item.category, item.type)).id // Resolve categoria se informada
      : null;
    await db.insert(transactions).values({
      userId,
      categoryId,
      amount: String(item.value),
      type: item.type,
      description: item.description,
      occurredAt: item.date ? new Date(`${item.date}T12:00:00.000Z`) : new Date(),
      source: "whatsapp", // Import via WhatsApp ou upload
    });
    if (item.category) await recordCategoryUsage(userId, item.category); // Atualiza memória se categoria informada
    count++; // Incrementa contador
  }
  return count; // Total inserido
}
