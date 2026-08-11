/** Seed de conta demo com transações e orçamentos — Leonardo Sena. */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  aiConversations,
  categories,
  goalCheckpoints,
  goals,
  recurringTransactions,
  userSettings,
  users,
} from "./schema.js";
import { seedRichMockForUserId } from "./seed-rich-leonardo.js";

export const LEONARDO_SENA_EMAIL = "leonardosena@hotmail.com";
const SALT_ROUNDS = 10;

type GoalSeed = {
  name: string;
  categoryName: string;
  color: string;
  limitAmount: string;
  goalType: "limit" | "saving";
  periodType: "monthly" | "quarterly" | "yearly";
  targetAmount?: string;
  checkpoints: { month: string; spent: string; limit: string; pct: string; exceeded: boolean }[];
};

const GOALS: GoalSeed[] = [
  {
    name: "Controlar alimentação",
    categoryName: "Alimentação",
    color: "#4CAF50",
    limitAmount: "1200.00",
    goalType: "limit",
    periodType: "monthly",
    checkpoints: [
      { month: "2026-01", spent: "980.00", limit: "1200.00", pct: "81.67", exceeded: false },
      { month: "2026-02", spent: "1050.00", limit: "1200.00", pct: "87.50", exceeded: false },
      { month: "2026-03", spent: "1104.00", limit: "1200.00", pct: "92.00", exceeded: false },
      { month: "2026-04", spent: "1152.30", limit: "1200.00", pct: "96.03", exceeded: false },
    ],
  },
  {
    name: "Fundo de emergência",
    categoryName: "Outras receitas",
    color: "#42A5F5",
    limitAmount: "25000.00",
    goalType: "saving",
    periodType: "yearly",
    targetAmount: "25000.00",
    checkpoints: [
      { month: "2026-01", spent: "10500.00", limit: "25000.00", pct: "42.00", exceeded: false },
      { month: "2026-02", spent: "11500.00", limit: "25000.00", pct: "46.00", exceeded: false },
      { month: "2026-03", spent: "12500.00", limit: "25000.00", pct: "50.00", exceeded: false },
      { month: "2026-04", spent: "12600.00", limit: "25000.00", pct: "50.40", exceeded: false },
    ],
  },
  {
    name: "Limite transporte",
    categoryName: "Transporte",
    color: "#FFB300",
    limitAmount: "600.00",
    goalType: "limit",
    periodType: "monthly",
    checkpoints: [
      { month: "2026-01", spent: "390.00", limit: "600.00", pct: "65.00", exceeded: false },
      { month: "2026-02", spent: "432.00", limit: "600.00", pct: "72.00", exceeded: false },
      { month: "2026-03", spent: "510.00", limit: "600.00", pct: "85.00", exceeded: false },
      { month: "2026-04", spent: "545.90", limit: "600.00", pct: "90.98", exceeded: false },
    ],
  },
  {
    name: "Cortar assinaturas",
    categoryName: "Serviços",
    color: "#EF5350",
    limitAmount: "120.00",
    goalType: "limit",
    periodType: "monthly",
    checkpoints: [
      { month: "2026-01", spent: "132.00", limit: "120.00", pct: "110.00", exceeded: true },
      { month: "2026-02", spent: "150.00", limit: "120.00", pct: "125.00", exceeded: true },
      { month: "2026-03", spent: "156.00", limit: "120.00", pct: "130.00", exceeded: true },
      { month: "2026-04", spent: "155.80", limit: "120.00", pct: "129.83", exceeded: true },
    ],
  },
];

export async function seedLeonardoSenaAccount(password: string, name = "Leonardo Sena"): Promise<void> {
  const email = LEONARDO_SENA_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  let userId: string;
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  if (existing) {
    await db.update(users).set({ name, passwordHash, plan: "pro" }).where(eq(users.id, existing.id));
    userId = existing.id;
  } else {
    const [row] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
        plan: "pro",
        phone: null,
      })
      .returning({ id: users.id });
    userId = row.id;
  }

  await db
    .insert(userSettings)
    .values({
      userId,
      alertAt80: true,
      alertAt100: true,
      weeklyReport: true,
      themePreference: "dark",
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        alertAt80: true,
        alertAt100: true,
        weeklyReport: true,
        updatedAt: new Date(),
      },
    });

  const { inserted: txCount } = await seedRichMockForUserId(userId);

  const userGoals = await db.select({ id: goals.id }).from(goals).where(eq(goals.userId, userId));
  for (const g of userGoals) {
    await db.delete(goalCheckpoints).where(eq(goalCheckpoints.goalId, g.id));
  }
  await db.delete(goals).where(eq(goals.userId, userId));
  await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, userId));
  await db.delete(aiConversations).where(eq(aiConversations.userId, userId));

  const cats = await db.select().from(categories);
  const byName = new Map(cats.map((c) => [c.name, c.id]));

  for (const g of GOALS) {
    const categoryId = byName.get(g.categoryName) ?? null;
    const [goalRow] = await db
      .insert(goals)
      .values({
        userId,
        categoryId,
        name: g.name,
        color: g.color,
        limitAmount: g.limitAmount,
        periodType: g.periodType,
        goalType: g.goalType,
        targetAmount: g.targetAmount ?? null,
        isActive: true,
      })
      .returning({ id: goals.id });

    for (const cp of g.checkpoints) {
      await db.insert(goalCheckpoints).values({
        goalId: goalRow.id,
        month: cp.month,
        spentAmount: cp.spent,
        limitSnapshot: cp.limit,
        percentage: cp.pct,
        exceeded: cp.exceeded,
        alert80Sent: Number(cp.pct) >= 80,
        alert100Sent: cp.exceeded,
      });
    }
  }

  const alim = byName.get("Alimentação");
  const moradia = byName.get("Moradia");
  const salario = byName.get("Salário");

  if (moradia) {
    await db.insert(recurringTransactions).values({
      userId,
      categoryId: moradia,
      description: "Aluguel",
      amount: "1800.00",
      type: "expense",
      frequency: "monthly",
      dayOfMonth: 1,
      nextDue: "2026-05-01",
      isActive: true,
    });
  }
  if (salario) {
    await db.insert(recurringTransactions).values({
      userId,
      categoryId: salario,
      description: "Salário CLT",
      amount: "8500.00",
      type: "income",
      frequency: "monthly",
      dayOfMonth: 5,
      nextDue: "2026-05-05",
      isActive: true,
    });
  }
  if (alim) {
    await db.insert(recurringTransactions).values({
      userId,
      categoryId: alim,
      description: "Mercado semanal",
      amount: "450.00",
      type: "expense",
      frequency: "weekly",
      dayOfMonth: 6,
      nextDue: "2026-04-26",
      isActive: true,
    });
  }

  await db.insert(aiConversations).values({
    userId,
    title: "Análise de gastos de abril",
    contextMonth: "2026-04",
    messages: [
      { role: "user", content: "Como posso reduzir meus gastos com alimentação este mês?" },
      {
        role: "assistant",
        content:
          "Você já usou cerca de 96% do limite de alimentação. Priorize compras no supermercado e reduza pedidos por app nos fins de semana.",
      },
    ],
  });

  console.log(`Usuário: ${email}`);
  console.log(`Transações: ${txCount}`);
  console.log(`Metas: ${GOALS.length}`);
}
