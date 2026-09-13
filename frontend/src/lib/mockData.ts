/**
 * Dados mock para fallback do dashboard quando não há transações na API.
 * Legado — usado apenas em gráficos de demonstração.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Paleta alternativa (legado — preferir lib/chart-colors.ts). */
// Exporta constante/tipo/classe pública
export const CHART_COLORS = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  '#4CAF50', '#EF5350', '#FFB300', '#42A5F5',
  // Instrução do fluxo — parte da lógica de negócio ou interface
  '#AB47BC', '#26C6DA', '#FFA726', '#78909C',
// Instrução do fluxo — parte da lógica de negócio ou interface
];

// Instrução do fluxo — parte da lógica de negócio ou interface
export interface Transaction {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  description: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  amount: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: 'income' | 'expense';
  // Instrução do fluxo — parte da lógica de negócio ou interface
  category: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryIcon: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  date: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  source: "whatsapp" | "web" | "recurring" | "manual";
}

// Instrução do fluxo — parte da lógica de negócio ou interface
export interface Goal {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryIcon: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  category: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  goalType: 'limit' | 'saving';
  // Instrução do fluxo — parte da lógica de negócio ou interface
  currentAmount: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  targetAmount: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  color: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  period: 'monthly' | 'quarterly' | 'yearly';
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isActive: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  history: { month: string; percentage: number }[];
  // Instrução do fluxo — parte da lógica de negócio ou interface
  riskLevel: 'low' | 'medium' | 'high';
  // Instrução do fluxo — parte da lógica de negócio ou interface
  estimatedCompletion: string;
}

/* Resumo financeiro mensal */
// Exporta constante/tipo/classe pública
export const summaryData = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  balance: 3247.50,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  balanceChange: 12.3,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  totalIncome: 8500.00,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  incomeChange: 5.2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  totalExpense: 5252.50,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  expenseChange: -3.1,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  savingsRate: 38.2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  savingsRateChange: 4.1,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  debtToIncome: 22.5,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  emergencyFundMonths: 4.2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  dailyAvgExpense: 175.08,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  dailyAvgChange: -8.3,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  financialConsistency: 82,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  financialScore: 76,
  /** Cartões secundários / exemplos quando não há transações na API */
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockAvgTicket: 412.5,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockExpenseCount: 12,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockTopCategoryName: "Alimentação",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockTopCategoryShare: 28,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockActiveDays: 9,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockPlannedIncome: 8500,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockLiquidityPct: 62,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockProjectionSimple: 2150,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockNetWorth: 42800,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockNetWorthChangePct: 8.2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mockMonthEndBalance: 3680,
};

/* Transações recentes */
// Exporta constante/tipo/classe pública
export const recentTransactions: Transaction[] = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "1", description: "Salário", amount: 6500, type: "income", category: "Renda", categoryIcon: "briefcase", date: "2026-04-01", source: "recurring" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "2", description: "Freelance design", amount: 2000, type: "income", category: "Renda Extra", categoryIcon: "lightbulb", date: "2026-04-05", source: "web" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "3", description: "Aluguel", amount: 1800, type: "expense", category: "Moradia", categoryIcon: "home", date: "2026-04-01", source: "recurring" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "4", description: "Supermercado", amount: 520.3, type: "expense", category: "Alimentação", categoryIcon: "utensils", date: "2026-04-03", source: "whatsapp" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "5", description: "Uber", amount: 45.9, type: "expense", category: "Transporte", categoryIcon: "car", date: "2026-04-04", source: "whatsapp" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "6", description: "Netflix + Spotify", amount: 55.8, type: "expense", category: "Assinaturas", categoryIcon: "tv", date: "2026-04-05", source: "recurring" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "7", description: "Farmácia", amount: 89.9, type: "expense", category: "Saúde", categoryIcon: "heart-pulse", date: "2026-04-06", source: "whatsapp" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "8", description: "Restaurante", amount: 132, type: "expense", category: "Alimentação", categoryIcon: "utensils", date: "2026-04-07", source: "whatsapp" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "9", description: "Gasolina", amount: 250, type: "expense", category: "Transporte", categoryIcon: "car", date: "2026-04-08", source: "web" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: "10", description: "Curso online", amount: 197, type: "expense", category: "Educação", categoryIcon: "book-open", date: "2026-04-09", source: "web" },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/** Despesas mock ordenadas por data — base para gráficos de fallback no dashboard */
// Constante local
const mockExpenseRowsSorted = [...recentTransactions]
  // Filtra lista — mantém só itens que passam no teste
  .filter((t) => t.type === "expense")
  // Ordena lista (ex.: por data ou valor)
  .sort((a, b) => a.date.localeCompare(b.date));

