import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { budgets, categories, transactions, userSettings } from "./schema.js";

type SeedTx = {
  categoryName: string;
  type: "expense" | "income";
  amount: string;
  description: string;
  occurredAt: string;
  source: "whatsapp" | "web" | "recurring" | "manual";
};

const MOCK_TRANSACTIONS: SeedTx[] = [
  { categoryName: "Salário", type: "income", amount: "6500.00", description: "Salário", occurredAt: "2026-04-01T09:00:00.000Z", source: "recurring" },
  { categoryName: "Freelance", type: "income", amount: "2000.00", description: "Freelance design", occurredAt: "2026-04-05T14:30:00.000Z", source: "web" },
  { categoryName: "Moradia", type: "expense", amount: "1800.00", description: "Aluguel", occurredAt: "2026-04-01T08:00:00.000Z", source: "recurring" },
  { categoryName: "Alimentação", type: "expense", amount: "520.30", description: "Supermercado", occurredAt: "2026-04-03T19:15:00.000Z", source: "whatsapp" },
  { categoryName: "Transporte", type: "expense", amount: "45.90", description: "Uber", occurredAt: "2026-04-04T21:40:00.000Z", source: "whatsapp" },
  { categoryName: "Serviços", type: "expense", amount: "55.80", description: "Netflix + Spotify", occurredAt: "2026-04-05T10:00:00.000Z", source: "recurring" },
  { categoryName: "Saúde", type: "expense", amount: "89.90", description: "Farmácia", occurredAt: "2026-04-06T18:20:00.000Z", source: "whatsapp" },
  { categoryName: "Alimentação", type: "expense", amount: "132.00", description: "Restaurante", occurredAt: "2026-04-07T20:00:00.000Z", source: "whatsapp" },
  { categoryName: "Transporte", type: "expense", amount: "250.00", description: "Gasolina", occurredAt: "2026-04-08T07:45:00.000Z", source: "web" },
  { categoryName: "Educação", type: "expense", amount: "197.00", description: "Curso online", occurredAt: "2026-04-09T11:00:00.000Z", source: "web" },
  { categoryName: "Salário", type: "income", amount: "7200.00", description: "Salário", occurredAt: "2026-03-01T09:00:00.000Z", source: "recurring" },
  { categoryName: "Moradia", type: "expense", amount: "1800.00", description: "Aluguel", occurredAt: "2026-03-01T08:00:00.000Z", source: "recurring" },
  { categoryName: "Alimentação", type: "expense", amount: "980.00", description: "Alimentação março", occurredAt: "2026-03-15T12:00:00.000Z", source: "web" },
  { categoryName: "Salário", type: "income", amount: "7500.00", description: "Salário", occurredAt: "2026-02-01T09:00:00.000Z", source: "recurring" },
  { categoryName: "Moradia", type: "expense", amount: "1800.00", description: "Aluguel", occurredAt: "2026-02-01T08:00:00.000Z", source: "recurring" },
  { categoryName: "Salário", type: "income", amount: "7800.00", description: "Salário", occurredAt: "2026-01-01T09:00:00.000Z", source: "recurring" },
  { categoryName: "Moradia", type: "expense", amount: "1800.00", description: "Aluguel", occurredAt: "2026-01-01T08:00:00.000Z", source: "recurring" },
  { categoryName: "Salário", type: "income", amount: "8200.00", description: "Salário", occurredAt: "2025-12-01T09:00:00.000Z", source: "recurring" },
  { categoryName: "Moradia", type: "expense", amount: "1800.00", description: "Aluguel", occurredAt: "2025-12-01T08:00:00.000Z", source: "recurring" },
  { categoryName: "Salário", type: "income", amount: "7200.00", description: "Salário", occurredAt: "2025-11-01T09:00:00.000Z", source: "recurring" },
  { categoryName: "Moradia", type: "expense", amount: "1800.00", description: "Aluguel", occurredAt: "2025-11-01T08:00:00.000Z", source: "recurring" },
];

/** Inserts demo transactions + budget + default settings if user has no transactions yet. */
export async function seedMockDataForUser(userId: string): Promise<{ inserted: number; skipped: boolean }> {
  const existing = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.userId, userId)).limit(1);
  if (existing.length > 0) {
    return { inserted: 0, skipped: true };
  }

  const cats = await db.select().from(categories);
  const byName = new Map(cats.map((c) => [c.name, c.id]));

  let inserted = 0;
  for (const row of MOCK_TRANSACTIONS) {
    const categoryId = byName.get(row.categoryName) ?? null;
    await db.insert(transactions).values({
      userId,
      categoryId,
      amount: row.amount,
      type: row.type,
      description: row.description,
      occurredAt: new Date(row.occurredAt),
      source: row.source,
    });
    inserted++;
  }

  await db
    .insert(budgets)
    .values({
      userId,
      month: "2026-04",
      totalIncomeExpected: "8500.00",
      totalExpenseLimit: "7000.00",
      notes: "Orçamento demo Controla.AI",
    })
    .onConflictDoNothing({ target: [budgets.userId, budgets.month] });

  await db
    .insert(userSettings)
    .values({
      userId,
      alertAt80: true,
      alertAt100: true,
      weeklyReport: false,
      themePreference: "dark",
    })
    .onConflictDoNothing();

  return { inserted, skipped: false };
}
