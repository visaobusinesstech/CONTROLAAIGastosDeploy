/**
 * Dashboard principal — KPIs, gráficos e transações
 *
 * O que faz: exibe saldo, receitas/despesas, gráficos Recharts, lista filtrável de
 * transações, dialogs de lançamento/edição e orçamento mensal por categoria.
 *
 * Onde entra: rota /dashboard após login; consome api.ts via React Query com cache
 * e invalidação após mutações (POST/PATCH/DELETE transação, PUT budget).
 *
 * UX: filtros por período, tema claro/escuro nos gráficos, demo seed opcional,
 * export CSV e insights quando plano permite.
 *
 * Integrações: financial-summary.ts (cálculos locais), DashboardDialogs, CategoryIcon,
 * backend /api/transactions, /api/kpis, /api/insights.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { MagicCard } from "@/components/ui/magic-card";
import { ChartPlotArea } from "@/components/ChartPlotArea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MonthlyBudgetDialog, TransactionDialog } from "@/components/DashboardDialogs";
import { CategoryIcon } from "@/lib/category-icons";
import { useAuth } from "@/lib/auth";
import {
  apiExportTransactionsCsv,
  apiGetBudget,
  apiGetCategories,
  apiGetMonthlyReport,
  apiGetTransactions,
  apiGetKpis,
  apiGetInsights,
  apiGetSettings,
  apiPostTransaction,
  apiPatchTransaction,
  apiPutBudget,
  apiSeedRichDemo,
  apiDeleteTransaction,
  type ApiTransaction,
} from "@/lib/api";
import {
  computeFinancialPeriodSummary,
  EMPTY_FINANCIAL_COPY,
  INCOME_FREQUENCY_LABELS,
  type IncomeFrequency,
} from "@/lib/financial-summary";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Lightbulb,
  Plus,
  Download,
  CalendarClock,
  CalendarDays,
  Utensils,
  CreditCard,
  AlertTriangle,
  Target,
  Wallet,
  Ban,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend, ComposedChart, ReferenceLine,
  Treemap, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/chart-colors";

/** Tooltip customizado dos gráficos Recharts — adapta cores ao tema. */
// Declara função auxiliar interna
function DashTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  if (!active || !payload?.length) return null;
  return (
    // Tag HTML na interface
    <div
      // Classes CSS Tailwind — controla aparência visual
      className={cn(
        "rounded-xl px-3 py-2 text-xs shadow-none ring-1",
        dark
          ? "bg-[#2C2C2E] text-foreground ring-white/10"
          : "bg-white text-foreground ring-black/5",
      )}
    >
      // Tag HTML na interface
      <p className="font-medium text-foreground mb-1">{label}</p>
      // Percorre lista e renderiza um item para cada elemento
      {payload.map((p, i) => (
        // Tag HTML na interface
        <div key={i} className="flex items-center gap-2">
          // Tag HTML na interface
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          // Tag HTML na interface
          <span className="text-muted-foreground">{p.name}:</span>
          // Tag HTML na interface
          <span className="font-semibold tabular text-foreground">R$ {p.value.toLocaleString("pt-BR")}</span>
        // Tag HTML na interface
        </div>
      ))}
    // Tag HTML na interface
    </div>
  );
}

// Declara função auxiliar interna
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Declara função auxiliar interna
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Declara função auxiliar interna
function startOfMonthFromYm(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, 1));
}

// Declara função auxiliar interna
function endOfMonthFromYm(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  return endOfDay(new Date(y, m, 0));
}

// Declara função auxiliar interna
function monthLabelFromYm(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
}

// Declara função auxiliar interna
function shiftMonthYm(ym: string, delta: number) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Declara função auxiliar interna
function monthShortLabel(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, mo] = ym.split("-").map(Number);
  return format(new Date(y, mo - 1, 1), "MMM", { locale: ptBR }).replace(".", "");
}

// Declara função auxiliar interna
function txAmount(t: ApiTransaction): number {
  const n = typeof t.amount === "number" ? t.amount : Number(t.amount);
  return Number.isFinite(n) ? n : 0;
}

// Declara função auxiliar interna
function aggregateExpensesByCategory(txs: ApiTransaction[]) {
  const map = new Map<string, { value: number; color: string; icon: string | null }>();
  // Loop — repete para cada item
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const name = t.categoryName ?? "Sem categoria";
    const cur = map.get(name) ?? { value: 0, color: "#78909C", icon: t.categoryIcon };
    cur.value += txAmount(t);
    if (t.categoryColor) cur.color = t.categoryColor;
    if (t.categoryIcon) cur.icon = t.categoryIcon;
    map.set(name, cur);
  }
  return [...map.entries()].map(([name, v], i) => ({
    name,
    // Operação matemática (arredondar, somar, etc.)
    value: Math.round(v.value * 100) / 100,
    color: v.color || CHART_COLORS[i % CHART_COLORS.length],
    icon: v.icon,
    // Operação matemática (arredondar, somar, etc.)
    goal: Math.max(v.value * 1.1, 100),
  }));
}

// Declara função auxiliar interna
function periodSummary(
  txs: ApiTransaction[],
  rangeDays: number,
  expectedIncome: number | null,
  initialBalance = 0,
) {
  // Fonte única: ganhos ≠ gastos; faturamento NÃO usa budget nem saldo inicial
  const core = computeFinancialPeriodSummary(txs);
  const income = core.ganhos;
  const expense = core.gastos;
  const balance = core.faturamentoLiquido;
  const saldoComInicial = Math.round((balance + initialBalance) * 100) / 100;
  const days = Math.max(1, rangeDays);
  const dailyAvgExpense = expense / days;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  const expList = txs.filter((t) => t.type === "expense");
  const avgTicket = expList.length ? expense / expList.length : 0;
  let topCat = "";
  let topVal = 0;
  const byCat = aggregateExpensesByCategory(txs);
  // Loop — repete para cada item
  for (const c of byCat) {
    if (c.value > topVal) {
      topVal = c.value;
      topCat = c.name;
    }
  }
  const topShare = expense > 0 ? (topVal / expense) * 100 : 0;
  const budgetVar =
    expectedIncome != null && expectedIncome > 0 && income > 0
      ? ((income - expectedIncome) / expectedIncome) * 100
      : null;
  const score = Math.min(
    100,
    // Operação matemática (arredondar, somar, etc.)
    Math.max(
      0,
      50 + (savingsRate > 20 ? 15 : 0) + (topShare < 45 ? 10 : 0) + (budgetVar != null && budgetVar >= 0 ? 10 : 0),
    ),
  );
  return {
    income,
    expense,
    balance,
    saldoComInicial,
    ganhos: core.ganhos,
    gastos: core.gastos,
    faturamentoBruto: core.faturamentoBruto,
    faturamentoLiquido: core.faturamentoLiquido,
    ganhosCount: core.ganhosCount,
    gastosCount: core.gastosCount,
    isEmpty: core.isEmpty,
    dailyAvgExpense,
    savingsRate,
    avgTicket,
    topCat,
    topShare,
    budgetVar,
    score,
    txCount: txs.length,
    // Percorre lista e renderiza um item para cada elemento
    activeDays: new Set(txs.map((t) => t.occurredAt.slice(0, 10))).size,
  };
}

// Declara função auxiliar interna
function largestExpense(txs: ApiTransaction[]) {
  const ex = txs.filter((t) => t.type === "expense");
  if (!ex.length) return null;
  return ex.reduce((a, b) => (txAmount(a) >= txAmount(b) ? a : b));
}

// Declara função auxiliar interna
function spendByDay(txs: ApiTransaction[]) {
  const map = new Map<string, { total: number; count: number }>();
  // Loop — repete para cada item
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const d = t.occurredAt.slice(0, 10);
    const cur = map.get(d) ?? { total: 0, count: 0 };
    cur.total += txAmount(t);
    cur.count += 1;
    map.set(d, cur);
  }
  let best: { day: string; total: number; count: number } | null = null;
  // Loop — repete para cada item
  for (const [day, v] of map) {
    if (!best || v.total > best.total) best = { day, total: v.total, count: v.count };
  }
  return best;
}

/* Card de métrica — Magic UI + tipografia compacta e simétrica */
// Declara função auxiliar interna
function MetricCard({
  label,
  value,
  change,
  prefix = "R$ ",
  suffix = "",
  trend,
}: {
  label: string;
  value: string;
  change: number;
  prefix?: string;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
}) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const trendColor =
    trend === "up" ? "text-cgreen-500" : trend === "down" ? "text-cred-main" : "text-muted-foreground";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  return (
    // Tag HTML na interface
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      // Classes CSS Tailwind — controla aparência visual
      className="h-full min-h-[112px] rounded-xl"
    >
      // Elemento/componente React na tela
      <MagicCard
        // Classes CSS Tailwind — controla aparência visual
        className="h-full min-h-[112px] rounded-xl border border-border/60"
        gradientFrom="#6ee7b7"
        gradientTo="#22c55e"
        gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
        gradientSize={220}
      >
        // Tag HTML na interface
        <div className="flex h-full min-h-[112px] flex-col justify-between gap-2 px-4 py-3.5 text-left">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground leading-none">
            {label}
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <p className="text-lg font-semibold leading-tight tracking-tight text-foreground tabular">
            {prefix}
            {value}
            {suffix}
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <div className={cn("flex items-center gap-1 text-[11px] font-medium leading-none", trendColor)}>
            // Elemento/componente React na tela
            <TrendIcon size={12} strokeWidth={2.25} className="shrink-0" />
            // Tag HTML na interface
            <span>{Math.abs(change)}% vs mês anterior</span>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      // Elemento/componente React na tela
      </MagicCard>
    // Tag HTML na interface
    </motion.div>
  );
}

/* Chip de filtro */
// Declara função auxiliar interna
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    // Tag HTML na interface
    <button
      // Botão comum (não envia formulário)
      type="button"
      // Executa ação quando o usuário clica
      onClick={onClick}
      // Classes CSS Tailwind — controla aparência visual
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
        active
          ? "border-cgreen-500/40 bg-cgreen-500/15 text-cgreen-600 dark:text-cgreen-400"
          : "border-border bg-muted/50 text-muted-foreground hover:border-cgreen-500/30 hover:bg-cgreen-500/10",
      )}
    >
      {children}
    // Tag HTML na interface
    </button>
  );
}