// Declara função auxiliar interna
function dmLabel(isoDate: string) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [y, m, d] = isoDate.split("-");
  // Retorna valor ou JSX para quem chamou
  return `${d}/${m}`;
}

/** Acumulado de despesas (exemplo) — usado quando não há transações na API */
// Exporta constante/tipo/classe pública
export const mockDashboardCumulativeExpense = (() => {
  // Variável mutável local
  let acc = 0;
  // Retorna valor ou JSX para quem chamou
  return mockExpenseRowsSorted.map((t, idx) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    acc += t.amount;
    // Retorna valor ou JSX para quem chamou
    return {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ord: idx + 1,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      label: dmLabel(t.date),
      // Operação matemática (arredondar, somar, etc.)
      acumulado: Math.round(acc * 100) / 100,
    };
  });
// Passo do algoritmo — executa parte da regra de negócio ou da interface
})();

/** Dispersão dia × valor — fallback dashboard */
// Exporta constante/tipo/classe pública
export const mockDashboardScatterDespesas = mockExpenseRowsSorted.map((t) => ({
  // Recorta parte da lista (paginação ou limite)
  diaMes: Number.parseInt(t.date.slice(8, 10), 10),
  // Instrução do fluxo — parte da lógica de negócio ou interface
  valor: t.amount,
  // Recorta parte da lista (paginação ou limite)
  nome: t.description.slice(0, 28),
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}));

