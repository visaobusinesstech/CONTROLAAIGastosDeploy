import "dotenv/config";
import { db } from "./index.js";
import { categories } from "./schema.js";

const expenseDefaults = [
  { name: "Alimentação", icon: "utensils", color: "#f97316" },
  { name: "Transporte", icon: "car", color: "#3b82f6" },
  { name: "Moradia", icon: "home", color: "#8b5cf6" },
  { name: "Saúde", icon: "heart-pulse", color: "#ef4444" },
  { name: "Educação", icon: "book-open", color: "#06b6d4" },
  { name: "Lazer", icon: "gamepad-2", color: "#ec4899" },
  { name: "Roupas", icon: "shirt", color: "#f59e0b" },
  { name: "Tecnologia", icon: "laptop", color: "#6366f1" },
  { name: "Serviços", icon: "smartphone", color: "#14b8a6" },
  { name: "Outros gastos", icon: "package", color: "#94a3b8" },
];

const incomeDefaults = [
  { name: "Salário", icon: "briefcase", color: "#22c55e" },
  { name: "Freelance", icon: "lightbulb", color: "#84cc16" },
  { name: "Investimentos", icon: "trending-up", color: "#10b981" },
  { name: "Outras receitas", icon: "coins", color: "#34d399" },
];

async function seed() {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) {
    console.log("Seed skipped: categories already exist.");
    process.exit(0);
  }

  await db.insert(categories).values(
    expenseDefaults.map((c) => ({
      userId: null,
      name: c.name,
      icon: c.icon,
      type: "expense" as const,
      color: c.color,
      isDefault: true,
    })),
  );
  await db.insert(categories).values(
    incomeDefaults.map((c) => ({
      userId: null,
      name: c.name,
      icon: c.icon,
      type: "income" as const,
      color: c.color,
      isDefault: true,
    })),
  );
  console.log("Seed OK: default categories inserted.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