// Declara função auxiliar interna
function BulletChart({ data, isDark }: { data: Array<{ name: string; actual: number; target: number; ranges: [number, number, number] }>; isDark: boolean }) {
  const track = isDark ? "bg-[#2C2C2E]" : "bg-cgray-50";
  const line = isDark ? "bg-white/80" : "bg-cgray-900";
  return (
    // Tag HTML na interface
    <div className="space-y-4">
      // Percorre lista e renderiza um item para cada elemento
      {data.map((item) => {
        const pct = (item.actual / item.target) * 100;
        const barColor = pct < 60 ? "#4CAF50" : pct < 90 ? "#FFB300" : "#EF5350";
        return (
          // Tag HTML na interface
          <div key={item.name} className="space-y-1.5">
            // Tag HTML na interface
            <div className="flex items-center justify-between text-sm">
              // Tag HTML na interface
              <span className="font-medium text-foreground">{item.name}</span>
              // Tag HTML na interface
              <span className="tabular text-xs text-muted-foreground">
                // Formata número como moeda/texto local (pt-BR)
                R$ {item.actual.toLocaleString("pt-BR")} / R$ {item.target.toLocaleString("pt-BR")}
              // Tag HTML na interface
              </span>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className={cn("relative h-5 overflow-hidden rounded-md", track)}>
              // Tag HTML na interface
              <div className="absolute inset-0 flex">
                // Tag HTML na interface
                <div className="bg-cgreen-50 dark:bg-cgreen-900/25" style={{ width: `${(item.ranges[0] / item.target) * 100}%` }} />
                // Tag HTML na interface
                <div className="bg-camber-light dark:bg-amber-900/20" style={{ width: `${((item.ranges[1] - item.ranges[0]) / item.target) * 100}%` }} />
                // Tag HTML na interface
                <div className="bg-cred-light dark:bg-red-900/20" style={{ width: `${((item.ranges[2] - item.ranges[1]) / item.target) * 100}%` }} />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <motion.div
                initial={{ width: 0 }}
                // Operação matemática (arredondar, somar, etc.)
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                // Classes CSS Tailwind — controla aparência visual
                className="absolute bottom-1 left-0 top-1 rounded"
                style={{ background: barColor }}
              />
              // Tag HTML na interface
              <div className={cn("absolute bottom-0 top-0 w-0.5", line)} style={{ left: "100%" }} />
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
        );
      })}
    // Tag HTML na interface
    </div>
  );
}

/* Heatmap calendário mensal */
// Declara função auxiliar interna
function SpendingHeatmap({ txs }: { txs: ApiTransaction[] }) {
  // Valor memorizado — recalcula só quando dependências mudam
  const heatmapData = useMemo(() => {
    const byDay = new Map<number, number>();
    // Loop — repete para cada item
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const d = new Date(t.occurredAt).getDate();
      byDay.set(d, (byDay.get(d) ?? 0) + txAmount(t));
    }
    return [...byDay.entries()].map(([day, amount]) => ({
      day,
      // Cria objeto de data/hora
      weekday: new Date(new Date().getFullYear(), new Date().getMonth(), day).getDay(),
      amount,
      categories: [],
    }));
  }, [txs]);
  if (heatmapData.length === 0) return null;
  const maxAmount = Math.max(...heatmapData.map((d) => d.amount), 1);
  const weeks: typeof heatmapData[number][][] = [];
  let currentWeek: typeof heatmapData[number][] = [];
  /* Preenche dias vazios no início */
  const firstDay = heatmapData[0].weekday;
  // Loop — repete para cada item
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({ day: 0, weekday: i, amount: -1, categories: [] });
  }
  heatmapData.forEach(d => {
    currentWeek.push(d);
    if (d.weekday === 6) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length) weeks.push(currentWeek);
  const getColor = (amount: number) => {
    if (amount <= 0) return 'transparent';
    const intensity = amount / maxAmount;
    if (intensity < 0.25) return '#C8E6C9';
    if (intensity < 0.5) return '#A5D6A7';
    if (intensity < 0.75) return '#FFB300';
    return '#EF5350';
  };
  return (
    // Tag HTML na interface
    <div className="space-y-3">
      // Tag HTML na interface
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        // Percorre lista e renderiza um item para cada elemento
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          // Tag HTML na interface
          <span key={d}>{d}</span>
        ))}
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="space-y-1">
        // Percorre lista e renderiza um item para cada elemento
        {weeks.map((week, wi) => (
          // Tag HTML na interface
          <div key={wi} className="grid grid-cols-7 gap-1">
            // Percorre lista e renderiza um item para cada elemento
            {week.map((day, di) => (
              // Tag HTML na interface
              <div
                key={di}
                // Classes CSS Tailwind — controla aparência visual
                className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium relative group cursor-default"
                style={{ background: getColor(day.amount) }}
              >
                {day.day > 0 && (
                  <>
                    // Tag HTML na interface
                    <span className={day.amount > 0 ? "text-foreground" : "text-muted-foreground"}>{day.day}</span>
                    {day.amount > 0 && (
                      // Tag HTML na interface
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-cgray-900 text-white px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        R$ {day.amount.toFixed(0)} · {day.categories.join(', ')}
                      // Tag HTML na interface
                      </div>
                    )}
                  </>
                )}
              // Tag HTML na interface
              </div>
            ))}
          // Tag HTML na interface
          </div>
        ))}
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        // Tag HTML na interface
        <span>Menos</span>
        // Percorre lista e renderiza um item para cada elemento
        {['#C8E6C9', '#A5D6A7', '#FFB300', '#EF5350'].map(c => (
          // Tag HTML na interface
          <div key={c} className="w-3 h-3 rounded" style={{ background: c }} />
        ))}
        // Tag HTML na interface
        <span>Mais</span>
      // Tag HTML na interface
      </div>
    // Tag HTML na interface
    </div>
  );
}

