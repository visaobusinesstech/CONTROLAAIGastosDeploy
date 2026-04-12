import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { budgets, categories, transactions, users } from "./schema.js";

/** Conta com pacote completo de dados para demonstração e testes. */
export const RICH_DEMO_EMAIL = "leonardosena1010@hotmail.com";

type SeedTx = {
  categoryName: string;
  type: "expense" | "income";
  amount: string;
  description: string;
  occurredAt: string;
  source: "whatsapp" | "web" | "recurring" | "manual";
};

const expenseCats = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Roupas",
  "Tecnologia",
  "Serviços",
  "Outros gastos",
] as const;

const expenseTemplates: { desc: string; min: number; max: number; cat: (typeof expenseCats)[number]; src: SeedTx["source"] }[] = [
  { desc: "Supermercado", min: 120, max: 620, cat: "Alimentação", src: "whatsapp" },
  { desc: "Padaria", min: 15, max: 45, cat: "Alimentação", src: "whatsapp" },
  { desc: "Restaurante / iFood", min: 35, max: 180, cat: "Alimentação", src: "web" },
  { desc: "Uber / 99", min: 12, max: 55, cat: "Transporte", src: "whatsapp" },
  { desc: "Combustível", min: 180, max: 320, cat: "Transporte", src: "web" },
  { desc: "Estacionamento", min: 8, max: 35, cat: "Transporte", src: "manual" },
  { desc: "Farmácia", min: 25, max: 220, cat: "Saúde", src: "whatsapp" },
  { desc: "Consulta / exame", min: 120, max: 450, cat: "Saúde", src: "web" },
  { desc: "Curso / livro", min: 49, max: 350, cat: "Educação", src: "web" },
  { desc: "Cinema / show", min: 40, max: 180, cat: "Lazer", src: "web" },
  { desc: "Academia", min: 89, max: 120, cat: "Lazer", src: "recurring" },
  { desc: "Roupas / calçado", min: 80, max: 420, cat: "Roupas", src: "web" },
  { desc: "Eletrônicos / acessórios", min: 50, max: 890, cat: "Tecnologia", src: "web" },
  { desc: "Assinaturas (streaming, apps)", min: 39, max: 120, cat: "Serviços", src: "recurring" },
  { desc: "Presentes / diversos", min: 30, max: 280, cat: "Outros gastos", src: "manual" },
];

