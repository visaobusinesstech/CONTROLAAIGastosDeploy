/* Dados mock para o dashboard financeiro Controla.AI */

export const CHART_COLORS = [
  '#4CAF50', '#EF5350', '#FFB300', '#42A5F5',
  '#AB47BC', '#26C6DA', '#FFA726', '#78909C',
];

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryIcon: string;
  date: string;
  source: "whatsapp" | "web" | "recurring" | "manual";
}

export interface Goal {
  id: string;
  name: string;
  categoryIcon: string;
  category: string;
  goalType: 'limit' | 'saving';
  currentAmount: number;
  targetAmount: number;
  color: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  isActive: boolean;
  history: { month: string; percentage: number }[];
  riskLevel: 'low' | 'medium' | 'high';
  estimatedCompletion: string;
}

/* Resumo financeiro mensal */
export const summaryData = {
  balance: 3247.50,
  balanceChange: 12.3,
  totalIncome: 8500.00,
  incomeChange: 5.2,
  totalExpense: 5252.50,
  expenseChange: -3.1,
  savingsRate: 38.2,
  savingsRateChange: 4.1,
  debtToIncome: 22.5,
  emergencyFundMonths: 4.2,
  dailyAvgExpense: 175.08,
  dailyAvgChange: -8.3,
  financialConsistency: 82,
  financialScore: 76,
  /** Cartões secundários / exemplos quando não há transações na API */
  mockAvgTicket: 412.5,
  mockExpenseCount: 12,
  mockTopCategoryName: "Alimentação",
  mockTopCategoryShare: 28,
  mockActiveDays: 9,
  mockPlannedIncome: 8500,
  mockLiquidityPct: 62,
  mockProjectionSimple: 2150,
  mockNetWorth: 42800,
  mockNetWorthChangePct: 8.2,
  mockMonthEndBalance: 3680,
};

/* Transações recentes */
export const recentTransactions: Transaction[] = [
  { id: "1", description: "Salário", amount: 6500, type: "income", category: "Renda", categoryIcon: "briefcase", date: "2026-04-01", source: "recurring" },
  { id: "2", description: "Freelance design", amount: 2000, type: "income", category: "Renda Extra", categoryIcon: "lightbulb", date: "2026-04-05", source: "web" },
  { id: "3", description: "Aluguel", amount: 1800, type: "expense", category: "Moradia", categoryIcon: "home", date: "2026-04-01", source: "recurring" },
  { id: "4", description: "Supermercado", amount: 520.3, type: "expense", category: "Alimentação", categoryIcon: "utensils", date: "2026-04-03", source: "whatsapp" },
  { id: "5", description: "Uber", amount: 45.9, type: "expense", category: "Transporte", categoryIcon: "car", date: "2026-04-04", source: "whatsapp" },
  { id: "6", description: "Netflix + Spotify", amount: 55.8, type: "expense", category: "Assinaturas", categoryIcon: "tv", date: "2026-04-05", source: "recurring" },
  { id: "7", description: "Farmácia", amount: 89.9, type: "expense", category: "Saúde", categoryIcon: "heart-pulse", date: "2026-04-06", source: "whatsapp" },
  { id: "8", description: "Restaurante", amount: 132, type: "expense", category: "Alimentação", categoryIcon: "utensils", date: "2026-04-07", source: "whatsapp" },
  { id: "9", description: "Gasolina", amount: 250, type: "expense", category: "Transporte", categoryIcon: "car", date: "2026-04-08", source: "web" },
  { id: "10", description: "Curso online", amount: 197, type: "expense", category: "Educação", categoryIcon: "book-open", date: "2026-04-09", source: "web" },
];

/** Despesas mock ordenadas por data — base para gráficos de fallback no dashboard */
const mockExpenseRowsSorted = [...recentTransactions]
  .filter((t) => t.type === "expense")
  .sort((a, b) => a.date.localeCompare(b.date));

