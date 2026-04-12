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
  apiPostTransaction,
  apiPutBudget,
  apiSeedDemo,
  apiSeedRichDemo,
  type ApiTransaction,
} from "@/lib/api";
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
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend, ComposedChart, ReferenceLine,
  Treemap, ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  summaryData, categoryData, monthlyEvolution, cashflowData,
  heatmapData, radarData, bulletData, weeklyTrend, timeDistribution,
  movingAvgData, stackedAreaData, recentTransactions, insights, CHART_COLORS,
} from "@/lib/mockData";

/* Tooltip Recharts — cores por tema */
function DashTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  if (!active || !payload?.length) return null;
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2 text-xs shadow-none ring-1",
        dark
          ? "bg-[#2C2C2E] text-foreground ring-white/10"
          : "bg-white text-foreground ring-black/5",
      )}
    >
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold tabular text-foreground">R$ {p.value.toLocaleString("pt-BR")}</span>
        </div>
      ))}
    </div>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonthFromYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, 1));
}

function endOfMonthFromYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return endOfDay(new Date(y, m, 0));
}

function monthShortLabel(ym: string) {
  const [y, mo] = ym.split("-").map(Number);
  return format(new Date(y, mo - 1, 1), "MMM", { locale: ptBR }).replace(".", "");
}

function aggregateExpensesByCategory(txs: ApiTransaction[]) {
  const map = new Map<string, { value: number; color: string; icon: string | null }>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const name = t.categoryName ?? "Sem categoria";
    const cur = map.get(name) ?? { value: 0, color: "#78909C", icon: t.categoryIcon };
    cur.value += t.amount;
    if (t.categoryColor) cur.color = t.categoryColor;
    if (t.categoryIcon) cur.icon = t.categoryIcon;
    map.set(name, cur);
  }
  return [...map.entries()].map(([name, v], i) => ({
    name,
    value: Math.round(v.value * 100) / 100,
    color: v.color || CHART_COLORS[i % CHART_COLORS.length],
    icon: v.icon,
    goal: categoryData.find((c) => c.name === name)?.goal ?? Math.max(v.value * 1.1, 100),
  }));
}

function periodSummary(txs: ApiTransaction[], rangeDays: number, expectedIncome: number | null) {
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const days = Math.max(1, rangeDays);
  const dailyAvgExpense = expense / days;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  const expList = txs.filter((t) => t.type === "expense");
  const avgTicket = expList.length ? expense / expList.length : 0;
  let topCat = "";
  let topVal = 0;
  const byCat = aggregateExpensesByCategory(txs);
  for (const c of byCat) {
    if (c.value > topVal) {
      topVal = c.value;
      topCat = c.name;
    }
  }
  const topShare = expense > 0 ? (topVal / expense) * 100 : 0;
  const budgetVar =
    expectedIncome != null && expectedIncome > 0 ? ((income - expectedIncome) / expectedIncome) * 100 : null;
  const score = Math.min(
    100,
    Math.max(
      0,
      50 + (savingsRate > 20 ? 15 : 0) + (topShare < 45 ? 10 : 0) + (budgetVar != null && budgetVar >= 0 ? 10 : 0),
    ),
  );
  return {
    income,
    expense,
    balance,
    dailyAvgExpense,
    savingsRate,
    avgTicket,
    topCat,
    topShare,
    budgetVar,
    score,
    txCount: txs.length,
    activeDays: new Set(txs.map((t) => t.occurredAt.slice(0, 10))).size,
  };
}

function largestExpense(txs: ApiTransaction[]) {
  const ex = txs.filter((t) => t.type === "expense");
  if (!ex.length) return null;
  return ex.reduce((a, b) => (a.amount >= b.amount ? a : b));
}

function spendByDay(txs: ApiTransaction[]) {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const d = t.occurredAt.slice(0, 10);
    const cur = map.get(d) ?? { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    map.set(d, cur);
  }
  let best: { day: string; total: number; count: number } | null = null;
  for (const [day, v] of map) {
    if (!best || v.total > best.total) best = { day, total: v.total, count: v.count };
  }
  return best;
}

/* Card de métrica — Magic UI + tipografia compacta e simétrica */
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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const trendColor =
    trend === "up" ? "text-cgreen-500" : trend === "down" ? "text-cred-main" : "text-muted-foreground";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full min-h-[112px] rounded-xl"
    >
      <MagicCard
        className="h-full min-h-[112px] rounded-xl border border-border/60"
        gradientFrom="#6ee7b7"
        gradientTo="#22c55e"
        gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
        gradientSize={220}
      >
        <div className="flex h-full min-h-[112px] flex-col justify-between gap-2 px-4 py-3.5 text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground leading-none">
            {label}
          </p>
          <p className="text-lg font-semibold leading-tight tracking-tight text-foreground tabular">
            {prefix}
            {value}
            {suffix}
          </p>
          <div className={cn("flex items-center gap-1 text-[11px] font-medium leading-none", trendColor)}>
            <TrendIcon size={12} strokeWidth={2.25} className="shrink-0" />
            <span>{Math.abs(change)}% vs mês anterior</span>
          </div>
        </div>
      </MagicCard>
    </motion.div>
  );
}