/** Pseudo-aleatório determinístico (mesmo resultado em todo run). */
function rnd(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function amountBetween(seed: number, min: number, max: number): string {
  const v = min + rnd(seed) * (max - min);
  return v.toFixed(2);
}

function buildRichTransactionList(): SeedTx[] {
  const out: SeedTx[] = [];
  let s = 0;

  const months: { y: number; m: number; salary: string; rent: string }[] = [
    { y: 2025, m: 10, salary: "7100.00", rent: "1750.00" },
    { y: 2025, m: 11, salary: "7100.00", rent: "1750.00" },
    { y: 2025, m: 12, salary: "8900.00", rent: "1750.00" },
    { y: 2026, m: 1, salary: "7200.00", rent: "1800.00" },
    { y: 2026, m: 2, salary: "7200.00", rent: "1800.00" },
    { y: 2026, m: 3, salary: "8200.00", rent: "1800.00" },
    { y: 2026, m: 4, salary: "8500.00", rent: "1800.00" },
  ];

  for (const { y, m, salary, rent } of months) {
    out.push({
      categoryName: "Salário",
      type: "income",
      amount: salary,
      description: "Salário CLT",
      occurredAt: new Date(Date.UTC(y, m - 1, 5, 9, 0, 0)).toISOString(),
      source: "recurring",
    });
    s++;

    if (rnd(s + y + m) > 0.35) {
      out.push({
        categoryName: "Freelance",
        type: "income",
        amount: amountBetween(s + 99, 400, 2400),
        description: "Projeto freelance",
        occurredAt: new Date(Date.UTC(y, m - 1, 12 + (s % 7), 15, 30, 0)).toISOString(),
        source: "web",
      });
      s++;
    }

    if (rnd(s + y * 2) > 0.5) {
      out.push({
        categoryName: "Investimentos",
        type: "income",
        amount: amountBetween(s + 77, 80, 520),
        description: "Dividendos / rendimento",
        occurredAt: new Date(Date.UTC(y, m - 1, 20, 10, 0, 0)).toISOString(),
        source: "web",
      });
      s++;
    }

    out.push({
      categoryName: "Moradia",
      type: "expense",
      amount: rent,
      description: "Aluguel",
      occurredAt: new Date(Date.UTC(y, m - 1, 1, 8, 0, 0)).toISOString(),
      source: "recurring",
    });
    s++;

    if (m === 12 || m === 3) {
      out.push({
        categoryName: "Moradia",
        type: "expense",
        amount: amountBetween(s + 300, 280, 420),
        description: "Condomínio extra / taxa",
        occurredAt: new Date(Date.UTC(y, m - 1, 10, 11, 0, 0)).toISOString(),
        source: "web",
      });
      s++;
    }

    const numExtras = 18 + Math.floor(rnd(s + m * 13) * 14);
    for (let i = 0; i < numExtras; i++) {
      const tmpl = expenseTemplates[(s + i + y * 31 + m) % expenseTemplates.length];
      const day = 2 + Math.floor(rnd(s + i * 17) * 26);
      const hour = 8 + Math.floor(rnd(s + i * 5) * 12);
      const min = Math.floor(rnd(s + i * 3) * 55);
      out.push({
        categoryName: tmpl.cat,
        type: "expense",
        amount: amountBetween(s * 1000 + i * 17 + y + m, tmpl.min, tmpl.max),
        description: tmpl.desc,
        occurredAt: new Date(Date.UTC(y, m - 1, day, hour, min, 0)).toISOString(),
        source: tmpl.src,
      });
      s++;
    }
  }

  /* Extras manuais pontuais */
  const extras: SeedTx[] = [
    {
      categoryName: "Tecnologia",
      type: "expense",
      amount: "3299.00",
      description: "Notebook — parcela 1/6",
      occurredAt: "2026-03-18T14:20:00.000Z",
      source: "manual",
    },
    {
      categoryName: "Educação",
      type: "expense",
      amount: "1297.00",
      description: "Certificação online",
      occurredAt: "2026-02-22T16:00:00.000Z",
      source: "web",
    },
    {
      categoryName: "Lazer",
      type: "expense",
      amount: "890.00",
      description: "Viagem fim de semana",
      occurredAt: "2025-11-08T12:00:00.000Z",
      source: "manual",
    },
    {
      categoryName: "Outras receitas",
      type: "income",
      amount: "1500.00",
      description: "Reembolso corporativo",
      occurredAt: "2026-04-02T11:15:00.000Z",
      source: "web",
    },
  ];
  out.push(...extras);

  return out;
}

const BUDGET_MONTHS: { month: string; income: string; limit: string }[] = [
  { month: "2025-10", income: "7500", limit: "6200" },
  { month: "2025-11", income: "7500", limit: "6300" },
  { month: "2025-12", income: "9500", limit: "7800" },
  { month: "2026-01", income: "7800", limit: "6500" },
  { month: "2026-02", income: "7800", limit: "6400" },
  { month: "2026-03", income: "8800", limit: "7200" },
  { month: "2026-04", income: "9200", limit: "7500" },
];

/**
 * Remove todas as transações do usuário e insere o pacote extenso.
 * Orçamentos dos meses listados são atualizados.
 */
export async function seedRichMockForUserId(userId: string): Promise<{ deleted: boolean; inserted: number }> {
  await db.delete(transactions).where(eq(transactions.userId, userId));

  const rows = buildRichTransactionList();
  const cats = await db.select().from(categories);
  const byName = new Map(cats.map((c) => [c.name, c.id]));

  let inserted = 0;
  for (const row of rows) {
    const categoryId =
      byName.get(row.categoryName) ??
      (row.type === "income" ? byName.get("Outras receitas") : byName.get("Outros gastos")) ??
      null;
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

  for (const b of BUDGET_MONTHS) {
    await db
      .insert(budgets)
      .values({
        userId,
        month: b.month,
        totalIncomeExpected: b.income,
        totalExpenseLimit: b.limit,
        notes: "Pacote Controla.AI — conta demo completa",
      })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.month],
        set: {
          totalIncomeExpected: b.income,
          totalExpenseLimit: b.limit,
          notes: "Pacote Controla.AI — conta demo completa",
        },
      });
  }

  return { deleted: true, inserted };
}

export async function seedRichMockByEmail(email: string): Promise<{ ok: boolean; inserted?: number; error?: string }> {
  const normalized = email.trim().toLowerCase();
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized));
  if (!u) return { ok: false, error: `Usuário não encontrado: ${normalized}` };
  const { inserted } = await seedRichMockForUserId(u.id);
  return { ok: true, inserted };
}