export default function Dashboard() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  const isRichDemoAccount = user?.email?.toLowerCase() === "leonardosena1010@hotmail.com";
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Mutação na API (criar/editar/excluir)
  const inactivateTx = useMutation({
    mutationFn: (id: string) => apiDeleteTransaction(token!, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["kpis"] });
      void qc.invalidateQueries({ queryKey: ["monthly"] });
      void qc.invalidateQueries({ queryKey: ["insights"] });
      void qc.invalidateQueries({ queryKey: ["goals"] });
      // Exibe notificação temporária (toast) na tela
      toast.success("Despesa/ganho excluído — indicadores atualizados");
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Mutação na API (criar/editar/excluir)
  const patchTx = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof apiPatchTransaction>[2] }) =>
      apiPatchTransaction(token!, id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["kpis"] });
      void qc.invalidateQueries({ queryKey: ["monthly"] });
      void qc.invalidateQueries({ queryKey: ["insights"] });
      void qc.invalidateQueries({ queryKey: ["goals"] });
      setEditingTx(null);
      // Exibe notificação temporária (toast) na tela
      toast.success("Lançamento atualizado — indicadores recalculados");
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  /* ── Estado local: mês, filtros, modais e calendário ── */
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [periodFilter, setPeriodFilter] = useState("mes");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [goalMode, setGoalMode] = useState(true);
  const [rangeOverride, setRangeOverride] = useState<{ from: Date; to: Date } | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [pickRange, setPickRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [timeStart, setTimeStart] = useState("00:00");
  const [timeEnd, setTimeEnd] = useState("23:59");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<ApiTransaction | null>(null);
  /** Aplica atalho de período (hoje, semana, mês…) aos indicadores. */
  const applyPeriodPreset = (preset: string) => {
    setPeriodFilter(preset);
    const now = new Date();
    if (preset === "hoje") {
      setRangeOverride({ from: startOfDay(now), to: endOfDay(now) });
      return;
    }
    if (preset === "semana") {
      const from = startOfDay(now);
      from.setDate(from.getDate() - from.getDay());
      setRangeOverride({ from, to: endOfDay(now) });
      return;
    }
    if (preset === "mes") {
      setRangeOverride(null);
      setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      return;
    }
    if (preset === "mes_anterior") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      setCurrentMonth(ym);
      setRangeOverride({ from: startOfMonthFromYm(ym), to: endOfMonthFromYm(ym) });
      return;
    }
    if (preset === "ano") {
      setRangeOverride({
        // Cria objeto de data/hora
        from: startOfDay(new Date(now.getFullYear(), 0, 1)),
        to: endOfDay(now),
      });
      return;
    }
    if (preset === "7d" || preset === "30d" || preset === "90d") {
      const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
      const from = startOfDay(now);
      from.setDate(from.getDate() - (days - 1));
      setRangeOverride({ from, to: endOfDay(now) });
      return;
    }
    if (preset === "1 ano") {
      const from = startOfDay(now);
      from.setFullYear(from.getFullYear() - 1);
      setRangeOverride({ from, to: endOfDay(now) });
    }
  };
  // Valor memorizado — recalcula só quando dependências mudam
  const defaultRange = useMemo(
    () => ({ from: startOfMonthFromYm(currentMonth), to: endOfMonthFromYm(currentMonth) }),
    [currentMonth],
  );
  const activeRange = rangeOverride ?? defaultRange;
  const fromIso = activeRange.from.toISOString();
  const toIso = activeRange.to.toISOString();
  const rangeDays = Math.max(
    1,
    // Operação matemática (arredondar, somar, etc.)
    Math.ceil((activeRange.to.getTime() - activeRange.from.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
  /* ── Queries React Query — dados financeiros da API ── */
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: catRes } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => apiGetCategories(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const categories = catRes?.categories ?? [];
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: txRes, isLoading: txListLoading } = useQuery({
    queryKey: ["transactions", token, fromIso, toIso],
    queryFn: () => apiGetTransactions(token!, { from: fromIso, to: toIso }),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const rawTxs = txRes?.transactions ?? [];
  // Valor memorizado — recalcula só quando dependências mudam
  const txs = useMemo(() => {
    let t = rawTxs;
    if (typeFilter === "recurring") t = t.filter((x) => x.source === "recurring");
    // Senão, se outra condição…
    else if (typeFilter === "income" || typeFilter === "expense") t = t.filter((x) => x.type === typeFilter);
    if (catFilter) t = t.filter((x) => (x.categoryName ?? "") === catFilter);
    return t;
  }, [rawTxs, catFilter, typeFilter]);
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: budgetRes } = useQuery({
    queryKey: ["budget", token, currentMonth],
    queryFn: () => apiGetBudget(token!, currentMonth),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const expectedIncome = budgetRes?.budget?.totalIncomeExpected ?? null;
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: monthlyRes } = useQuery({
    queryKey: ["monthly", token],
    queryFn: () => apiGetMonthlyReport(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: kpisRes } = useQuery({
    queryKey: ["kpis", token],
    queryFn: () => apiGetKpis(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: insightsRes } = useQuery({
    queryKey: ["insights", token],
    queryFn: () => apiGetInsights(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: settingsRes } = useQuery({
    queryKey: ["settings", token],
    queryFn: () => apiGetSettings(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const initialBalance = settingsRes?.settings.initialBalance ?? 0;
  // Mutação na API (criar/editar/excluir)
  const seedRichMut = useMutation({
    mutationFn: () => apiSeedRichDemo(token!),
    onSuccess: (d) => {
      // Exibe notificação temporária (toast) na tela
      toast.success(`${d.inserted ?? 0} transações no pacote completo. ${d.message ?? ""}`);
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["budget"] });
      void qc.invalidateQueries({ queryKey: ["monthly"] });
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Valor memorizado — recalcula só quando dependências mudam
  const analytics = useMemo(
    () => periodSummary(txs, rangeDays, expectedIncome, initialBalance),
    [txs, rangeDays, expectedIncome, initialBalance],
  );
  // Valor memorizado — recalcula só quando dependências mudam
  const pieFromApi = useMemo(() => aggregateExpensesByCategory(txs), [txs]);
  const pieData = pieFromApi;
  // Valor memorizado — recalcula só quando dependências mudam
  const treemapExpenseData = useMemo(() => {
    const src = pieFromApi;
    return src.slice(0, 14).map((c) => ({
      name: c.name,
      // Operação matemática (arredondar, somar, etc.)
      size: Math.max(typeof c.value === "number" ? c.value : 0, 1),
      fill: c.color,
    }));
  }, [pieFromApi]);
  // Valor memorizado — recalcula só quando dependências mudam
  const horizontalCategoryRank = useMemo(() => {
    const src = pieFromApi;
    return [...src]
      // Ordena lista (ex.: por data ou valor)
      .sort((a, b) => b.value - a.value)
      // Recorta parte da lista (paginação ou limite)
      .slice(0, 10)
      // Percorre lista e renderiza um item para cada elemento
      .map((c) => ({ name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name, total: c.value }));
  }, [pieFromApi]);
  // Valor memorizado — recalcula só quando dependências mudam
  const cumulativeExpenseData = useMemo(() => {
    const exp = [...txs].filter((t) => t.type === "expense").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    let acc = 0;
    const rows = exp.map((t, idx) => {
      acc += txAmount(t);
      return {
        ord: idx + 1,
        // Formata data em texto legível (pt-BR)
        label: format(new Date(t.occurredAt), "dd/MM", { locale: ptBR }),
        // Operação matemática (arredondar, somar, etc.)
        acumulado: Math.round(acc * 100) / 100,
      };
    });
    return rows;
  }, [txs]);
  // Valor memorizado — recalcula só quando dependências mudam
  const scatterDespesas = useMemo(() => {
    return txs
      // Filtra lista — mantém só itens que passam no teste
      .filter((t) => t.type === "expense")
      // Percorre lista e renderiza um item para cada elemento
      .map((t) => ({
        // Cria objeto de data/hora
        diaMes: new Date(t.occurredAt).getDate(),
        valor: txAmount(t),
        // Recorta parte da lista (paginação ou limite)
        nome: (t.description ?? t.categoryName ?? "Despesa").slice(0, 28),
      }));
  }, [txs]);
  // Valor memorizado — recalcula só quando dependências mudam
  const gastosPorDiaSemana = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const sums = [0, 0, 0, 0, 0, 0, 0];
    // Loop — repete para cada item
    for (const t of txs) {
      if (t.type !== "expense") continue;
      // Cria objeto de data/hora
      sums[new Date(t.occurredAt).getDay()] += txAmount(t);
    }
    return labels.map((dia, i) => ({ dia, total: Math.round(sums[i] * 100) / 100 }));
  }, [txs]);
  // Valor memorizado — recalcula só quando dependências mudam
  const despesasPorOrigem = useMemo(() => {
    const m = new Map<string, number>();
    const label: Record<string, string> = {
      whatsapp: "WhatsApp",
      web: "Web",
      recurring: "Recorrente",
      manual: "Manual",
    };
    // Loop — repete para cada item
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const k = t.source in label ? label[t.source] : t.source;
      m.set(k, (m.get(k) ?? 0) + txAmount(t));
    }
    return [...m.entries()].map(([name, value], i) => ({
      name,
      // Operação matemática (arredondar, somar, etc.)
      value: Math.round(value * 100) / 100,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [txs]);
  /** Acumulado dia a dia — só lançamentos reais (sem renda esperada mockada). */
  // Valor memorizado — recalcula só quando dependências mudam
  const balanceOverTime = useMemo(() => {
    const byDay = new Map<string, { income: number; expense: number }>();
    // Loop — repete para cada item
    for (const t of txs) {
      const d = t.occurredAt.slice(0, 10);
      const cur = byDay.get(d) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += txAmount(t);
      // Senão — caminho alternativo
      else cur.expense += txAmount(t);
      byDay.set(d, cur);
    }
    const sorted = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    let acc = initialBalance;
    return sorted.map(([day, v]) => {
      acc += v.income - v.expense;
      return {
        // Formata data em texto legível (pt-BR)
        day: format(new Date(`${day}T12:00:00`), "dd/MM", { locale: ptBR }),
        // Operação matemática (arredondar, somar, etc.)
        accumulated: Math.round(acc * 100) / 100,
      };
    });
  }, [txs, initialBalance]);
  /** Gastos diários com média móvel de 7 dias. */
  // Valor memorizado — recalcula só quando dependências mudam
  const expenseDailyWithAvg = useMemo(() => {
    const byDay = new Map<string, number>();
    // Loop — repete para cada item
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const d = t.occurredAt.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + txAmount(t));
    }
    const sorted = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dailyValues = sorted.map(([, v]) => v);
    return sorted.map(([day, daily], idx) => {
      const window = dailyValues.slice(Math.max(0, idx - 6), idx + 1);
      const avg7d = window.reduce((s, x) => s + x, 0) / window.length;
      return {
        // Formata data em texto legível (pt-BR)
        label: format(new Date(`${day}T12:00:00`), "dd/MM", { locale: ptBR }),
        // Operação matemática (arredondar, somar, etc.)
        daily: Math.round(daily * 100) / 100,
        // Operação matemática (arredondar, somar, etc.)
        avg7d: Math.round(avg7d * 100) / 100,
      };
    });
  }, [txs]);
  // Valor memorizado — recalcula só quando dependências mudam
  const gastosPorDiaSemanaComposed = useMemo(() => {
    const avg =
      // Filtra lista — mantém só itens que passam no teste
      gastosPorDiaSemana.reduce((s, r) => s + r.total, 0) / Math.max(gastosPorDiaSemana.filter((r) => r.total > 0).length, 1);
    return gastosPorDiaSemana.map((r) => ({ ...r, avg: Math.round(avg * 100) / 100 }));
  }, [gastosPorDiaSemana]);
  // Valor memorizado — recalcula só quando dependências mudam
  const radarCategoryData = useMemo(
    // Percorre lista e renderiza um item para cada elemento
    () => pieFromApi.map((p) => ({ category: p.name, value: p.value, fullMark: Math.max(p.value * 1.2, 100) })),
    [pieFromApi],
  );
  // Valor memorizado — recalcula só quando dependências mudam
  const barEvolution = useMemo(() => {
    const rows = monthlyRes?.months ?? [];
    if (rows.length < 1) return [];
    const last = rows.slice(-6);
    return last.map((r) => ({
      month: monthShortLabel(r.month),
      income: r.income,
      expense: r.expense,
      balance: r.balance,
    }));
  }, [monthlyRes]);
  // Valor memorizado — recalcula só quando dependências mudam
  const stackedFromApi = useMemo(() => {
    const rows = monthlyRes?.months ?? [];
    if (rows.length < 1) return [];
    return rows.map((r) => ({
      month: monthShortLabel(r.month),
      income: r.income,
      expense: r.expense,
      savings: r.income - r.expense,
    }));
  }, [monthlyRes]);
  const largest = largestExpense(txs);
  const priciestDay = spendByDay(txs);
  // Valor memorizado — recalcula só quando dependências mudam
  const concentrationLabel = useMemo(() => {
    if (analytics.topCat) return `${analytics.topCat} · ${analytics.topShare.toFixed(0)}%`;
    return "—";
  }, [analytics.topCat, analytics.topShare]);
  // Valor memorizado — recalcula só quando dependências mudam
  const expenseCount = useMemo(() => txs.filter((t) => t.type === "expense").length, [txs]);
  const hasExpenseData = expenseCount > 0;
  // Valor memorizado — recalcula só quando dependências mudam
  const secondaryCards = useMemo(() => {
    const ticket = hasExpenseData ? analytics.avgTicket : 0;
    const ticketNote = hasExpenseData ? `${expenseCount} despesas` : "Sem despesas no período";
    const topCat = analytics.topCat ?? "—";
    const topNote = analytics.topCat ? `${analytics.topShare.toFixed(0)}% do que você gastou` : "Registre gastos";
    const days = analytics.activeDays;
    const daysNote = txs.length ? "Neste período" : "Sem registros";
    const planned = expectedIncome ?? 0;
    const plannedStr = `R$ ${planned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    let plannedNote: string;
    if (expectedIncome == null) plannedNote = "Defina o valor em Renda mensal";
    // Senão, se outra condição…
    else if (txs.length && analytics.income > 0)
      plannedNote = analytics.budgetVar != null && analytics.budgetVar >= 0 ? "Receita acima do planejado" : "Receita abaixo do planejado";
    // Senão — caminho alternativo
    else plannedNote = "Valor que você planejou receber";
    const liq = analytics.expense > 0 ? Math.round((analytics.balance / analytics.expense) * 100) : 0;
    const liqNote = analytics.expense > 0 ? "Sobra para cada R$ 1 de gasto" : "Sem gastos no período";
    const proj = Math.max(0, analytics.balance - analytics.dailyAvgExpense * 5);
    const projStr = `R$ ${proj.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    return { ticket, ticketNote, topCat, topNote, days, daysNote, plannedStr, plannedNote, liq, liqNote, projStr };
  }, [txs, analytics, expenseCount, hasExpenseData, expectedIncome]);
  // Valor memorizado — recalcula só quando dependências mudam
  const monthEndPreview = useMemo(() => {
    if (!txs.length) return 0;
    const rest = Math.max(0, 30 - analytics.activeDays);
    return analytics.balance - analytics.dailyAvgExpense * rest;
  }, [txs.length, analytics.balance, analytics.activeDays, analytics.dailyAvgExpense]);
  const monthLabel = monthLabelFromYm(currentMonth);
  /* ── UI: cabeçalho, KPIs, gráficos Recharts e lista de transações ── */
  return (
    // Tag HTML na interface
    <div className="space-y-6 min-w-0 max-w-full">
      // Tag HTML na interface
      <div className="flex flex-col gap-4">
        // Tag HTML na interface
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          // Tag HTML na interface
          <div className="flex items-center justify-center gap-2 sm:justify-start sm:gap-3">
            // Tag HTML na interface
            <button
              // Botão comum (não envia formulário)
              type="button"
              // Executa ação quando o usuário clica
              onClick={() => {
                setCurrentMonth(shiftMonthYm(currentMonth, -1));
                setRangeOverride(null);
              }}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              // Elemento/componente React na tela
              <ChevronLeft size={16} />
            // Tag HTML na interface
            </button>
            // Tag HTML na interface
            <h1 className="text-lg font-semibold capitalize tracking-tight text-foreground sm:text-xl">{monthLabel}</h1>
            // Tag HTML na interface
            <button
              // Botão comum (não envia formulário)
              type="button"
              // Executa ação quando o usuário clica
              onClick={() => {
                setCurrentMonth(shiftMonthYm(currentMonth, 1));
                setRangeOverride(null);
              }}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              // Elemento/componente React na tela
              <ChevronRight size={16} />
            // Tag HTML na interface
            </button>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <button
            // Botão comum (não envia formulário)
            type="button"
            // Executa ação quando o usuário clica
            onClick={() => setShowFilters(!showFilters)}
            // Classes CSS Tailwind — controla aparência visual
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            // Elemento/componente React na tela
            <Filter size={16} />
            Filtros
          // Tag HTML na interface
          </button>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex flex-wrap items-center gap-2">
          // Elemento/componente React na tela
          <Popover
            open={calOpen}
            onOpenChange={(o) => {
              setCalOpen(o);
              if (o) {
                setPickRange({ from: activeRange.from, to: activeRange.to });
                // Formata data em texto legível (pt-BR)
                setTimeStart(format(activeRange.from, "HH:mm"));
                // Formata data em texto legível (pt-BR)
                setTimeEnd(format(activeRange.to, "HH:mm"));
              }
            }}
          >
            // Elemento/componente React na tela
            <PopoverTrigger asChild>
              // Elemento/componente React na tela
              <Button type="button" variant="outline" size="sm" className="max-w-full gap-2 border-border bg-card text-xs sm:text-sm">
                // Elemento/componente React na tela
                <CalendarClock className="h-4 w-4 shrink-0" />
                // Tag HTML na interface
                <span className="truncate">
                  // Tag HTML na interface
                  <span className="sm:hidden">{format(activeRange.from, "dd/MM", { locale: ptBR })} — {format(activeRange.to, "dd/MM", { locale: ptBR })}</span>
                  // Tag HTML na interface
                  <span className="hidden sm:inline">
                    // Formata data em texto legível (pt-BR)
                    {format(activeRange.from, "dd/MM/yyyy HH:mm", { locale: ptBR })} —{" "}
                    // Formata data em texto legível (pt-BR)
                    {format(activeRange.to, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  // Tag HTML na interface
                  </span>
                // Tag HTML na interface
                </span>
              // Elemento/componente React na tela
              </Button>
            // Elemento/componente React na tela
            </PopoverTrigger>
            // Elemento/componente React na tela
            <PopoverContent className="w-auto p-0" align="start">
              // Tag HTML na interface
              <div className="p-3 space-y-3 border-b border-border">
                // Elemento/componente React na tela
                <Calendar
                  mode="range"
                  numberOfMonths={1}
                  locale={ptBR}
                  selected={pickRange as { from?: Date; to?: Date }}
                  onSelect={(r) => setPickRange(r ?? undefined)}
                  defaultMonth={pickRange?.from ?? activeRange.from}
                />
                // Tag HTML na interface
                <div className="grid grid-cols-2 gap-2">
                  // Tag HTML na interface
                  <div>
                    // Tag HTML na interface
                    <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Hora início</p>
                    // Tag HTML na interface
                    <input
                      type="time"
                      value={timeStart}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setTimeStart(e.target.value)}
                      // Classes CSS Tailwind — controla aparência visual
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <div>
                    // Tag HTML na interface
                    <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Hora fim</p>
                    // Tag HTML na interface
                    <input
                      type="time"
                      value={timeEnd}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setTimeEnd(e.target.value)}
                      // Classes CSS Tailwind — controla aparência visual
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  // Tag HTML na interface
                  </div>
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <div className="flex gap-2 justify-end">
                  // Elemento/componente React na tela
                  <Button
                    // Botão comum (não envia formulário)
                    type="button"
                    variant="ghost"
                    size="sm"
                    // Executa ação quando o usuário clica
                    onClick={() => {
                      setRangeOverride(null);
                      setCalOpen(false);
                    }}
                  >
                    Mês atual
                  // Elemento/componente React na tela
                  </Button>
                  // Elemento/componente React na tela
                  <Button
                    // Botão comum (não envia formulário)
                    type="button"
                    size="sm"
                    // Classes CSS Tailwind — controla aparência visual
                    className="bg-cgreen-500 hover:bg-cgreen-700"
                    // Executa ação quando o usuário clica
                    onClick={() => {
                      if (!pickRange?.from || !pickRange?.to) return;
                      // Percorre lista e renderiza um item para cada elemento
                      const [sh, sm] = timeStart.split(":").map(Number);
                      // Percorre lista e renderiza um item para cada elemento
                      const [eh, em] = timeEnd.split(":").map(Number);
                      const from = new Date(pickRange.from);
                      from.setHours(sh, sm, 0, 0);
                      const to = new Date(pickRange.to);
                      to.setHours(eh, em, 59, 999);
                      setRangeOverride({ from, to });
                      setCalOpen(false);
                    }}
                  >
                    Aplicar
                  // Elemento/componente React na tela
                  </Button>
                // Tag HTML na interface
                </div>
              // Tag HTML na interface
              </div>
            // Elemento/componente React na tela
            </PopoverContent>
          // Elemento/componente React na tela
          </Popover>
          // Elemento/componente React na tela
          <Button
            // Botão comum (não envia formulário)
            type="button"
            size="sm"
            // Classes CSS Tailwind — controla aparência visual
            className="gap-1.5 bg-cgreen-500 hover:bg-cgreen-700"
            // Executa ação quando o usuário clica
            onClick={() => setExpenseOpen(true)}
          >
            // Elemento/componente React na tela
            <Plus className="h-4 w-4" />
            Adicionar despesa
          // Elemento/componente React na tela
          </Button>
          // Elemento/componente React na tela
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => setIncomeOpen(true)}>
            // Elemento/componente React na tela
            <Wallet className="h-4 w-4" />
            Registrar ganho
          // Elemento/componente React na tela
          </Button>
          // Elemento/componente React na tela
          <Button type="button" size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => setBudgetOpen(true)}>
            Renda mensal
          // Elemento/componente React na tela
          </Button>
          // Elemento/componente React na tela
          <Button
            // Botão comum (não envia formulário)
            type="button"
            size="sm"
            variant="outline"
            // Classes CSS Tailwind — controla aparência visual
            className="gap-1.5 border-border"
            // Desabilita botão/campo (ex.: durante envio)
            disabled={!token}
            // Executa ação quando o usuário clica
            onClick={async () => {
              try {
                const blob = await apiExportTransactionsCsv(token!, { from: fromIso, to: toIso });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "controla-transacoes.csv";
                a.click();
                URL.revokeObjectURL(url);
                // Exibe notificação temporária (toast) na tela
                toast.success("Planilha exportada.");
              } catch (e) {
                // Exibe notificação temporária (toast) na tela
                toast.error(e instanceof Error ? e.message : "Falha ao exportar");
              }
            }}
          >
            // Elemento/componente React na tela
            <Download className="h-4 w-4" />
            Exportar CSV
          // Elemento/componente React na tela
          </Button>
          {isRichDemoAccount && (
            // Elemento/componente React na tela
            <Button
              // Botão comum (não envia formulário)
              type="button"
              size="sm"
              variant="secondary"
              // Classes CSS Tailwind — controla aparência visual
              className="gap-1.5"
              // Desabilita botão/campo (ex.: durante envio)
              disabled={seedRichMut.isPending || !token}
              // Executa ação quando o usuário clica
              onClick={() => {
                if (confirm("Substituir todas as transações pelo pacote completo de demonstração?")) seedRichMut.mutate();
              }}
            >
              Pacote completo
            // Elemento/componente React na tela
            </Button>
          )}
        // Tag HTML na interface
        </div>
        {showFilters && (
          // Tag HTML na interface
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            // Classes CSS Tailwind — controla aparência visual
            className="space-y-4 rounded-xl border border-border bg-card p-4"
          >
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Período</p>
              // Tag HTML na interface
              <div className="flex gap-2 flex-wrap">
                {[
                  { l: "Hoje", v: "hoje" },
                  { l: "Esta semana", v: "semana" },
                  { l: "Este mês", v: "mes" },
                  { l: "Mês anterior", v: "mes_anterior" },
                  { l: "Este ano", v: "ano" },
                  { l: "7 dias", v: "7d" },
                  { l: "30 dias", v: "30d" },
                  { l: "90 dias", v: "90d" },
                // Percorre lista e renderiza um item para cada elemento
                ].map((p) => (
                  // Elemento/componente React na tela
                  <FilterChip key={p.v} active={periodFilter === p.v} onClick={() => applyPeriodPreset(p.v)}>
                    {p.l}
                  // Elemento/componente React na tela
                  </FilterChip>
                ))}
              // Tag HTML na interface
              </div>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</p>
              // Tag HTML na interface
              <div className="flex gap-2 flex-wrap">
                // Percorre lista e renderiza um item para cada elemento
                {[{ l: 'Ganho', v: 'income' }, { l: 'Despesa', v: 'expense' }, { l: 'Recorrente', v: 'recurring' }].map(t => (
                  // Elemento/componente React na tela
                  <FilterChip key={t.v} active={typeFilter === t.v} onClick={() => setTypeFilter(typeFilter === t.v ? null : t.v)}>
                    {t.l}
                  // Elemento/componente React na tela
                  </FilterChip>
                ))}
              // Tag HTML na interface
              </div>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categorias</p>
              // Tag HTML na interface
              <div className="flex gap-2 flex-wrap">
                // Percorre lista e renderiza um item para cada elemento
                {categories.filter((c) => c.type === "expense").map(c => (
                  // Elemento/componente React na tela
                  <FilterChip
                    key={c.name}
                    active={catFilter === c.name}
                    // Executa ação quando o usuário clica
                    onClick={() => setCatFilter(catFilter === c.name ? null : c.name)}
                  >
                    // Elemento/componente React na tela
                    <CategoryIcon name={c.icon} size={14} className="shrink-0 text-muted-foreground" />
                    {c.name}
                  // Elemento/componente React na tela
                  </FilterChip>
                ))}
              // Tag HTML na interface
              </div>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="flex flex-wrap gap-6">
              // Tag HTML na interface
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                // Tag HTML na interface
                <input
                  type="checkbox"
                  checked={compareMode}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setCompareMode(e.target.checked)}
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-4 w-4 rounded border-border text-cgreen-500 focus:ring-cgreen-500"
                />
                Comparar com período anterior
              // Tag HTML na interface
              </label>
              // Tag HTML na interface
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                // Tag HTML na interface
                <input
                  type="checkbox"
                  checked={goalMode}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setGoalMode(e.target.checked)}
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-4 w-4 rounded border-border text-cgreen-500 focus:ring-cgreen-500"
                />
                Modo metas
              // Tag HTML na interface
              </label>
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </motion.div>
        )}
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        // Elemento/componente React na tela
        <MetricCard
          label="Ganhos no período"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.ganhos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={analytics.ganhosCount}
          trend={analytics.ganhosCount ? "up" : "neutral"}
        />
        // Elemento/componente React na tela
        <MetricCard
          label="Gastos no período"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.gastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={analytics.gastosCount}
          trend={analytics.gastosCount ? "down" : "neutral"}
        />
        // Elemento/componente React na tela
        <MetricCard
          label="Faturamento bruto"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.faturamentoBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={0}
          trend={analytics.faturamentoBruto > 0 ? "up" : "neutral"}
        />
        // Elemento/componente React na tela
        <MetricCard
          label="Faturamento líquido"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.faturamentoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Operação matemática (arredondar, somar, etc.)
          change={txs.length ? Math.min(99, Math.abs(analytics.savingsRate)) : 0}
          trend={analytics.faturamentoLiquido >= 0 ? "up" : "down"}
        />
        // Elemento/componente React na tela
        <MetricCard
          label="Gasto médio por dia"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.dailyAvgExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={0}
          trend="down"
        />
        // Elemento/componente React na tela
        <MetricCard
          label="Sua nota (0–100)"
          // Operação matemática (arredondar, somar, etc.)
          value={(kpisRes?.kpis?.financialScore ?? Math.round(analytics.score)).toString()}
          change={0}
          prefix=""
          suffix="/100"
          trend="up"
        />
      // Tag HTML na interface
      </div>
      {analytics.isEmpty && (
        // Tag HTML na interface
        <p className="text-sm text-muted-foreground">
          {EMPTY_FINANCIAL_COPY.ganhos} {EMPTY_FINANCIAL_COPY.gastos}
        // Tag HTML na interface
        </p>
      )}
      {kpisRes?.kpis && (
        // Tag HTML na interface
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          // Tag HTML na interface
          <div className="rounded-xl border border-cgreen-500/30 bg-cgreen-50/50 dark:bg-cgreen-900/10 p-4">
            // Tag HTML na interface
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Score Financeiro IA</p>
            // Tag HTML na interface
            <p className="text-2xl font-bold text-cgreen-600 dark:text-cgreen-400">{kpisRes.kpis.financialScore}/100</p>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl border border-border bg-card p-4">
            // Tag HTML na interface
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {(kpisRes.kpis.expectedIncome ?? 0) > 0 ? "Disponível estimado" : "Previsão saldo fim do mês"}
            // Tag HTML na interface
            </p>
            // Tag HTML na interface
            <p className="text-lg font-semibold tabular">
              R${" "}
              {((kpisRes.kpis.expectedIncome ?? 0) > 0
                ? kpisRes.kpis.projectedAvailable ?? 0
                : kpisRes.kpis.endOfMonthBalanceProjection
              // Formata número como moeda/texto local (pt-BR)
              ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            // Tag HTML na interface
            </p>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl border border-border bg-card p-4">
            // Tag HTML na interface
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Projeção de gastos</p>
            // Tag HTML na interface
            <p className="text-lg font-semibold tabular">R$ {kpisRes.kpis.expenseProjection.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl border border-border bg-card p-4">
            // Tag HTML na interface
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tendência</p>
            // Tag HTML na interface
            <p className="text-lg font-semibold capitalize">{kpisRes.kpis.trend === "up" ? "📈 Positiva" : kpisRes.kpis.trend === "down" ? "📉 Negativa" : "➡️ Estável"}</p>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl border border-border bg-card p-4">
            // Tag HTML na interface
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risco endividamento</p>
            // Tag HTML na interface
            <p className="text-lg font-semibold capitalize">{kpisRes.kpis.debtRisk === "low" ? "Baixo" : kpisRes.kpis.debtRisk === "medium" ? "Médio" : "Alto"}</p>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl border border-border bg-card p-4">
            // Tag HTML na interface
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Meta estimada</p>
            // Tag HTML na interface
            <p className="text-lg font-semibold">{kpisRes.kpis.goalCompletionMonths ? `${kpisRes.kpis.goalCompletionMonths} meses` : "—"}</p>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      )}
      {(insightsRes?.insights?.length ?? 0) > 0 && (
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <div className="flex items-center gap-2 mb-3">
            // Elemento/componente React na tela
            <Lightbulb size={16} className="text-camber-main" />
            // Tag HTML na interface
            <h3 className="text-sm font-semibold">Insights IA</h3>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <ul className="space-y-1 text-sm text-muted-foreground">
            // Percorre lista e renderiza um item para cada elemento
            {insightsRes!.insights.map((insight, i) => (
              // Tag HTML na interface
              <li key={i}>• {insight}</li>
            ))}
          // Tag HTML na interface
          </ul>
        // Tag HTML na interface
        </div>
      )}
      // Tag HTML na interface
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        // Tag HTML na interface
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Valor médio por compra</p>
          // Tag HTML na interface
          <p className="text-lg font-semibold tabular text-foreground">
            // Formata número como moeda/texto local (pt-BR)
            R$ {secondaryCards.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">{secondaryCards.ticketNote}</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Onde mais gastou</p>
          // Tag HTML na interface
          <p className="truncate text-lg font-semibold text-foreground">{secondaryCards.topCat}</p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">{secondaryCards.topNote}</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dias com registro</p>
          // Tag HTML na interface
          <p className="text-lg font-semibold tabular text-foreground">{secondaryCards.days}</p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">{secondaryCards.daysNote}</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Renda que você planejou</p>
          // Tag HTML na interface
          <p className="text-lg font-semibold tabular text-foreground">{secondaryCards.plannedStr}</p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">{secondaryCards.plannedNote}</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Sobra vs. gastos</p>
          // Tag HTML na interface
          <p className="text-lg font-semibold tabular text-cgreen-500">{secondaryCards.liq}%</p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">{secondaryCards.liqNote}</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dinheiro após ~5 dias</p>
          // Tag HTML na interface
          <p className="text-lg font-semibold tabular text-foreground">{secondaryCards.projStr}</p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">Se o ritmo de gasto continuar igual</p>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        // Tag HTML na interface
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Faturamento líquido</p>
          // Tag HTML na interface
          <p className="text-xl font-semibold tabular tracking-tight text-cgreen-500">
            // Formata número como moeda/texto local (pt-BR)
            R$ {analytics.faturamentoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">Ganhos − gastos (dados reais)</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Risco endividamento</p>
          // Tag HTML na interface
          <p className="text-xl font-semibold tabular tracking-tight text-foreground capitalize">
            {kpisRes?.kpis?.debtRisk === "high" ? "Alto" : kpisRes?.kpis?.debtRisk === "medium" ? "Médio" : "Baixo"}
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">Calculado pela IA</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Projeção fim do mês</p>
          // Tag HTML na interface
          <p className="text-xl font-semibold tabular tracking-tight text-foreground">
            // Formata número como moeda/texto local (pt-BR)
            R$ {(kpisRes?.kpis?.endOfMonthBalanceProjection ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">Baseado nos gastos atuais</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Transações no período</p>
          // Tag HTML na interface
          <p className="text-xl font-semibold tabular tracking-tight text-foreground">{txs.length}</p>
          // Tag HTML na interface
          <p className="text-[11px] text-muted-foreground">{expenseCount} despesas registradas</p>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gastos por categoria</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Cada fatia mostra quanto foi para cada tipo de despesa.</p>
          {pieData.length === 0 ? (
            // Tag HTML na interface
            <p className="py-12 text-center text-sm text-muted-foreground">{EMPTY_FINANCIAL_COPY.gastos}</p>
          ) : (
          <>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <PieChart>
                // Elemento/componente React na tela
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  animationDuration={600}
                >
                  // Percorre lista e renderiza um item para cada elemento
                  {pieData.map((entry, i) => (
                    // Elemento/componente React na tela
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                // Elemento/componente React na tela
                </Pie>
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
              // Elemento/componente React na tela
              </PieChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
          // Tag HTML na interface
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            // Percorre lista e renderiza um item para cada elemento
            {pieData.map((c) => (
              // Tag HTML na interface
              <div key={c.name} className="flex items-center gap-2 text-sm">
                // Tag HTML na interface
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                // Tag HTML na interface
                <span className="flex min-w-0 items-center gap-1 truncate text-muted-foreground">
                  {"icon" in c && c.icon ? <CategoryIcon name={c.icon as string} size={14} /> : null}
                  {c.name}
                // Tag HTML na interface
                </span>
                // Tag HTML na interface
                <span className="ml-auto tabular text-xs font-medium text-foreground">
                  // Formata número como moeda/texto local (pt-BR)
                  R$ {c.value.toLocaleString("pt-BR")}
                // Tag HTML na interface
                </span>
              // Tag HTML na interface
              </div>
            ))}
          // Tag HTML na interface
          </div>
          </>
          )}
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Ganhos vs. gastos (por mês)</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Barras verdes = faturamento/ganhos; vermelhas = despesas.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={300}>
              // Elemento/componente React na tela
              <BarChart data={barEvolution} barCategoryGap="30%">
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickFill }} />
                // Elemento/componente React na tela
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Bar dataKey="income" name="Ganhos" fill="#4CAF50" radius={[4, 4, 0, 0]} barSize={20} />
                // Elemento/componente React na tela
                <Bar dataKey="expense" name="Gastos" fill="#EF5350" radius={[4, 4, 0, 0]} barSize={20} />
              // Elemento/componente React na tela
              </BarChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Saldo ao longo do mês</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Soma do que sobrou dia a dia (exemplo ilustrativo).</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <AreaChart data={balanceOverTime.length > 0 ? balanceOverTime : barEvolution.map((r) => ({ day: r.month, accumulated: r.balance }))}>
                // Tag HTML na interface
                <defs>
                  // Tag HTML na interface
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    // Tag HTML na interface
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.15} />
                    // Tag HTML na interface
                    <stop offset="100%" stopColor="#4CAF50" stopOpacity={0} />
                  // Tag HTML na interface
                  </linearGradient>
                // Tag HTML na interface
                </defs>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: tickFill }} />
                // Elemento/componente React na tela
                <YAxis tick={{ fontSize: 10, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} width={42} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                {goalMode && expectedIncome != null && expectedIncome > 0 && (
                  // Elemento/componente React na tela
                  <ReferenceLine
                    y={expectedIncome}
                    stroke="#FFB300"
                    strokeDasharray="5 5"
                    label={{ value: "Renda", fill: "#FFB300", fontSize: 10 }}
                  />
                )}
                // Elemento/componente React na tela
                <Area
                  type="monotone"
                  dataKey="accumulated"
                  name="Saldo"
                  stroke="#4CAF50"
                  fill="url(#greenGrad)"
                  strokeWidth={2}
                />
              // Elemento/componente React na tela
              </AreaChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Equilíbrio por tipo de gasto</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Cada eixo é uma área; a linha tracejada é só uma referência visual.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <RadarChart data={radarCategoryData}>
                // Elemento/componente React na tela
                <PolarGrid stroke={gridStroke} />
                // Elemento/componente React na tela
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 9, fill: tickFill }} />
                // Elemento/componente React na tela
                <Radar name="Gastos" dataKey="value" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.25} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Legend wrapperStyle={{ fontSize: 11, color: tickFill }} />
              // Elemento/componente React na tela
              </RadarChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        // Tag HTML na interface
        <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Limite vs. gasto real</h3>
        // Tag HTML na interface
        <p className="mb-4 text-xs text-muted-foreground">Barra colorida = quanto você já usou da meta da categoria (exemplo).</p>
        {pieData.length > 0 && (
          // Elemento/componente React na tela
          <BulletChart
            // Percorre lista e renderiza um item para cada elemento
            data={pieData.map((p) => {
              const target = p.goal ?? p.value * 1.1;
              return { name: p.name, actual: p.value, target, ranges: [target * 0.5, target * 0.8, target] as [number, number, number] };
            })}
            isDark={isDark}
          />
        )}
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Receitas e despesas empilhadas</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Áreas verde e vermelha mostram o volume de cada tipo ao longo dos meses.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <AreaChart data={stackedFromApi}>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickFill }} />
                // Elemento/componente React na tela
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Area type="monotone" dataKey="income" name="Receitas" stackId="1" stroke="#4CAF50" fill="#C8E6C9" />
                // Elemento/componente React na tela
                <Area type="monotone" dataKey="expense" name="Despesas" stackId="2" stroke="#EF5350" fill="#FFEBEE" />
              // Elemento/componente React na tela
              </AreaChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gasto por semana</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Barras = total da semana; linha tracejada = média (exemplo).</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <ComposedChart data={gastosPorDiaSemanaComposed}>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: tickFill }} />
                // Elemento/componente React na tela
                <YAxis tick={{ fontSize: 10, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={42} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Bar dataKey="total" name="Despesas" fill="#EF5350" radius={[4, 4, 0, 0]} barSize={20} />
                // Elemento/componente React na tela
                <Line type="monotone" dataKey="avg" name="Média" stroke="#FFB300" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              // Elemento/componente React na tela
              </ComposedChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gasto do dia e média de 7 dias</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Linha verde suaviza picos do dia a dia (exemplo).</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <LineChart data={expenseDailyWithAvg.length > 0 ? expenseDailyWithAvg : cumulativeExpenseData}>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickFill }} interval="preserveStartEnd" />
                // Elemento/componente React na tela
                <YAxis tick={{ fontSize: 10, fill: tickFill }} width={42} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                {"daily" in (expenseDailyWithAvg[0] ?? {}) && (
                  // Elemento/componente React na tela
                  <Line type="monotone" dataKey="daily" name="Diário" stroke={tickFill} strokeWidth={1} dot={false} />
                )}
                {"avg7d" in (expenseDailyWithAvg[0] ?? {}) && (
                  // Elemento/componente React na tela
                  <Line type="monotone" dataKey="avg7d" name="Média 7d" stroke="#4CAF50" strokeWidth={2} dot={false} />
                )}
                {expenseDailyWithAvg.length === 0 && (
                  // Elemento/componente React na tela
                  <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#4CAF50" strokeWidth={2} dot={false} />
                )}
              // Elemento/componente React na tela
              </LineChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gastos por faixa do dia</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Manhã, tarde ou noite — onde entram mais lançamentos (exemplo).</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <PieChart>
                // Elemento/componente React na tela
                <Pie
                  data={despesasPorOrigem}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  animationDuration={600}
                >
                  // Percorre lista e renderiza um item para cada elemento
                  {despesasPorOrigem.map((entry, i) => (
                    // Elemento/componente React na tela
                    <Cell key={i} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  ))}
                // Elemento/componente React na tela
                </Pie>
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
              // Elemento/componente React na tela
              </PieChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        // Tag HTML na interface
        <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Calendário: dias com mais gasto</h3>
        // Tag HTML na interface
        <p className="mb-4 text-xs text-muted-foreground">Quanto mais escuro, mais você gastou naquele dia (dados reais do período).</p>
        // Elemento/componente React na tela
        <ChartPlotArea className="p-4">
          // Filtra lista — mantém só itens que passam no teste
          {txs.filter((t) => t.type === "expense").length > 0 ? (
            // Elemento/componente React na tela
            <SpendingHeatmap txs={txs} />
          ) : (
            // Tag HTML na interface
            <p className="py-8 text-center text-sm text-muted-foreground">{EMPTY_FINANCIAL_COPY.gastos}</p>
          )}
        // Elemento/componente React na tela
        </ChartPlotArea>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="space-y-1">
        // Tag HTML na interface
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Mais gráficos de gastos</h2>
        // Tag HTML na interface
        <p className="text-sm text-muted-foreground">
          Todos os gráficos usam apenas despesas reais do período filtrado — sem valores de exemplo.
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Quanto cada categoria “pesa”</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Quadrados maiores = mais dinheiro naquela categoria.</p>
          // Elemento/componente React na tela
          <ChartPlotArea className="overflow-hidden p-2">
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={300}>
              // Elemento/componente React na tela
              <Treemap
                data={treemapExpenseData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="hsl(var(--border))"
                isAnimationActive
                content={({ x, y, width, height, name, value, fill }) =>
                  width > 48 && height > 28 ? (
                    // Tag HTML na interface
                    <g>
                      // Tag HTML na interface
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} className="opacity-95" />
                      // Tag HTML na interface
                      <text x={x + 6} y={y + 16} fill="white" fontSize={11} className="drop-shadow-sm">
                        // Recorta parte da lista (paginação ou limite)
                        {String(name).slice(0, 12)}
                      // Tag HTML na interface
                      </text>
                      // Tag HTML na interface
                      <text x={x + 6} y={y + 28} fill="white" fontSize={10} opacity={0.9}>
                        // Converte texto em número
                        R$ {Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      // Tag HTML na interface
                      </text>
                    // Tag HTML na interface
                    </g>
                  ) : (
                    // Tag HTML na interface
                    <g>
                      // Tag HTML na interface
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} ry={2} />
                    // Tag HTML na interface
                    </g>
                  )
                }
              >
                // Elemento/componente React na tela
                <Tooltip
                  // Formata número como moeda/texto local (pt-BR)
                  formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Total"]}
                />
              // Elemento/componente React na tela
              </Treemap>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Categorias que mais gastaram</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Lista da maior para a menor despesa.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={300}>
              // Elemento/componente React na tela
              <BarChart layout="vertical" data={horizontalCategoryRank} margin={{ left: 8, right: 16 }}>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                // Elemento/componente React na tela
                <XAxis type="number" tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                // Elemento/componente React na tela
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: tickFill }} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Despesa"]} />
                // Elemento/componente React na tela
                <Bar dataKey="total" name="Despesa" fill="#22c55e" radius={[0, 6, 6, 0]} barSize={18} />
              // Elemento/componente React na tela
              </BarChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Total gasto somando as compras</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">A linha sobe a cada nova despesa; mostra quanto já saiu no período.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={280}>
              // Elemento/componente React na tela
              <AreaChart data={cumulativeExpenseData}>
                // Tag HTML na interface
                <defs>
                  // Tag HTML na interface
                  <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                    // Tag HTML na interface
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                    // Tag HTML na interface
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  // Tag HTML na interface
                  </linearGradient>
                // Tag HTML na interface
                </defs>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: tickFill }} interval="preserveStartEnd" />
                // Elemento/componente React na tela
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Area type="stepAfter" dataKey="acumulado" name="Acumulado" stroke="#ef4444" fill="url(#accGrad)" strokeWidth={2} />
              // Elemento/componente React na tela
              </AreaChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Cada ponto é uma compra</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Eixo de baixo = dia do mês; altura = valor. Pontos altos = gastos maiores naquele dia.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={280}>
              // Elemento/componente React na tela
              <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis type="number" dataKey="diaMes" name="Dia" tick={{ fontSize: 11, fill: tickFill }} domain={[0.5, 31.5]} />
                // Elemento/componente React na tela
                <YAxis type="number" dataKey="valor" name="R$" tick={{ fontSize: 11, fill: tickFill }} />
                // Elemento/componente React na tela
                <ZAxis type="number" dataKey="valor" range={[40, 400]} />
                // Elemento/componente React na tela
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const p = payload[0].payload as { nome: string; valor: number; diaMes: number };
                    return (
                      // Tag HTML na interface
                      <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                        // Tag HTML na interface
                        <p className="font-medium text-foreground">{p.nome}</p>
                        // Tag HTML na interface
                        <p className="text-muted-foreground">Dia {p.diaMes}</p>
                        // Tag HTML na interface
                        <p className="tabular font-semibold text-foreground">R$ {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      // Tag HTML na interface
                      </div>
                    );
                  }}
                />
                // Elemento/componente React na tela
                <Scatter data={scatterDespesas} fill="#16a34a" fillOpacity={0.65} />
              // Elemento/componente React na tela
              </ScatterChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Quanto gastou em cada dia da semana</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Compare domingo a sábado de um relance.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={280}>
              // Elemento/componente React na tela
              <BarChart data={gastosPorDiaSemana}>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: tickFill }} />
                // Elemento/componente React na tela
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Bar dataKey="total" name="Despesas" fill="#a855f7" radius={[6, 6, 0, 0]} />
              // Elemento/componente React na tela
              </BarChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">De onde veio o lançamento</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">WhatsApp, site, recorrente ou lançamento manual no app.</p>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={280}>
              // Elemento/componente React na tela
              <PieChart>
                // Elemento/componente React na tela
                <Pie
                  data={despesasPorOrigem}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="75%"
                  paddingAngle={2}
                >
                  // Percorre lista e renderiza um item para cada elemento
                  {despesasPorOrigem.map((_, i) => (
                    // Elemento/componente React na tela
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  ))}
                // Elemento/componente React na tela
                </Pie>
                // Elemento/componente React na tela
                <Tooltip content={<DashTooltip />} />
                // Elemento/componente React na tela
                <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
              // Elemento/componente React na tela
              </PieChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        // Tag HTML na interface
        <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground capitalize">Resumo do mês — {monthLabel}</h3>
        // Tag HTML na interface
        <p className="mb-4 text-xs text-muted-foreground">Três números rápidos com base nos lançamentos reais do filtro.</p>
        // Tag HTML na interface
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          // Tag HTML na interface
          <div className="rounded-xl bg-muted/50 p-4">
            // Tag HTML na interface
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maior compra do período</p>
            {largest ? (
              <>
                // Tag HTML na interface
                <p className="text-base font-semibold text-foreground">
                  // Formata número como moeda/texto local (pt-BR)
                  R$ {txAmount(largest).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                // Tag HTML na interface
                </p>
                // Tag HTML na interface
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  // Elemento/componente React na tela
                  <CategoryIcon name={largest.categoryIcon} size={14} />
                  // Cria objeto de data/hora
                  {largest.description ?? largest.categoryName} — {new Date(largest.occurredAt).toLocaleDateString("pt-BR")}
                // Tag HTML na interface
                </p>
              </>
            ) : (
              // Tag HTML na interface
              <p className="text-sm text-muted-foreground">Nenhuma despesa neste período</p>
            )}
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl bg-muted/50 p-4">
            // Tag HTML na interface
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dia em que mais gastou</p>
            {priciestDay ? (
              <>
                // Tag HTML na interface
                <p className="text-base font-semibold text-foreground">
                  // Cria objeto de data/hora
                  {new Date(priciestDay.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                // Tag HTML na interface
                </p>
                // Tag HTML na interface
                <p className="text-xs text-muted-foreground">
                  // Formata número como moeda/texto local (pt-BR)
                  R$ {priciestDay.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em {priciestDay.count}{" "}
                  transações
                // Tag HTML na interface
                </p>
              </>
            ) : (
              // Tag HTML na interface
              <p className="text-sm text-muted-foreground">Nenhuma despesa neste período</p>
            )}
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl bg-muted/50 p-4">
            // Tag HTML na interface
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maior fatia do gasto</p>
            // Tag HTML na interface
            <p className="text-base font-semibold text-camber-main">{concentrationLabel}</p>
            // Tag HTML na interface
            <p className="text-xs text-muted-foreground">Quanto essa parte representa do que você gastou</p>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="overflow-x-auto">
          // Tag HTML na interface
          <table className="w-full text-sm">
            // Tag HTML na interface
            <thead>
              // Tag HTML na interface
              <tr className="border-b border-border">
                // Tag HTML na interface
                <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</th>
                // Tag HTML na interface
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Gasto</th>
                // Tag HTML na interface
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Meta</th>
                // Tag HTML na interface
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">%</th>
                // Tag HTML na interface
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">vs Anterior</th>
              // Tag HTML na interface
              </tr>
            // Tag HTML na interface
            </thead>
            // Tag HTML na interface
            <tbody>
              // Percorre lista e renderiza um item para cada elemento
              {pieData.map((c) => {
                const pct = c.goal ? Math.round((c.value / c.goal) * 100) : 0;
                return (
                  // Tag HTML na interface
                  <tr key={c.name} className="border-b border-border/60">
                    // Tag HTML na interface
                    <td className="py-2.5 font-medium text-foreground">
                      // Tag HTML na interface
                      <span className="inline-flex items-center gap-1.5">
                        // Elemento/componente React na tela
                        <CategoryIcon name={c.icon ?? "wallet"} size={16} />
                        {c.name}
                      // Tag HTML na interface
                      </span>
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-2.5 text-right tabular text-foreground">
                      // Formata número como moeda/texto local (pt-BR)
                      R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-2.5 text-right tabular text-muted-foreground">R$ {(c.goal ?? 0).toLocaleString("pt-BR")}</td>
                    // Tag HTML na interface
                    <td className="py-2.5 text-right">
                      // Tag HTML na interface
                      <span
                        // Classes CSS Tailwind — controla aparência visual
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          pct < 70
                            ? "bg-cgreen-50 text-cgreen-700 dark:bg-cgreen-900/30 dark:text-cgreen-400"
                            : pct < 95
                              ? "bg-camber-light text-camber-main dark:bg-amber-900/25"
                              : "bg-cred-light text-cred-main dark:bg-red-900/25",
                        )}
                      >
                        {pct}%
                      // Tag HTML na interface
                      </span>
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-2.5 text-right tabular text-muted-foreground">—</td>
                  // Tag HTML na interface
                  </tr>
                );
              })}
            // Tag HTML na interface
            </tbody>
          // Tag HTML na interface
          </table>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      {(insightsRes?.insights?.length ?? 0) === 0 && txs.length === 0 && (
        // Tag HTML na interface
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Registre gastos pelo WhatsApp ou manualmente para ver insights da IA.
        // Tag HTML na interface
        </div>
      )}
      // Tag HTML na interface
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Hábitos que vale observar</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Exemplos para ilustrar o painel — com seus dados reais, estes textos podem mudar.</p>
          // Tag HTML na interface
          <div className="space-y-3">
            // Tag HTML na interface
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              // Elemento/componente React na tela
              <CalendarDays className="h-8 w-8 shrink-0 text-cgreen-500" strokeWidth={1.5} />
              // Tag HTML na interface
              <div className="min-w-0 flex-1">
                // Tag HTML na interface
                <p className="text-sm font-medium text-foreground">Fins de semana costumam pesar mais</p>
                // Tag HTML na interface
                <p className="text-xs text-muted-foreground">Muita gente gasta um pouco mais sábado e domingo — compare com seus lançamentos.</p>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <span className="shrink-0 rounded-full bg-camber-light px-2 py-1 text-xs font-medium text-camber-main dark:bg-amber-900/30">
                Dica
              // Tag HTML na interface
              </span>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              // Elemento/componente React na tela
              <Utensils className="h-8 w-8 shrink-0 text-camber-main" strokeWidth={1.5} />
              // Tag HTML na interface
              <div className="min-w-0 flex-1">
                // Tag HTML na interface
                <p className="text-sm font-medium text-foreground">Comida à noite</p>
                // Tag HTML na interface
                <p className="text-xs text-muted-foreground">Se delivery e restaurante concentram à noite, o total do mês sobe rápido.</p>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <span className="shrink-0 rounded-full bg-cred-light px-2 py-1 text-xs font-medium text-cred-main dark:bg-red-900/25">
                Olho vivo
              // Tag HTML na interface
              </span>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              // Elemento/componente React na tela
              <CreditCard className="h-8 w-8 shrink-0 text-cred-main" strokeWidth={1.5} />
              // Tag HTML na interface
              <div className="min-w-0 flex-1">
                // Tag HTML na interface
                <p className="text-sm font-medium text-foreground">Compras maiores sem planejar</p>
                // Tag HTML na interface
                <p className="text-xs text-muted-foreground">Alguns gastos acima do habitual podem ser só revisar antes de repetir.</p>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <span className="shrink-0 rounded-full bg-camber-light px-2 py-1 text-xs font-medium text-camber-main dark:bg-amber-900/30">
                Lembrete
              // Tag HTML na interface
              </span>
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          // Tag HTML na interface
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Fechamento do mês (estimativa)</h3>
          // Tag HTML na interface
          <p className="mb-4 text-xs text-muted-foreground">Número aproximado; serve para ter uma ideia, não é promessa exata.</p>
          // Tag HTML na interface
          <div className="space-y-4">
            // Tag HTML na interface
            <div className="rounded-xl bg-cgreen-50 p-4 dark:bg-cgreen-900/20">
              // Tag HTML na interface
              <div className="mb-1 flex items-center gap-2">
                // Elemento/componente React na tela
                <BarChart3 className="h-4 w-4 text-cgreen-600 dark:text-cgreen-400" />
                // Tag HTML na interface
                <p className="text-sm font-medium text-cgreen-700 dark:text-cgreen-400">Saldo estimado no último dia do mês</p>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <p className="text-xl font-semibold tabular tracking-tight text-cgreen-700 dark:text-cgreen-400">
                // Formata número como moeda/texto local (pt-BR)
                R$ {monthEndPreview.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              // Tag HTML na interface
              </p>
              // Tag HTML na interface
              <p className="mt-1 text-xs text-cgreen-600 dark:text-cgreen-500/90">
                {txs.length ? "Com base no que já entrou e no ritmo de gasto do período." : "Sem lançamentos — registre ganhos e despesas para projetar."}
              // Tag HTML na interface
              </p>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="rounded-xl bg-camber-light p-4 dark:bg-amber-900/20">
              // Tag HTML na interface
              <div className="mb-1 flex items-center gap-2">
                // Elemento/componente React na tela
                <AlertTriangle className="h-4 w-4 text-camber-main" />
                // Tag HTML na interface
                <p className="text-sm font-medium text-camber-main">Meta de alimentação</p>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <p className="text-sm text-foreground/90">
                // Classes CSS Tailwind — controla aparência visual
                Se o ritmo continuar, <span className="font-medium text-cred-main">alimentação</span> pode passar do limite que você definiu — vale conferir a categoria esta semana.
              // Tag HTML na interface
              </p>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="rounded-xl bg-muted/50 p-4">
              // Tag HTML na interface
              <div className="mb-1 flex items-center gap-2">
                // Elemento/componente React na tela
                <Target className="h-4 w-4 text-foreground" />
                // Tag HTML na interface
                <p className="text-sm font-medium text-foreground">Sua nota geral</p>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="mt-1 flex items-center gap-3">
                // Tag HTML na interface
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  // Tag HTML na interface
                  <div
                    // Classes CSS Tailwind — controla aparência visual
                    className="h-full rounded-full bg-cgreen-500"
                    // Operação matemática (arredondar, somar, etc.)
                    style={{ width: `${kpisRes?.kpis?.financialScore ?? Math.round(analytics.score)}%` }}
                  />
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <span className="text-base font-semibold tabular text-foreground">
                  // Operação matemática (arredondar, somar, etc.)
                  {kpisRes?.kpis?.financialScore ?? Math.round(analytics.score)}/100
                // Tag HTML na interface
                </span>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <p className="text-xs text-muted-foreground mt-1">Quanto você poupa, como distribui gastos e se bate a meta de renda entram nessa nota.</p>
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        // Tag HTML na interface
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          // Tag HTML na interface
          <div>
            // Tag HTML na interface
            <h3 className="text-base font-semibold tracking-tight text-foreground">Despesas e ganhos do período</h3>
            // Tag HTML na interface
            <p className="text-xs text-muted-foreground">
              Valor, data, categoria e descrição — edite ou exclua para recalcular os indicadores na hora.
            // Tag HTML na interface
            </p>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="flex flex-wrap gap-2">
            // Elemento/componente React na tela
            <Button type="button" size="sm" className="gap-1.5 bg-cgreen-500 hover:bg-cgreen-700" onClick={() => setExpenseOpen(true)}>
              // Elemento/componente React na tela
              <Plus className="h-4 w-4" />
              Nova despesa
            // Elemento/componente React na tela
            </Button>
            // Elemento/componente React na tela
            <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => setIncomeOpen(true)}>
              // Elemento/componente React na tela
              <Wallet className="h-4 w-4" />
              Novo ganho
            // Elemento/componente React na tela
            </Button>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
        {txs.length === 0 ? (
          // Tag HTML na interface
          <p className="py-10 text-center text-sm text-muted-foreground">
            {EMPTY_FINANCIAL_COPY.gastos} {EMPTY_FINANCIAL_COPY.ganhos}
          // Tag HTML na interface
          </p>
        ) : (
          // Tag HTML na interface
          <div className="overflow-x-auto">
            // Tag HTML na interface
            <table className="w-full min-w-[640px] text-sm">
              // Tag HTML na interface
              <thead>
                // Tag HTML na interface
                <tr className="border-b border-border text-left">
                  // Tag HTML na interface
                  <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</th>
                  // Tag HTML na interface
                  <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</th>
                  // Tag HTML na interface
                  <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</th>
                  // Tag HTML na interface
                  <th className="py-2 pr-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</th>
                  // Tag HTML na interface
                  <th className="py-2 pr-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor</th>
                  // Tag HTML na interface
                  <th className="py-2 pl-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Ações</th>
                // Tag HTML na interface
                </tr>
              // Tag HTML na interface
              </thead>
              // Tag HTML na interface
              <tbody>
                // Percorre lista e renderiza um item para cada elemento
                {txs.map((t) => (
                  // Tag HTML na interface
                  <tr key={t.id} className="border-b border-border/60 last:border-0">
                    // Tag HTML na interface
                    <td className="py-3 pr-3">
                      // Tag HTML na interface
                      <span
                        // Classes CSS Tailwind — controla aparência visual
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          t.type === "income"
                            ? "bg-cgreen-50 text-cgreen-700 dark:bg-cgreen-900/30 dark:text-cgreen-400"
                            : "bg-cred-light text-cred-main dark:bg-red-900/25",
                        )}
                      >
                        {t.type === "income"
                          ? t.incomeFrequency && t.incomeFrequency in INCOME_FREQUENCY_LABELS
                            ? INCOME_FREQUENCY_LABELS[t.incomeFrequency as IncomeFrequency]
                            : "Ganho"
                          : "Despesa"}
                      // Tag HTML na interface
                      </span>
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="max-w-[220px] truncate py-3 pr-3 font-medium text-foreground">
                      {t.description ?? "—"}
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-3 pr-3 text-muted-foreground">
                      // Tag HTML na interface
                      <span className="inline-flex items-center gap-1.5">
                        // Elemento/componente React na tela
                        <CategoryIcon name={t.categoryIcon} size={14} />
                        {t.categoryName ?? "Sem categoria"}
                      // Tag HTML na interface
                      </span>
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-3 pr-3 tabular text-muted-foreground">
                      // Cria objeto de data/hora
                      {new Date(t.occurredAt).toLocaleDateString("pt-BR")}
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td
                      // Classes CSS Tailwind — controla aparência visual
                      className={cn(
                        "py-3 pr-3 text-right tabular font-semibold",
                        t.type === "income" ? "text-cgreen-500" : "text-cred-main",
                      )}
                    >
                      {t.type === "income" ? "+" : "−"} R${" "}
                      // Formata número como moeda/texto local (pt-BR)
                      {txAmount(t).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-3 pl-3">
                      // Tag HTML na interface
                      <div className="flex items-center justify-end gap-1">
                        // Tag HTML na interface
                        <button
                          // Botão comum (não envia formulário)
                          type="button"
                          // Classes CSS Tailwind — controla aparência visual
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          // Texto acessível para leitores de tela
                          aria-label="Editar lançamento"
                          title="Editar"
                          // Executa ação quando o usuário clica
                          onClick={() => setEditingTx(t)}
                        >
                          // Elemento/componente React na tela
                          <Pencil size={14} />
                        // Tag HTML na interface
                        </button>
                        // Tag HTML na interface
                        <button
                          // Botão comum (não envia formulário)
                          type="button"
                          // Classes CSS Tailwind — controla aparência visual
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-cred-main"
                          // Texto acessível para leitores de tela
                          aria-label="Excluir lançamento"
                          title="Excluir"
                          // Desabilita botão/campo (ex.: durante envio)
                          disabled={inactivateTx.isPending}
                          // Executa ação quando o usuário clica
                          onClick={() => {
                            if (confirm(`Excluir "${t.description ?? "lançamento"}"? Os indicadores serão recalculados.`)) {
                              inactivateTx.mutate(t.id);
                            }
                          }}
                        >
                          // Elemento/componente React na tela
                          <Trash2 size={14} />
                        // Tag HTML na interface
                        </button>
                      // Tag HTML na interface
                      </div>
                    // Tag HTML na interface
                    </td>
                  // Tag HTML na interface
                  </tr>
                ))}
              // Tag HTML na interface
              </tbody>
            // Tag HTML na interface
            </table>
          // Tag HTML na interface
          </div>
        )}
      // Tag HTML na interface
      </div>
      // Elemento/componente React na tela
      <TransactionDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        type="expense"
        categories={categories}
        loading={txLoading}
        // Envia formulário quando usuário pressiona Enter ou botão
        onSubmit={async (data) => {
          if (!token) return;
          setTxLoading(true);
          try {
            // Aguarda resposta assíncrona (API, timer)
            await apiPostTransaction(token, {
              amount: data.amount,
              description: data.description,
              categoryId: data.categoryId,
              occurredAt: data.occurredAt,
              type: "expense",
              source: "manual",
            });
            // Exibe notificação temporária (toast) na tela
            toast.success("Despesa registrada — gastos e líquido atualizados.");
            setExpenseOpen(false);
            void qc.invalidateQueries({ queryKey: ["transactions"] });
            void qc.invalidateQueries({ queryKey: ["monthly"] });
            void qc.invalidateQueries({ queryKey: ["kpis"] });
            void qc.invalidateQueries({ queryKey: ["insights"] });
            void qc.invalidateQueries({ queryKey: ["goals"] });
          } catch (e) {
            // Exibe notificação temporária (toast) na tela
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
          } finally {
            setTxLoading(false);
          }
        }}
      />
      // Elemento/componente React na tela
      <TransactionDialog
        open={incomeOpen}
        onOpenChange={setIncomeOpen}
        type="income"
        categories={categories}
        loading={txLoading}
        // Envia formulário quando usuário pressiona Enter ou botão
        onSubmit={async (data) => {
          if (!token) return;
          setTxLoading(true);
          try {
            // Aguarda resposta assíncrona (API, timer)
            await apiPostTransaction(token, {
              amount: data.amount,
              description: data.description,
              categoryId: data.categoryId,
              occurredAt: data.occurredAt,
              type: "income",
              source: "manual",
              incomeFrequency: data.incomeFrequency ?? "monthly",
            });
            // Exibe notificação temporária (toast) na tela
            toast.success("Ganho registrado — faturamento atualizado.");
            setIncomeOpen(false);
            void qc.invalidateQueries({ queryKey: ["transactions"] });
            void qc.invalidateQueries({ queryKey: ["monthly"] });
            void qc.invalidateQueries({ queryKey: ["kpis"] });
            void qc.invalidateQueries({ queryKey: ["insights"] });
            void qc.invalidateQueries({ queryKey: ["goals"] });
          } catch (e) {
            // Exibe notificação temporária (toast) na tela
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
          } finally {
            setTxLoading(false);
          }
        }}
      />
      // Elemento/componente React na tela
      <TransactionDialog
        open={Boolean(editingTx)}
        onOpenChange={(v) => {
          if (!v) setEditingTx(null);
        }}
        type={editingTx?.type === "income" ? "income" : "expense"}
        categories={categories}
        loading={patchTx.isPending}
        mode="edit"
        initial={editingTx}
        // Envia formulário quando usuário pressiona Enter ou botão
        onSubmit={async (data) => {
          if (!editingTx) return;
          // Aguarda resposta assíncrona (API, timer)
          await patchTx.mutateAsync({
            id: editingTx.id,
            body: {
              amount: data.amount,
              description: data.description,
              categoryId: data.categoryId,
              occurredAt: data.occurredAt,
              incomeFrequency: editingTx.type === "income" ? data.incomeFrequency ?? null : null,
            },
          });
        }}
      />
      // Elemento/componente React na tela
      <MonthlyBudgetDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        month={currentMonth}
        initialIncome={
          budgetRes?.budget?.totalIncomeExpected != null ? String(budgetRes.budget.totalIncomeExpected) : "8500"
        }
        initialLimit={budgetRes?.budget?.totalExpenseLimit != null ? String(budgetRes.budget.totalExpenseLimit) : "7000"}
        loading={budgetLoading}
        onSave={async (inc, lim) => {
          if (!token) return;
          setBudgetLoading(true);
          try {
            // Aguarda resposta assíncrona (API, timer)
            await apiPutBudget(token, {
              month: currentMonth,
              totalIncomeExpected: inc || null,
              totalExpenseLimit: lim || null,
            });
            // Exibe notificação temporária (toast) na tela
            toast.success("Orçamento salvo.");
            void qc.invalidateQueries({ queryKey: ["budget", token, currentMonth] });
          } catch (e) {
            // Exibe notificação temporária (toast) na tela
            toast.error(e instanceof Error ? e.message : "Erro");
          } finally {
            setBudgetLoading(false);
          }
        }}
      />
    // Tag HTML na interface
    </div>
  );
}