function dmLabel(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

/** Acumulado de despesas (exemplo) — usado quando não há transações na API */
export const mockDashboardCumulativeExpense = (() => {
  let acc = 0;
  return mockExpenseRowsSorted.map((t, idx) => {
    acc += t.amount;
    return {
      ord: idx + 1,
      label: dmLabel(t.date),
      acumulado: Math.round(acc * 100) / 100,
    };
  });
})();

/** Dispersão dia × valor — fallback dashboard */
export const mockDashboardScatterDespesas = mockExpenseRowsSorted.map((t) => ({
  diaMes: Number.parseInt(t.date.slice(8, 10), 10),
  valor: t.amount,
  nome: t.description.slice(0, 28),
}));

/** Gastos por dia da semana — fallback (a partir das despesas mock) */
export const mockDashboardGastosDiaSemana = (() => {
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const sums = [0, 0, 0, 0, 0, 0, 0];
  for (const t of mockExpenseRowsSorted) {
    const wd = new Date(`${t.date}T12:00:00`).getDay();
    sums[wd] += t.amount;
  }
  /* Garante visual com várias barras > 0 */
  const base = labels.map((dia, i) => ({ dia, total: Math.round(sums[i] * 100) / 100 }));
  if (base.every((b) => b.total === 0)) {
    return [
      { dia: "Dom", total: 120 },
      { dia: "Seg", total: 340 },
      { dia: "Ter", total: 280 },
      { dia: "Qua", total: 410 },
      { dia: "Qui", total: 360 },
      { dia: "Sex", total: 520 },
      { dia: "Sáb", total: 480 },
    ];
  }
  return base;
})();

/** Despesas por canal — fallback */
export const mockDashboardDespesasOrigem = (() => {
  const label: Record<string, string> = {
    whatsapp: "WhatsApp",
    web: "Web",
    recurring: "Recorrente",
    manual: "Manual",
  };
  const m = new Map<string, number>();
  for (const t of mockExpenseRowsSorted) {
    const k = label[t.source] ?? t.source;
    m.set(k, (m.get(k) ?? 0) + t.amount);
  }
  const rows = [...m.entries()].map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));
  if (rows.length === 0) {
    return [
      { name: "WhatsApp", value: 890 },
      { name: "Web", value: 650 },
      { name: "Recorrente", value: 2110 },
      { name: "Manual", value: 420 },
    ];
  }
  return rows;
})();

/** Cards do relatório quando não há transações filtradas */
export const mockReportLargestExpense = {
  id: "mock-largest",
  amount: 1800,
  type: "expense" as const,
  description: "Aluguel",
  occurredAt: "2026-04-01T08:00:00.000Z",
  source: "recurring" as const,
  categoryId: null as string | null,
  categoryName: "Moradia",
  categoryIcon: "home",
  categoryColor: "#42A5F5",
  createdAt: "2026-04-01T08:00:00.000Z",
};

export const mockReportPriciestDay = { day: "2026-04-01", total: 2320.3, count: 2 };

/* Gastos por categoria */
export const categoryData = [
  { name: "Moradia", value: 1800, color: "#42A5F5", icon: "home", goal: 2000 },
  { name: "Alimentação", value: 1152.3, color: "#4CAF50", icon: "utensils", goal: 1200 },
  { name: "Transporte", value: 545.9, color: "#FFB300", icon: "car", goal: 600 },
  { name: "Educação", value: 397, color: "#AB47BC", icon: "book-open", goal: 500 },
  { name: "Saúde", value: 289.9, color: "#26C6DA", icon: "heart-pulse", goal: 400 },
  { name: "Assinaturas", value: 155.8, color: "#FFA726", icon: "tv", goal: 200 },
  { name: "Lazer", value: 312, color: "#EF5350", icon: "gamepad-2", goal: 350 },
  { name: "Outros", value: 599.6, color: "#78909C", icon: "package", goal: 700 },
];