/** Gastos por dia da semana — fallback (a partir das despesas mock) */
// Exporta constante/tipo/classe pública
export const mockDashboardGastosDiaSemana = (() => {
  // Constante local
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  // Constante local
  const sums = [0, 0, 0, 0, 0, 0, 0];
  // Loop — repete para cada item
  for (const t of mockExpenseRowsSorted) {
    // Constante local
    const wd = new Date(`${t.date}T12:00:00`).getDay();
    // Instrução do fluxo — parte da lógica de negócio ou interface
    sums[wd] += t.amount;
  }
  /* Garante visual com várias barras > 0 */
  // Constante local
  const base = labels.map((dia, i) => ({ dia, total: Math.round(sums[i] * 100) / 100 }));
  // Condição — executa bloco só se verdadeira
  if (base.every((b) => b.total === 0)) {
    // Retorna valor ou JSX para quem chamou
    return [
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { dia: "Dom", total: 120 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { dia: "Seg", total: 340 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { dia: "Ter", total: 280 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { dia: "Qua", total: 410 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { dia: "Qui", total: 360 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { dia: "Sex", total: 520 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { dia: "Sáb", total: 480 },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ];
  }
  // Retorna valor ou JSX para quem chamou
  return base;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
})();

/** Despesas por canal — fallback */
// Exporta constante/tipo/classe pública
export const mockDashboardDespesasOrigem = (() => {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const label: Record<string, string> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    whatsapp: "WhatsApp",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    web: "Web",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    recurring: "Recorrente",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    manual: "Manual",
  };
  // Constante local
  const m = new Map<string, number>();
  // Loop — repete para cada item
  for (const t of mockExpenseRowsSorted) {
    // Constante local
    const k = label[t.source] ?? t.source;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  // Constante local
  const rows = [...m.entries()].map(([name, value]) => ({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name,
    // Operação matemática (arredondar, somar, etc.)
    value: Math.round(value * 100) / 100,
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }));
  // Condição — executa bloco só se verdadeira
  if (rows.length === 0) {
    // Retorna valor ou JSX para quem chamou
    return [
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { name: "WhatsApp", value: 890 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { name: "Web", value: 650 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { name: "Recorrente", value: 2110 },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { name: "Manual", value: 420 },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ];
  }
  // Retorna valor ou JSX para quem chamou
  return rows;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
})();

/** Cards do relatório quando não há transações filtradas */
// Exporta constante/tipo/classe pública
export const mockReportLargestExpense = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  id: "mock-largest",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  amount: 1800,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: "expense" as const,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  description: "Aluguel",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  occurredAt: "2026-04-01T08:00:00.000Z",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  source: "recurring" as const,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryId: null as string | null,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryName: "Moradia",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryIcon: "home",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryColor: "#42A5F5",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  createdAt: "2026-04-01T08:00:00.000Z",
};

// Exporta constante/tipo/classe pública
export const mockReportPriciestDay = { day: "2026-04-01", total: 2320.3, count: 2 };

/* Gastos por categoria */
// Exporta constante/tipo/classe pública
export const categoryData = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Moradia", value: 1800, color: "#42A5F5", icon: "home", goal: 2000 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Alimentação", value: 1152.3, color: "#4CAF50", icon: "utensils", goal: 1200 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Transporte", value: 545.9, color: "#FFB300", icon: "car", goal: 600 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Educação", value: 397, color: "#AB47BC", icon: "book-open", goal: 500 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Saúde", value: 289.9, color: "#26C6DA", icon: "heart-pulse", goal: 400 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Assinaturas", value: 155.8, color: "#FFA726", icon: "tv", goal: 200 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Lazer", value: 312, color: "#EF5350", icon: "gamepad-2", goal: 350 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: "Outros", value: 599.6, color: "#78909C", icon: "package", goal: 700 },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Evolução mensal (últimos 6 meses) */
// Exporta constante/tipo/classe pública
export const monthlyEvolution = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { month: 'Nov', income: 7200, expense: 5800, balance: 1400 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { month: 'Dez', income: 8100, expense: 7200, balance: 900 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { month: 'Jan', income: 7500, expense: 5400, balance: 2100 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { month: 'Fev', income: 7800, expense: 5600, balance: 2200 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { month: 'Mar', income: 8200, expense: 5900, balance: 2300 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { month: 'Abr', income: 8500, expense: 5252, balance: 3248 },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Fluxo de caixa diário (valores fixos para gráficos estáveis) */
// Exporta constante/tipo/classe pública
export const cashflowData = Array.from({ length: 30 }, (_, i) => {
  // Constante local
  const day = i + 1;
  // Constante local
  const income = day === 1 ? 6500 : day === 5 ? 2000 : 0;
  // Constante local
  const expense = day <= 11 ? Math.round((120 + (i % 7) * 18 + (i % 3) * 25) * 100) / 100 : 0;
  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    day: `${day}`,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    income,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    expense,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    accumulated: 0,
  };
});

/* Calcula saldo acumulado */
// Variável mutável local
let accCf = 0;
// Instrução do fluxo — parte da lógica de negócio ou interface
cashflowData.forEach((d) => {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  accCf += d.income - d.expense;
  // Operação matemática (arredondar, somar, etc.)
  d.accumulated = Math.round(accCf * 100) / 100;
});

// Constante local
const heatmapAmounts = [180, 95, 310, 0, 220, 145, 88, 400, 175, 260, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
// Constante local
const heatmapCats = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Alimentação"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Transporte"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Alimentação", "Lazer"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  [],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Moradia"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Saúde"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Alimentação"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Lazer", "Transporte"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Educação"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Alimentação"],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ["Serviços"],
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Heatmap de gastos por dia (abril) */
// Exporta constante/tipo/classe pública
export const heatmapData = Array.from({ length: 30 }, (_, i) => ({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  day: i + 1,
  // Cria objeto de data/hora
  weekday: new Date(2026, 3, i + 1).getDay(),
  // Instrução do fluxo — parte da lógica de negócio ou interface
  amount: heatmapAmounts[i] ?? 0,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categories: heatmapCats[i] ?? [],
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}));

/* Radar chart - equilíbrio financeiro */
// Exporta constante/tipo/classe pública
export const radarData = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { category: 'Moradia', current: 90, ideal: 100 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { category: 'Alimentação', current: 96, ideal: 100 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { category: 'Transporte', current: 91, ideal: 100 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { category: 'Educação', current: 79, ideal: 100 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { category: 'Saúde', current: 72, ideal: 100 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { category: 'Lazer', current: 89, ideal: 100 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { category: 'Poupança', current: 76, ideal: 100 },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Bullet chart data (meta vs atual) */
// Exporta constante/tipo/classe pública
export const bulletData = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: 'Alimentação', actual: 1152, target: 1200, ranges: [800, 1000, 1200] },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: 'Transporte', actual: 546, target: 600, ranges: [400, 500, 600] },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: 'Moradia', actual: 1800, target: 2000, ranges: [1500, 1800, 2000] },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: 'Lazer', actual: 312, target: 350, ranges: [200, 280, 350] },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { name: 'Saúde', actual: 290, target: 400, ranges: [200, 300, 400] },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Tendência semanal */
// Exporta constante/tipo/classe pública
export const weeklyTrend = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { week: 'Sem 1', expense: 2420, income: 6500, avg: 1650 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { week: 'Sem 2', expense: 1832, income: 2000, avg: 1650 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { week: 'Sem 3', expense: 620, income: 0, avg: 1650 },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { week: 'Sem 4', expense: 380, income: 0, avg: 1650 },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Distribuição por horário */
// Exporta constante/tipo/classe pública
export const timeDistribution = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { period: 'Manhã (6h-12h)', value: 32, color: '#FFB300' },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { period: 'Tarde (12h-18h)', value: 45, color: '#4CAF50' },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { period: 'Noite (18h-0h)', value: 23, color: '#42A5F5' },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Média móvel de gastos */
// Exporta constante/tipo/classe pública
export const movingAvgData = Array.from({ length: 30 }, (_, i) => ({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  day: `${i + 1}`,
  // Operação matemática (arredondar, somar, etc.)
  daily: i < 11 ? Math.round((95 + (i % 5) * 22 + (i % 4) * 31) * 100) / 100 : 0,
  // Operação matemática (arredondar, somar, etc.)
  avg7d: i < 11 ? Math.round((140 + Math.sin(i / 3) * 28) * 100) / 100 : 0,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  avg30d: 175,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}));

/* Stacked area - fluxo acumulado */
// Exporta constante/tipo/classe pública
export const stackedAreaData = monthlyEvolution.map(m => ({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  month: m.month,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  income: m.income,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  expense: m.expense,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  savings: m.income - m.expense,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}));

/* Metas */
// Exporta constante/tipo/classe pública
export const goalsData: Goal[] = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: "1", name: "Controlar alimentação", categoryIcon: "utensils", category: "Alimentação",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: 'limit', currentAmount: 1152.30, targetAmount: 1200, color: '#4CAF50',
    // Instrução do fluxo — parte da lógica de negócio ou interface
    period: 'monthly', isActive: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    history: [{ month: 'Jan', percentage: 88 }, { month: 'Fev', percentage: 76 }, { month: 'Mar', percentage: 92 }],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    riskLevel: 'high', estimatedCompletion: 'Em andamento',
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: "2", name: "Fundo de emergência", categoryIcon: "piggy-bank", category: "Poupança",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: 'saving', currentAmount: 12600, targetAmount: 25000, color: '#42A5F5',
    // Instrução do fluxo — parte da lógica de negócio ou interface
    period: 'yearly', isActive: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    history: [{ month: 'Jan', percentage: 42 }, { month: 'Fev', percentage: 46 }, { month: 'Mar', percentage: 50 }],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    riskLevel: 'low', estimatedCompletion: 'Ago 2026',
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: "3", name: "Limite transporte", categoryIcon: "car", category: "Transporte",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: 'limit', currentAmount: 545.90, targetAmount: 600, color: '#FFB300',
    // Instrução do fluxo — parte da lógica de negócio ou interface
    period: 'monthly', isActive: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    history: [{ month: 'Jan', percentage: 65 }, { month: 'Fev', percentage: 72 }, { month: 'Mar', percentage: 85 }],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    riskLevel: 'medium', estimatedCompletion: 'Em andamento',
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: "4", name: "Viagem Europa", categoryIcon: "plane", category: "Viagem",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: 'saving', currentAmount: 8200, targetAmount: 15000, color: '#AB47BC',
    // Instrução do fluxo — parte da lógica de negócio ou interface
    period: 'yearly', isActive: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    history: [{ month: 'Jan', percentage: 48 }, { month: 'Fev', percentage: 50 }, { month: 'Mar', percentage: 54 }],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    riskLevel: 'medium', estimatedCompletion: 'Dez 2026',
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    id: "5", name: "Cortar assinaturas", categoryIcon: "tv", category: "Assinaturas",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: 'limit', currentAmount: 155.80, targetAmount: 120, color: '#EF5350',
    // Instrução do fluxo — parte da lógica de negócio ou interface
    period: 'monthly', isActive: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    history: [{ month: 'Jan', percentage: 110 }, { month: 'Fev', percentage: 125 }, { month: 'Mar', percentage: 130 }],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    riskLevel: 'high', estimatedCompletion: 'Excedido',
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Dicas curtas para o painel (linguagem simples) */
// Exporta constante/tipo/classe pública
export const insights = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { type: "warning" as const, text: "Alimentação está um pouco acima do habitual — vale revisar o mês.", iconKey: "utensils" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { type: "success" as const, text: "Reserva de emergência no caminho certo se você mantiver o ritmo.", iconKey: "target" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { type: "info" as const, text: "Fins de semana costumam concentrar mais gastos; é normal, só acompanhe.", iconKey: "bar-chart-3" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { type: "warning" as const, text: "Assinaturas passaram do limite que você definiu — confira o que dá para cortar.", iconKey: "tv" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { type: "success" as const, text: "Sua nota financeira melhorou um pouco em relação ao mês passado.", iconKey: "line-chart" },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/* Conversas IA */
// Exporta constante/tipo/classe pública
export const aiConversations = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: '1', title: 'Análise de gastos de abril', date: '2026-04-10', preview: 'Como posso reduzir meus gastos...' },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: '2', title: 'Planejamento viagem', date: '2026-04-08', preview: 'Preciso juntar para a viagem...' },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { id: '3', title: 'Dicas de investimento', date: '2026-04-05', preview: 'Qual a melhor forma de investir...' },
// Instrução do fluxo — parte da lógica de negócio ou interface
];