/* Chip de filtro */
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
        active
          ? "border-cgreen-500/40 bg-cgreen-500/15 text-cgreen-600 dark:text-cgreen-400"
          : "border-border bg-muted/50 text-muted-foreground hover:border-cgreen-500/30 hover:bg-cgreen-500/10",
      )}
    >
      {children}
    </button>
  );
}

function BulletChart({ data, isDark }: { data: typeof bulletData; isDark: boolean }) {
  const track = isDark ? "bg-[#2C2C2E]" : "bg-cgray-50";
  const line = isDark ? "bg-white/80" : "bg-cgray-900";
  return (
    <div className="space-y-4">
      {data.map((item) => {
        const pct = (item.actual / item.target) * 100;
        const barColor = pct < 60 ? "#4CAF50" : pct < 90 ? "#FFB300" : "#EF5350";
        return (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="tabular text-xs text-muted-foreground">
                R$ {item.actual.toLocaleString("pt-BR")} / R$ {item.target.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className={cn("relative h-5 overflow-hidden rounded-md", track)}>
              <div className="absolute inset-0 flex">
                <div className="bg-cgreen-50 dark:bg-cgreen-900/25" style={{ width: `${(item.ranges[0] / item.target) * 100}%` }} />
                <div className="bg-camber-light dark:bg-amber-900/20" style={{ width: `${((item.ranges[1] - item.ranges[0]) / item.target) * 100}%` }} />
                <div className="bg-cred-light dark:bg-red-900/20" style={{ width: `${((item.ranges[2] - item.ranges[1]) / item.target) * 100}%` }} />
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute bottom-1 left-0 top-1 rounded"
                style={{ background: barColor }}
              />
              <div className={cn("absolute bottom-0 top-0 w-0.5", line)} style={{ left: "100%" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Heatmap calendário mensal */
function SpendingHeatmap() {
  const maxAmount = Math.max(...heatmapData.map(d => d.amount));
  const weeks: typeof heatmapData[number][][] = [];
  let currentWeek: typeof heatmapData[number][] = [];

  /* Preenche dias vazios no início */
  const firstDay = heatmapData[0].weekday;
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
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium relative group cursor-default"
                style={{ background: getColor(day.amount) }}
              >
                {day.day > 0 && (
                  <>
                    <span className={day.amount > 0 ? "text-foreground" : "text-muted-foreground"}>{day.day}</span>
                    {day.amount > 0 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-cgray-900 text-white px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        R$ {day.amount.toFixed(0)} · {day.categories.join(', ')}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        <span>Menos</span>
        {['#C8E6C9', '#A5D6A7', '#FFB300', '#EF5350'].map(c => (
          <div key={c} className="w-3 h-3 rounded" style={{ background: c }} />
        ))}
        <span>Mais</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { token, user } = useAuth();
  const isRichDemoAccount = user?.email?.toLowerCase() === "leonardosena1010@hotmail.com";
  const qc = useQueryClient();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";

  const [currentMonth, setCurrentMonth] = useState("2026-04");
  const [periodFilter, setPeriodFilter] = useState("30d");
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

  const defaultRange = useMemo(
    () => ({ from: startOfMonthFromYm(currentMonth), to: endOfMonthFromYm(currentMonth) }),
    [currentMonth],
  );
  const activeRange = rangeOverride ?? defaultRange;
  const fromIso = activeRange.from.toISOString();
  const toIso = activeRange.to.toISOString();
  const rangeDays = Math.max(
    1,
    Math.ceil((activeRange.to.getTime() - activeRange.from.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );

  const { data: catRes } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => apiGetCategories(token!),
    enabled: !!token,
  });
  const categories = catRes?.categories ?? [];

  const { data: txRes, isLoading: txListLoading } = useQuery({
    queryKey: ["transactions", token, fromIso, toIso],
    queryFn: () => apiGetTransactions(token!, { from: fromIso, to: toIso }),
    enabled: !!token,
  });
  const rawTxs = txRes?.transactions ?? [];

  const txs = useMemo(() => {
    let t = rawTxs;
    if (typeFilter === "recurring") t = t.filter((x) => x.source === "recurring");
    else if (typeFilter === "income" || typeFilter === "expense") t = t.filter((x) => x.type === typeFilter);
    if (catFilter) t = t.filter((x) => (x.categoryName ?? "") === catFilter);
    return t;
  }, [rawTxs, catFilter, typeFilter]);

  const { data: budgetRes } = useQuery({
    queryKey: ["budget", token, currentMonth],
    queryFn: () => apiGetBudget(token!, currentMonth),
    enabled: !!token,
  });
  const expectedIncome = budgetRes?.budget?.totalIncomeExpected ?? null;

  const { data: monthlyRes } = useQuery({
    queryKey: ["monthly", token],
    queryFn: () => apiGetMonthlyReport(token!),
    enabled: !!token,
  });

  const seedMut = useMutation({
    mutationFn: () => apiSeedDemo(token!),
    onSuccess: (d) => {
      if (d.skipped) toast.message(d.message ?? "Já existem dados.");
      else toast.success(`Dados demo carregados (${d.inserted} transações).`);
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["budget"] });
      void qc.invalidateQueries({ queryKey: ["monthly"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedRichMut = useMutation({
    mutationFn: () => apiSeedRichDemo(token!),
    onSuccess: (d) => {
      toast.success(`${d.inserted ?? 0} transações no pacote completo. ${d.message ?? ""}`);
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["budget"] });
      void qc.invalidateQueries({ queryKey: ["monthly"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const analytics = useMemo(
    () => periodSummary(txs, rangeDays, expectedIncome),
    [txs, rangeDays, expectedIncome],
  );

  const pieFromApi = useMemo(() => aggregateExpensesByCategory(txs), [txs]);
  const pieData = pieFromApi.length > 0 ? pieFromApi : categoryData;

  const treemapExpenseData = useMemo(() => {
    const src = pieFromApi.length > 0 ? pieFromApi : categoryData;
    return src.slice(0, 14).map((c) => ({
      name: c.name,
      size: Math.max(typeof c.value === "number" ? c.value : 0, 1),
      fill: c.color,
    }));
  }, [pieFromApi]);

  const horizontalCategoryRank = useMemo(() => {
    const src = pieFromApi.length > 0 ? pieFromApi : categoryData;
    return [...src]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((c) => ({ name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name, total: c.value }));
  }, [pieFromApi]);

  const cumulativeExpenseData = useMemo(() => {
    const exp = [...txs].filter((t) => t.type === "expense").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    let acc = 0;
    return exp.map((t, idx) => {
      acc += t.amount;
      return {
        ord: idx + 1,
        label: format(new Date(t.occurredAt), "dd/MM", { locale: ptBR }),
        acumulado: Math.round(acc * 100) / 100,
      };
    });
  }, [txs]);

  const scatterDespesas = useMemo(() => {
    return txs
      .filter((t) => t.type === "expense")
      .map((t) => ({
        diaMes: new Date(t.occurredAt).getDate(),
        valor: t.amount,
        nome: (t.description ?? t.categoryName ?? "Despesa").slice(0, 28),
      }));
  }, [txs]);

  const gastosPorDiaSemana = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const sums = [0, 0, 0, 0, 0, 0, 0];
    for (const t of txs) {
      if (t.type !== "expense") continue;
      sums[new Date(t.occurredAt).getDay()] += t.amount;
    }
    return labels.map((dia, i) => ({ dia, total: Math.round(sums[i] * 100) / 100 }));
  }, [txs]);

  const despesasPorOrigem = useMemo(() => {
    const m = new Map<string, number>();
    const label: Record<string, string> = {
      whatsapp: "WhatsApp",
      web: "Web",
      recurring: "Recorrente",
      manual: "Manual",
    };
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const k = t.source in label ? label[t.source] : t.source;
      m.set(k, (m.get(k) ?? 0) + t.amount);
    }
    return [...m.entries()].map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));
  }, [txs]);

  const barEvolution = useMemo(() => {
    const rows = monthlyRes?.months ?? [];
    if (rows.length < 2) return monthlyEvolution;
    const last = rows.slice(-6);
    return last.map((r) => ({
      month: monthShortLabel(r.month),
      income: r.income,
      expense: r.expense,
      balance: r.balance,
    }));
  }, [monthlyRes]);

  const stackedFromApi = useMemo(() => {
    const rows = monthlyRes?.months ?? [];
    if (rows.length < 2) return stackedAreaData;
    return rows.map((r) => ({
      month: monthShortLabel(r.month),
      income: r.income,
      expense: r.expense,
      savings: r.income - r.expense,
    }));
  }, [monthlyRes]);

  const largest = largestExpense(txs);
  const priciestDay = spendByDay(txs);
  const recentList = txs.slice(0, 12);

  const monthLabel = new Date(currentMonth + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const d = new Date(currentMonth + "-01");
                d.setMonth(d.getMonth() - 1);
                setCurrentMonth(d.toISOString().slice(0, 7));
                setRangeOverride(null);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <h1 className="text-xl font-semibold capitalize tracking-tight text-foreground">{monthLabel}</h1>
            <button
              type="button"
              onClick={() => {
                const d = new Date(currentMonth + "-01");
                d.setMonth(d.getMonth() + 1);
                setCurrentMonth(d.toISOString().slice(0, 7));
                setRangeOverride(null);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <Filter size={16} />
            Filtros
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover
            open={calOpen}
            onOpenChange={(o) => {
              setCalOpen(o);
              if (o) {
                setPickRange({ from: activeRange.from, to: activeRange.to });
                setTimeStart(format(activeRange.from, "HH:mm"));
                setTimeEnd(format(activeRange.to, "HH:mm"));
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2 border-border bg-card">
                <CalendarClock className="h-4 w-4" />
                {format(activeRange.from, "dd/MM/yyyy HH:mm", { locale: ptBR })} —{" "}
                {format(activeRange.to, "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-3 border-b border-border">
                <Calendar
                  mode="range"
                  numberOfMonths={1}
                  locale={ptBR}
                  selected={pickRange as { from?: Date; to?: Date }}
                  onSelect={(r) => setPickRange(r ?? undefined)}
                  defaultMonth={pickRange?.from ?? activeRange.from}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Hora início</p>
                    <input
                      type="time"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Hora fim</p>
                    <input
                      type="time"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRangeOverride(null);
                      setCalOpen(false);
                    }}
                  >
                    Mês atual
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-cgreen-500 hover:bg-cgreen-700"
                    onClick={() => {
                      if (!pickRange?.from || !pickRange?.to) return;
                      const [sh, sm] = timeStart.split(":").map(Number);
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
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-cgreen-500 hover:bg-cgreen-700"
            onClick={() => setExpenseOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Registrar gasto
          </Button>
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => setIncomeOpen(true)}>
            <Wallet className="h-4 w-4" />
            Registrar receita
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => setBudgetOpen(true)}>
            Renda mensal
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 border-border"
            disabled={!token}
            onClick={async () => {
              try {
                const blob = await apiExportTransactionsCsv(token!, { from: fromIso, to: toIso });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "controla-transacoes.csv";
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Planilha exportada.");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Falha ao exportar");
              }
            }}
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          {isRichDemoAccount && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1.5"
              disabled={seedRichMut.isPending || !token}
              onClick={() => {
                if (confirm("Substituir todas as transações pelo pacote completo de demonstração?")) seedRichMut.mutate();
              }}
            >
              Pacote completo
            </Button>
          )}
        </div>

        {!txListLoading && rawTxs.length === 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-cgreen-500/40 bg-cgreen-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Nenhuma transação no período. Carregue o pacote de demonstração (salvo no banco) para ver análises completas.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={seedMut.isPending || !token}
                onClick={() => seedMut.mutate()}
              >
                Carregar dados demo
              </Button>
              {isRichDemoAccount && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-cgreen-600 hover:bg-cgreen-800"
                  disabled={seedRichMut.isPending || !token}
                  onClick={() => {
                    if (confirm("Substituir todas as transações pelo pacote completo?")) seedRichMut.mutate();
                  }}
                >
                  Pacote completo (Leonardo)
                </Button>
              )}
            </div>
          </div>
        )}

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-4 rounded-xl border border-border bg-card p-4"
          >
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Período</p>
              <div className="flex gap-2 flex-wrap">
                {['7d', '30d', '90d', '1 ano'].map(p => (
                  <FilterChip key={p} active={periodFilter === p} onClick={() => setPeriodFilter(p)}>
                    {p}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</p>
              <div className="flex gap-2 flex-wrap">
                {[{ l: 'Receita', v: 'income' }, { l: 'Despesa', v: 'expense' }, { l: 'Recorrente', v: 'recurring' }].map(t => (
                  <FilterChip key={t.v} active={typeFilter === t.v} onClick={() => setTypeFilter(typeFilter === t.v ? null : t.v)}>
                    {t.l}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categorias</p>
              <div className="flex gap-2 flex-wrap">
                {categoryData.map(c => (
                  <FilterChip
                    key={c.name}
                    active={catFilter === c.name}
                    onClick={() => setCatFilter(catFilter === c.name ? null : c.name)}
                  >
                    <CategoryIcon name={c.icon} size={14} className="shrink-0 text-muted-foreground" />
                    {c.name}
                  </FilterChip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-cgreen-500 focus:ring-cgreen-500"
                />
                Comparar com período anterior
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={goalMode}
                  onChange={(e) => setGoalMode(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-cgreen-500 focus:ring-cgreen-500"
                />
                Modo metas
              </label>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Saldo (período)"
          value={(txs.length ? analytics.balance : summaryData.balance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={txs.length ? Math.min(99, Math.abs(analytics.savingsRate)) : summaryData.balanceChange}
          trend={txs.length ? (analytics.balance >= 0 ? "up" : "down") : "up"}
        />
        <MetricCard
          label="Receitas"
          value={(txs.length ? analytics.income : summaryData.totalIncome).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={txs.length ? (analytics.budgetVar != null ? Math.round(analytics.budgetVar) : summaryData.incomeChange) : summaryData.incomeChange}
          trend={txs.length && analytics.budgetVar != null && analytics.budgetVar < 0 ? "down" : "up"}
        />
        <MetricCard
          label="Despesas"
          value={(txs.length ? analytics.expense : summaryData.totalExpense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={txs.length ? Math.round((analytics.expense / Math.max(analytics.income, 1)) * 100) : summaryData.expenseChange}
          trend="down"
        />
        <MetricCard
          label="Taxa de Poupança"
          value={(txs.length ? analytics.savingsRate : summaryData.savingsRate).toFixed(1)}
          change={txs.length ? Math.round(analytics.topShare) : summaryData.savingsRateChange}
          prefix=""
          suffix="%"
          trend={txs.length ? (analytics.savingsRate >= 20 ? "up" : "neutral") : "up"}
        />
        <MetricCard
          label="Média diária"
          value={(txs.length ? analytics.dailyAvgExpense : summaryData.dailyAvgExpense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={summaryData.dailyAvgChange}
          trend="down"
        />
        <MetricCard
          label="Score Financeiro"
          value={(txs.length ? Math.round(analytics.score) : summaryData.financialScore).toString()}
          change={3}
          prefix=""
          suffix="/100"
          trend="up"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-6">
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Ticket médio (desp.)</p>
          <p className="text-lg font-semibold tabular text-foreground">
            R$ {(txs.length ? analytics.avgTicket : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-muted-foreground">{txs.length ? `${txs.filter((t) => t.type === "expense").length} despesas` : "—"}</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Maior categoria</p>
          <p className="truncate text-lg font-semibold text-foreground">{txs.length && analytics.topCat ? analytics.topCat : "—"}</p>
          <p className="text-[11px] text-muted-foreground">
            {txs.length ? `${analytics.topShare.toFixed(0)}% das despesas` : "Filtre o período"}
          </p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dias com lançamento</p>
          <p className="text-lg font-semibold tabular text-foreground">{txs.length ? analytics.activeDays : "—"}</p>
          <p className="text-[11px] text-muted-foreground">No intervalo selecionado</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Renda planejada</p>
          <p className="text-lg font-semibold tabular text-foreground">
            {expectedIncome != null ? `R$ ${expectedIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {expectedIncome != null && txs.length
              ? `${analytics.budgetVar != null && analytics.budgetVar >= 0 ? "Acima" : "Abaixo"} da meta`
              : "Defina em Renda mensal"}
          </p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Liquidez (período)</p>
          <p className="text-lg font-semibold tabular text-cgreen-500">
            {txs.length ? `${((analytics.balance / Math.max(analytics.expense, 1)) * 100).toFixed(0)}%` : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">Saldo ÷ despesas</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Projeção simples</p>
          <p className="text-lg font-semibold tabular text-foreground">
            {txs.length && analytics.dailyAvgExpense > 0
              ? `R$ ${Math.max(0, analytics.balance - analytics.dailyAvgExpense * 5).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
              : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">Saldo − 5× média diária</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl bg-[#1C1C1E] p-4 dark:bg-[#1C1C1E]">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-cgray-400">Patrimônio Líquido</p>
          <p className="text-xl font-semibold tabular tracking-tight text-cgreen-400">R$ 42.800</p>
          <p className="text-[11px] text-cgray-500">↑ 8.2% este mês</p>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dívida / Renda</p>
          <p className="text-xl font-semibold tabular tracking-tight text-foreground">{summaryData.debtToIncome}%</p>
          <p className="text-[11px] text-cgreen-500">Saudável (&lt;30%)</p>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Fundo Emergência</p>
          <p className="text-xl font-semibold tabular tracking-tight text-foreground">{summaryData.emergencyFundMonths} meses</p>
          <p className="text-[11px] text-camber-main">Meta: 6 meses</p>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Consistência</p>
          <p className="text-xl font-semibold tabular tracking-tight text-foreground">{summaryData.financialConsistency}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-cgreen-500" style={{ width: `${summaryData.financialConsistency}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Gastos por Categoria</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
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
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<DashTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartPlotArea>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {pieData.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                <span className="flex min-w-0 items-center gap-1 truncate text-muted-foreground">
                  {"icon" in c && c.icon ? <CategoryIcon name={c.icon as string} size={14} /> : null}
                  {c.name}
                </span>
                <span className="ml-auto tabular text-xs font-medium text-foreground">
                  R$ {c.value.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Receitas vs Despesas</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barEvolution} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickFill }} />
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<DashTooltip />} />
                <Bar dataKey="income" name="Receitas" fill="#4CAF50" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" name="Despesas" fill="#EF5350" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Saldo Acumulado no Mês</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashflowData}>
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: tickFill }} />
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip content={<DashTooltip />} />
                {goalMode && (
                  <ReferenceLine
                    y={4000}
                    stroke="#FFB300"
                    strokeDasharray="5 5"
                    label={{ value: "Meta", fill: "#FFB300", fontSize: 11 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="accumulated"
                  name="Saldo"
                  stroke="#4CAF50"
                  fill="url(#greenGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Equilíbrio Financeiro</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={gridStroke} />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: tickFill }} />
                <Radar name="Atual" dataKey="current" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.2} />
                <Radar
                  name="Ideal"
                  dataKey="ideal"
                  stroke={isDark ? "#5C5C5E" : "#E5E5EA"}
                  fill="transparent"
                  strokeDasharray="4 4"
                />
                <Legend wrapperStyle={{ fontSize: 12, color: tickFill }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Meta vs Atual por Categoria</h3>
        <BulletChart data={bulletData} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Fluxo Acumulado</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={stackedFromApi}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: tickFill }} />
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<DashTooltip />} />
                <Area type="monotone" dataKey="income" name="Receitas" stackId="1" stroke="#4CAF50" fill="#C8E6C9" />
                <Area type="monotone" dataKey="expense" name="Despesas" stackId="2" stroke="#EF5350" fill="#FFEBEE" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Tendência Semanal</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: tickFill }} />
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<DashTooltip />} />
                <Bar dataKey="expense" name="Despesas" fill="#EF5350" radius={[4, 4, 0, 0]} barSize={24} />
                <Line type="monotone" dataKey="avg" name="Média" stroke="#FFB300" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Média Móvel de Gastos</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={movingAvgData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: tickFill }} />
                <YAxis tick={{ fontSize: 11, fill: tickFill }} />
                <Tooltip content={<DashTooltip />} />
                <Line type="monotone" dataKey="daily" name="Diário" stroke={tickFill} strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="avg7d" name="Média 7d" stroke="#4CAF50" strokeWidth={2} dot={false} />
                <ReferenceLine
                  y={175}
                  stroke="#FFB300"
                  strokeDasharray="5 5"
                  label={{ value: "Média 30d", fill: "#FFB300", fontSize: 11 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Distribuição por Horário</h3>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={timeDistribution}
                  dataKey="value"
                  nameKey="period"
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  animationDuration={600}
                >
                  {timeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<DashTooltip />} />
                <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Mapa de Calor — Gastos Diários</h3>
        <ChartPlotArea className="p-4">
          <SpendingHeatmap />
        </ChartPlotArea>
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Painéis adicionais de gastos</h2>
        <p className="text-sm text-muted-foreground">
          Treemap, ranking, acumulado, dispersão, dia da semana e canal de registro — todos respeitam o intervalo de datas e filtros ativos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Treemap — volume por categoria</h3>
          <p className="mb-4 text-xs text-muted-foreground">Área proporcional ao gasto no período filtrado.</p>
          <ChartPlotArea className="overflow-hidden p-2">
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={treemapExpenseData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="hsl(var(--border))"
                isAnimationActive
                content={({ x, y, width, height, name, value, fill }) =>
                  width > 48 && height > 28 ? (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} className="opacity-95" />
                      <text x={x + 6} y={y + 16} fill="white" fontSize={11} className="drop-shadow-sm">
                        {String(name).slice(0, 12)}
                      </text>
                      <text x={x + 6} y={y + 28} fill="white" fontSize={10} opacity={0.9}>
                        R$ {Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </text>
                    </g>
                  ) : (
                    <g>
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} ry={2} />
                    </g>
                  )
                }
              >
                <Tooltip
                  formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Total"]}
                />
              </Treemap>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Ranking horizontal — top categorias</h3>
          <p className="mb-4 text-xs text-muted-foreground">Ordenação por valor de despesa.</p>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart layout="vertical" data={horizontalCategoryRank} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: tickFill }} />
                <Tooltip content={<DashTooltip />} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Despesa"]} />
                <Bar dataKey="total" name="Despesa" fill="#22c55e" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Despesas acumuladas no período</h3>
          <p className="mb-4 text-xs text-muted-foreground">Cada ponto é uma transação; eixo Y é o total acumulado.</p>
          <ChartPlotArea>
            {cumulativeExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cumulativeExpenseData}>
                  <defs>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: tickFill }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip content={<DashTooltip />} />
                  <Area type="stepAfter" dataKey="acumulado" name="Acumulado" stroke="#ef4444" fill="url(#accGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem despesas no período.</p>
            )}
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Dispersão — dia do mês × valor</h3>
          <p className="mb-4 text-xs text-muted-foreground">Identifique clusters de gastos e outliers.</p>
          <ChartPlotArea>
            {scatterDespesas.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis type="number" dataKey="diaMes" name="Dia" tick={{ fontSize: 11, fill: tickFill }} domain={[0.5, 31.5]} />
                  <YAxis type="number" dataKey="valor" name="R$" tick={{ fontSize: 11, fill: tickFill }} />
                  <ZAxis type="number" dataKey="valor" range={[40, 400]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const p = payload[0].payload as { nome: string; valor: number; diaMes: number };
                      return (
                        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-medium text-foreground">{p.nome}</p>
                          <p className="text-muted-foreground">Dia {p.diaMes}</p>
                          <p className="tabular font-semibold text-foreground">R$ {p.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterDespesas} fill="#16a34a" fillOpacity={0.65} />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem despesas no período.</p>
            )}
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gastos por dia da semana</h3>
          <p className="mb-4 text-xs text-muted-foreground">Útil para ver peso de fins de semana vs dias úteis.</p>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={gastosPorDiaSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: tickFill }} />
                <YAxis tick={{ fontSize: 11, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip content={<DashTooltip />} />
                <Bar dataKey="total" name="Despesas" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Despesas por canal</h3>
          <p className="mb-4 text-xs text-muted-foreground">WhatsApp, web, recorrente ou lançamento manual.</p>
          <ChartPlotArea>
            {despesasPorOrigem.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
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
                    {despesasPorOrigem.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<DashTooltip />} />
                  <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Sem despesas no período.</p>
            )}
          </ChartPlotArea>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground capitalize">Relatório de gastos — {monthLabel}</h3>
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maior gasto único</p>
            <p className="text-base font-semibold text-foreground">
              {largest ? `R$ ${largest.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {largest ? (
                <>
                  <CategoryIcon name={largest.categoryIcon} size={14} />
                  {largest.description ?? largest.categoryName} —{" "}
                  {new Date(largest.occurredAt).toLocaleDateString("pt-BR")}
                </>
              ) : (
                "Sem despesas no filtro"
              )}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dia mais caro</p>
            <p className="text-base font-semibold text-foreground">
              {priciestDay
                ? new Date(priciestDay.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {priciestDay
                ? `R$ ${priciestDay.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${priciestDay.count} transações`
                : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Concentração</p>
            <p className="text-base font-semibold text-camber-main">
              {txs.length && analytics.topCat ? `${analytics.topCat} · ${analytics.topShare.toFixed(0)}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Participação nas despesas do período</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Gasto</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Meta</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">%</th>
                <th className="py-2 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">vs Anterior</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((c, idx) => {
                const pct = Math.round((c.value / c.goal) * 100);
                const changes = [18, -5, 12, -3, 8, 22, -7, 3];
                const prevChange = changes[idx] || 0;
                return (
                  <tr key={c.name} className="border-b border-border/60">
                    <td className="py-2.5 font-medium text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon name={c.icon} size={16} />
                        {c.name}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular text-foreground">
                      R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right tabular text-muted-foreground">R$ {c.goal.toLocaleString("pt-BR")}</td>
                    <td className="py-2.5 text-right">
                      <span
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
                      </span>
                    </td>
                    <td className={cn("py-2.5 text-right text-xs font-medium", prevChange >= 0 ? "text-cred-main" : "text-cgreen-500")}>
                      {prevChange >= 0 ? "↑" : "↓"} {Math.abs(prevChange)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb size={18} className="text-camber-main" />
          <h3 className="text-base font-semibold tracking-tight text-foreground">Análise Inteligente</h3>
        </div>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "flex items-start gap-3 rounded-xl p-3 text-sm",
                insight.type === "warning"
                  ? "bg-camber-light dark:bg-amber-900/20"
                  : insight.type === "success"
                    ? "bg-cgreen-50 dark:bg-cgreen-900/20"
                    : "bg-muted/60",
              )}
            >
              <CategoryIcon name={insight.iconKey} size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground/90">{insight.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Padrão de Comportamento</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <CalendarDays className="h-8 w-8 shrink-0 text-cgreen-500" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Fim de semana = mais gastos</p>
                <p className="text-xs text-muted-foreground">Você gasta 34% a mais sáb/dom vs dias úteis</p>
              </div>
              <span className="shrink-0 rounded-full bg-camber-light px-2 py-1 text-xs font-medium text-camber-main dark:bg-amber-900/30">
                Padrão
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <Utensils className="h-8 w-8 shrink-0 text-camber-main" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Delivery à noite</p>
                <p className="text-xs text-muted-foreground">68% dos gastos em alimentação são após 19h</p>
              </div>
              <span className="shrink-0 rounded-full bg-cred-light px-2 py-1 text-xs font-medium text-cred-main dark:bg-red-900/25">
                Atenção
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <CreditCard className="h-8 w-8 shrink-0 text-cred-main" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Compras por impulso</p>
                <p className="text-xs text-muted-foreground">3 compras acima de R$ 100 não planejadas</p>
              </div>
              <span className="shrink-0 rounded-full bg-camber-light px-2 py-1 text-xs font-medium text-camber-main dark:bg-amber-900/30">
                Alerta
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">Previsão & Risco</h3>
          <div className="space-y-4">
            <div className="rounded-xl bg-cgreen-50 p-4 dark:bg-cgreen-900/20">
              <div className="mb-1 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cgreen-600 dark:text-cgreen-400" />
                <p className="text-sm font-medium text-cgreen-700 dark:text-cgreen-400">Previsão de saldo fim do mês</p>
              </div>
              <p className="text-xl font-semibold tabular tracking-tight text-cgreen-700 dark:text-cgreen-400">
                {txs.length
                  ? `R$ ${(analytics.balance - analytics.dailyAvgExpense * Math.max(0, 30 - analytics.activeDays)).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
                  : "R$ 3.680,00"}
              </p>
              <p className="mt-1 text-xs text-cgreen-600 dark:text-cgreen-500/90">Projeção linear a partir do período filtrado</p>
            </div>
            <div className="rounded-xl bg-camber-light p-4 dark:bg-amber-900/20">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-camber-main" />
                <p className="text-sm font-medium text-camber-main">Risco de estouro</p>
              </div>
              <p className="text-sm text-foreground/90">
                Alimentação tem <span className="font-medium text-cred-main">78% de chance</span> de exceder a meta nos próximos 10 dias.
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Target className="h-4 w-4 text-foreground" />
                <p className="text-sm font-medium text-foreground">Score financeiro</p>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-cgreen-500"
                    style={{ width: `${txs.length ? analytics.score : 76}%` }}
                  />
                </div>
                <span className="text-base font-semibold tabular text-foreground">
                  {txs.length ? Math.round(analytics.score) : 76}/100
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Composto por poupança, concentração e meta de renda</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight text-foreground">Transações Recentes</h3>
          <button type="button" className="text-sm font-medium text-cgreen-500 hover:text-cgreen-600 dark:hover:text-cgreen-400">
            Ver todas
          </button>
        </div>
        <div className="space-y-1">
          {recentList.length > 0
            ? recentList.map((t) => (
                <div key={t.id} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                    <CategoryIcon name={t.categoryIcon} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{t.description ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.categoryName ?? "—"} ·{" "}
                      {new Date(t.occurredAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={cn("tabular text-sm font-semibold", t.type === "income" ? "text-cgreen-500" : "text-cred-main")}
                  >
                    {t.type === "income" ? "+" : "-"} R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            : recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                    <CategoryIcon name={t.categoryIcon} size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.category} · {new Date(t.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <span
                    className={cn("tabular text-sm font-semibold", t.type === "income" ? "text-cgreen-500" : "text-cred-main")}
                  >
                    {t.type === "income" ? "+" : "-"} R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
        </div>
      </div>

      <TransactionDialog
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        type="expense"
        categories={categories}
        loading={txLoading}
        onSubmit={async (data) => {
          if (!token) return;
          setTxLoading(true);
          try {
            await apiPostTransaction(token, { ...data, type: "expense", source: "manual" });
            toast.success("Gasto registrado.");
            setExpenseOpen(false);
            void qc.invalidateQueries({ queryKey: ["transactions"] });
            void qc.invalidateQueries({ queryKey: ["monthly"] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
          } finally {
            setTxLoading(false);
          }
        }}
      />
      <TransactionDialog
        open={incomeOpen}
        onOpenChange={setIncomeOpen}
        type="income"
        categories={categories}
        loading={txLoading}
        onSubmit={async (data) => {
          if (!token) return;
          setTxLoading(true);
          try {
            await apiPostTransaction(token, { ...data, type: "income", source: "manual" });
            toast.success("Receita registrada.");
            setIncomeOpen(false);
            void qc.invalidateQueries({ queryKey: ["transactions"] });
            void qc.invalidateQueries({ queryKey: ["monthly"] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
          } finally {
            setTxLoading(false);
          }
        }}
      />
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
            await apiPutBudget(token, {
              month: currentMonth,
              totalIncomeExpected: inc || null,
              totalExpenseLimit: lim || null,
            });
            toast.success("Orçamento salvo.");
            void qc.invalidateQueries({ queryKey: ["budget", token, currentMonth] });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Erro");
          } finally {
            setBudgetLoading(false);
          }
        }}
      />
    </div>
  );
}