/* Evolução mensal (últimos 6 meses) */
export const monthlyEvolution = [
  { month: 'Nov', income: 7200, expense: 5800, balance: 1400 },
  { month: 'Dez', income: 8100, expense: 7200, balance: 900 },
  { month: 'Jan', income: 7500, expense: 5400, balance: 2100 },
  { month: 'Fev', income: 7800, expense: 5600, balance: 2200 },
  { month: 'Mar', income: 8200, expense: 5900, balance: 2300 },
  { month: 'Abr', income: 8500, expense: 5252, balance: 3248 },
];

/* Fluxo de caixa diário (valores fixos para gráficos estáveis) */
export const cashflowData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const income = day === 1 ? 6500 : day === 5 ? 2000 : 0;
  const expense = day <= 11 ? Math.round((120 + (i % 7) * 18 + (i % 3) * 25) * 100) / 100 : 0;
  return {
    day: `${day}`,
    income,
    expense,
    accumulated: 0,
  };
});

/* Calcula saldo acumulado */
let accCf = 0;
cashflowData.forEach((d) => {
  accCf += d.income - d.expense;
  d.accumulated = Math.round(accCf * 100) / 100;
});

const heatmapAmounts = [180, 95, 310, 0, 220, 145, 88, 400, 175, 260, 90, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const heatmapCats = [
  ["Alimentação"],
  ["Transporte"],
  ["Alimentação", "Lazer"],
  [],
  ["Moradia"],
  ["Saúde"],
  ["Alimentação"],
  ["Lazer", "Transporte"],
  ["Educação"],
  ["Alimentação"],
  ["Serviços"],
];

/* Heatmap de gastos por dia (abril) */
export const heatmapData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  weekday: new Date(2026, 3, i + 1).getDay(),
  amount: heatmapAmounts[i] ?? 0,
  categories: heatmapCats[i] ?? [],
}));

/* Radar chart - equilíbrio financeiro */
export const radarData = [
  { category: 'Moradia', current: 90, ideal: 100 },
  { category: 'Alimentação', current: 96, ideal: 100 },
  { category: 'Transporte', current: 91, ideal: 100 },
  { category: 'Educação', current: 79, ideal: 100 },
  { category: 'Saúde', current: 72, ideal: 100 },
  { category: 'Lazer', current: 89, ideal: 100 },
  { category: 'Poupança', current: 76, ideal: 100 },
];

/* Bullet chart data (meta vs atual) */
export const bulletData = [
  { name: 'Alimentação', actual: 1152, target: 1200, ranges: [800, 1000, 1200] },
  { name: 'Transporte', actual: 546, target: 600, ranges: [400, 500, 600] },
  { name: 'Moradia', actual: 1800, target: 2000, ranges: [1500, 1800, 2000] },
  { name: 'Lazer', actual: 312, target: 350, ranges: [200, 280, 350] },
  { name: 'Saúde', actual: 290, target: 400, ranges: [200, 300, 400] },
];

/* Tendência semanal */
export const weeklyTrend = [
  { week: 'Sem 1', expense: 2420, income: 6500, avg: 1650 },
  { week: 'Sem 2', expense: 1832, income: 2000, avg: 1650 },
  { week: 'Sem 3', expense: 620, income: 0, avg: 1650 },
  { week: 'Sem 4', expense: 380, income: 0, avg: 1650 },
];

/* Distribuição por horário */
export const timeDistribution = [
  { period: 'Manhã (6h-12h)', value: 32, color: '#FFB300' },
  { period: 'Tarde (12h-18h)', value: 45, color: '#4CAF50' },
  { period: 'Noite (18h-0h)', value: 23, color: '#42A5F5' },
];

/* Média móvel de gastos */
export const movingAvgData = Array.from({ length: 30 }, (_, i) => ({
  day: `${i + 1}`,
  daily: i < 11 ? Math.round((95 + (i % 5) * 22 + (i % 4) * 31) * 100) / 100 : 0,
  avg7d: i < 11 ? Math.round((140 + Math.sin(i / 3) * 28) * 100) / 100 : 0,
  avg30d: 175,
}));

/* Stacked area - fluxo acumulado */
export const stackedAreaData = monthlyEvolution.map(m => ({
  month: m.month,
  income: m.income,
  expense: m.expense,
  savings: m.income - m.expense,
}));

/* Metas */
export const goalsData: Goal[] = [
  {
    id: "1", name: "Controlar alimentação", categoryIcon: "utensils", category: "Alimentação",
    goalType: 'limit', currentAmount: 1152.30, targetAmount: 1200, color: '#4CAF50',
    period: 'monthly', isActive: true,
    history: [{ month: 'Jan', percentage: 88 }, { month: 'Fev', percentage: 76 }, { month: 'Mar', percentage: 92 }],
    riskLevel: 'high', estimatedCompletion: 'Em andamento',
  },
  {
    id: "2", name: "Fundo de emergência", categoryIcon: "piggy-bank", category: "Poupança",
    goalType: 'saving', currentAmount: 12600, targetAmount: 25000, color: '#42A5F5',
    period: 'yearly', isActive: true,
    history: [{ month: 'Jan', percentage: 42 }, { month: 'Fev', percentage: 46 }, { month: 'Mar', percentage: 50 }],
    riskLevel: 'low', estimatedCompletion: 'Ago 2026',
  },
  {
    id: "3", name: "Limite transporte", categoryIcon: "car", category: "Transporte",
    goalType: 'limit', currentAmount: 545.90, targetAmount: 600, color: '#FFB300',
    period: 'monthly', isActive: true,
    history: [{ month: 'Jan', percentage: 65 }, { month: 'Fev', percentage: 72 }, { month: 'Mar', percentage: 85 }],
    riskLevel: 'medium', estimatedCompletion: 'Em andamento',
  },
  {
    id: "4", name: "Viagem Europa", categoryIcon: "plane", category: "Viagem",
    goalType: 'saving', currentAmount: 8200, targetAmount: 15000, color: '#AB47BC',
    period: 'yearly', isActive: true,
    history: [{ month: 'Jan', percentage: 48 }, { month: 'Fev', percentage: 50 }, { month: 'Mar', percentage: 54 }],
    riskLevel: 'medium', estimatedCompletion: 'Dez 2026',
  },
  {
    id: "5", name: "Cortar assinaturas", categoryIcon: "tv", category: "Assinaturas",
    goalType: 'limit', currentAmount: 155.80, targetAmount: 120, color: '#EF5350',
    period: 'monthly', isActive: true,
    history: [{ month: 'Jan', percentage: 110 }, { month: 'Fev', percentage: 125 }, { month: 'Mar', percentage: 130 }],
    riskLevel: 'high', estimatedCompletion: 'Excedido',
  },
];

/* Dicas curtas para o painel (linguagem simples) */
export const insights = [
  { type: "warning" as const, text: "Alimentação está um pouco acima do habitual — vale revisar o mês.", iconKey: "utensils" },
  { type: "success" as const, text: "Reserva de emergência no caminho certo se você mantiver o ritmo.", iconKey: "target" },
  { type: "info" as const, text: "Fins de semana costumam concentrar mais gastos; é normal, só acompanhe.", iconKey: "bar-chart-3" },
  { type: "warning" as const, text: "Assinaturas passaram do limite que você definiu — confira o que dá para cortar.", iconKey: "tv" },
  { type: "success" as const, text: "Sua nota financeira melhorou um pouco em relação ao mês passado.", iconKey: "line-chart" },
];

/* Conversas IA */
export const aiConversations = [
  { id: '1', title: 'Análise de gastos de abril', date: '2026-04-10', preview: 'Como posso reduzir meus gastos...' },
  { id: '2', title: 'Planejamento viagem', date: '2026-04-08', preview: 'Preciso juntar para a viagem...' },
  { id: '3', title: 'Dicas de investimento', date: '2026-04-05', preview: 'Qual a melhor forma de investir...' },
];
