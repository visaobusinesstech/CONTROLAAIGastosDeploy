/**
 * Dashboard principal — KPIs, gráficos, transações e filtros (dados reais da API).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useMemo, useState, type ReactNode } from "react"; // Estado de filtros e período
import { useTheme } from "next-themes"; // Cores dos gráficos por tema
import { motion } from "framer-motion"; // Animações de cards
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // Dados da API com cache
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
  apiPutBudget,
  apiSeedRichDemo,
  apiDeleteTransaction,
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
  Ban,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, Legend, ComposedChart, ReferenceLine,
  Treemap, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { CHART_COLORS } from "@/lib/chart-colors";

/** Tooltip customizado dos gráficos Recharts — adapta cores ao tema. */
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

function monthLabelFromYm(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
}

function shiftMonthYm(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthShortLabel(ym: string) {
  const [y, mo] = ym.split("-").map(Number);
  return format(new Date(y, mo - 1, 1), "MMM", { locale: ptBR }).replace(".", "");
}

function txAmount(t: ApiTransaction): number {
  const n = typeof t.amount === "number" ? t.amount : Number(t.amount);
  return Number.isFinite(n) ? n : 0;
}

function aggregateExpensesByCategory(txs: ApiTransaction[]) {
  const map = new Map<string, { value: number; color: string; icon: string | null }>();
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
    value: Math.round(v.value * 100) / 100,
    color: v.color || CHART_COLORS[i % CHART_COLORS.length],
    icon: v.icon,
    goal: Math.max(v.value * 1.1, 100),
  }));
}

function periodSummary(
  txs: ApiTransaction[],
  rangeDays: number,
  expectedIncome: number | null,
  initialBalance = 0,
) {
  const incomeFromTx = txs.filter((t) => t.type === "income").reduce((s, t) => s + txAmount(t), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + txAmount(t), 0);
  const income =
    incomeFromTx > 0 ? incomeFromTx : expectedIncome != null && expectedIncome > 0 ? expectedIncome : 0;
  const balance = income - expense + initialBalance;
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
  return ex.reduce((a, b) => (txAmount(a) >= txAmount(b) ? a : b));
}

function spendByDay(txs: ApiTransaction[]) {
  const map = new Map<string, { total: number; count: number }>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    const d = t.occurredAt.slice(0, 10);
    const cur = map.get(d) ?? { total: 0, count: 0 };
    cur.total += txAmount(t);
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

function BulletChart({ data, isDark }: { data: Array<{ name: string; actual: number; target: number; ranges: [number, number, number] }>; isDark: boolean }) {
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
function SpendingHeatmap({ txs }: { txs: ApiTransaction[] }) {
  const heatmapData = useMemo(() => {
    const byDay = new Map<number, number>();
    for (const t of txs) {
      if (t.type !== "expense") continue;
      const d = new Date(t.occurredAt).getDate();
      byDay.set(d, (byDay.get(d) ?? 0) + txAmount(t));
    }
    return [...byDay.entries()].map(([day, amount]) => ({
      day,
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

  const inactivateTx = useMutation({
    mutationFn: (id: string) => apiDeleteTransaction(token!, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["kpis"] });
      void qc.invalidateQueries({ queryKey: ["monthly-report"] });
      toast.success("Lançamento inativado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ── Estado local: mês, filtros, modais e calendário ── */
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
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

  /* ── Queries React Query — dados financeiros da API ── */

  const { data: catRes } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => apiGetCategories(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const categories = catRes?.categories ?? [];

  const { data: txRes, isLoading: txListLoading } = useQuery({
    queryKey: ["transactions", token, fromIso, toIso],
    queryFn: () => apiGetTransactions(token!, { from: fromIso, to: toIso }),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
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
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const expectedIncome = budgetRes?.budget?.totalIncomeExpected ?? null;

  const { data: monthlyRes } = useQuery({
    queryKey: ["monthly", token],
    queryFn: () => apiGetMonthlyReport(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: kpisRes } = useQuery({
    queryKey: ["kpis", token],
    queryFn: () => apiGetKpis(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: insightsRes } = useQuery({
    queryKey: ["insights", token],
    queryFn: () => apiGetInsights(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: settingsRes } = useQuery({
    queryKey: ["settings", token],
    queryFn: () => apiGetSettings(token!),
    enabled: !!token,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const initialBalance = settingsRes?.settings.initialBalance ?? 0;

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
    () => periodSummary(txs, rangeDays, expectedIncome, initialBalance),
    [txs, rangeDays, expectedIncome, initialBalance],
  );

  const pieFromApi = useMemo(() => aggregateExpensesByCategory(txs), [txs]);
  const pieData = pieFromApi;

  const treemapExpenseData = useMemo(() => {
    const src = pieFromApi;
    return src.slice(0, 14).map((c) => ({
      name: c.name,
      size: Math.max(typeof c.value === "number" ? c.value : 0, 1),
      fill: c.color,
    }));
  }, [pieFromApi]);

  const horizontalCategoryRank = useMemo(() => {
    const src = pieFromApi;
    return [...src]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((c) => ({ name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name, total: c.value }));
  }, [pieFromApi]);

  const cumulativeExpenseData = useMemo(() => {
    const exp = [...txs].filter((t) => t.type === "expense").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    let acc = 0;
    const rows = exp.map((t, idx) => {
      acc += txAmount(t);
      return {
        ord: idx + 1,
        label: format(new Date(t.occurredAt), "dd/MM", { locale: ptBR }),
        acumulado: Math.round(acc * 100) / 100,
      };
    });
    return rows;
  }, [txs]);

  const scatterDespesas = useMemo(() => {
    return txs
      .filter((t) => t.type === "expense")
      .map((t) => ({
        diaMes: new Date(t.occurredAt).getDate(),
        valor: txAmount(t),
        nome: (t.description ?? t.categoryName ?? "Despesa").slice(0, 28),
      }));
  }, [txs]);

  const gastosPorDiaSemana = useMemo(() => {
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const sums = [0, 0, 0, 0, 0, 0, 0];
    for (const t of txs) {
      if (t.type !== "expense") continue;
      sums[new Date(t.occurredAt).getDay()] += txAmount(t);
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
      m.set(k, (m.get(k) ?? 0) + txAmount(t));
    }
    return [...m.entries()].map(([name, value], i) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [txs]);

  /** Saldo acumulado dia a dia no período filtrado. */
  const balanceOverTime = useMemo(() => {
    const byDay = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const d = t.occurredAt.slice(0, 10);
      const cur = byDay.get(d) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += txAmount(t);
      else cur.expense += txAmount(t);
      byDay.set(d, cur);
    }
    const sorted = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    let acc = initialBalance;
    if (sorted.length === 0 && expectedIncome != null && expectedIncome > 0) {
      const today = format(new Date(), "dd/MM", { locale: ptBR });
      return [{ day: today, accumulated: Math.round(expectedIncome * 100) / 100 }];
    }
    return sorted.map(([day, v]) => {
      acc += v.income - v.expense;
      return {
        day: format(new Date(`${day}T12:00:00`), "dd/MM", { locale: ptBR }),
        accumulated: Math.round(acc * 100) / 100,
      };
    });
  }, [txs, initialBalance, expectedIncome]);

  /** Gastos diários com média móvel de 7 dias. */
  const expenseDailyWithAvg = useMemo(() => {
    const byDay = new Map<string, number>();
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
        label: format(new Date(`${day}T12:00:00`), "dd/MM", { locale: ptBR }),
        daily: Math.round(daily * 100) / 100,
        avg7d: Math.round(avg7d * 100) / 100,
      };
    });
  }, [txs]);

  const gastosPorDiaSemanaComposed = useMemo(() => {
    const avg =
      gastosPorDiaSemana.reduce((s, r) => s + r.total, 0) / Math.max(gastosPorDiaSemana.filter((r) => r.total > 0).length, 1);
    return gastosPorDiaSemana.map((r) => ({ ...r, avg: Math.round(avg * 100) / 100 }));
  }, [gastosPorDiaSemana]);

  const radarCategoryData = useMemo(
    () => pieFromApi.map((p) => ({ category: p.name, value: p.value, fullMark: Math.max(p.value * 1.2, 100) })),
    [pieFromApi],
  );

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
  const concentrationLabel = useMemo(() => {
    if (analytics.topCat) return `${analytics.topCat} · ${analytics.topShare.toFixed(0)}%`;
    return "—";
  }, [analytics.topCat, analytics.topShare]);

  const expenseCount = useMemo(() => txs.filter((t) => t.type === "expense").length, [txs]);
  const hasExpenseData = expenseCount > 0;

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
    else if (txs.length && analytics.income > 0)
      plannedNote = analytics.budgetVar != null && analytics.budgetVar >= 0 ? "Receita acima do planejado" : "Receita abaixo do planejado";
    else plannedNote = "Valor que você planejou receber";
    const liq = analytics.expense > 0 ? Math.round((analytics.balance / analytics.expense) * 100) : 0;
    const liqNote = analytics.expense > 0 ? "Sobra para cada R$ 1 de gasto" : "Sem gastos no período";
    const proj = Math.max(0, analytics.balance - analytics.dailyAvgExpense * 5);
    const projStr = `R$ ${proj.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    return { ticket, ticketNote, topCat, topNote, days, daysNote, plannedStr, plannedNote, liq, liqNote, projStr };
  }, [txs, analytics, expenseCount, hasExpenseData, expectedIncome]);

  const monthEndPreview = useMemo(() => {
    if (!txs.length) return 0;
    const rest = Math.max(0, 30 - analytics.activeDays);
    return analytics.balance - analytics.dailyAvgExpense * rest;
  }, [txs.length, analytics.balance, analytics.activeDays, analytics.dailyAvgExpense]);

  const recentList = txs.slice(0, 12);

  const monthLabel = monthLabelFromYm(currentMonth);

  /* ── UI: cabeçalho, KPIs, gráficos Recharts e lista de transações ── */
  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-center gap-2 sm:justify-start sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setCurrentMonth(shiftMonthYm(currentMonth, -1));
                setRangeOverride(null);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft size={16} />
            </button>
            <h1 className="text-lg font-semibold capitalize tracking-tight text-foreground sm:text-xl">{monthLabel}</h1>
            <button
              type="button"
              onClick={() => {
                setCurrentMonth(shiftMonthYm(currentMonth, 1));
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
              <Button type="button" variant="outline" size="sm" className="max-w-full gap-2 border-border bg-card text-xs sm:text-sm">
                <CalendarClock className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  <span className="sm:hidden">{format(activeRange.from, "dd/MM", { locale: ptBR })} — {format(activeRange.to, "dd/MM", { locale: ptBR })}</span>
                  <span className="hidden sm:inline">
                    {format(activeRange.from, "dd/MM/yyyy HH:mm", { locale: ptBR })} —{" "}
                    {format(activeRange.to, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </span>
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
                {categories.filter((c) => c.type === "expense").map(c => (
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
          label="Saldo do período"
          value={analytics.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={txs.length ? Math.min(99, Math.abs(analytics.savingsRate)) : 0}
          trend={txs.length ? (analytics.balance >= 0 ? "up" : "down") : "neutral"}
        />
        <MetricCard
          label="Receitas"
          value={analytics.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={txs.length && analytics.budgetVar != null ? Math.round(analytics.budgetVar) : 0}
          trend={txs.length && analytics.budgetVar != null && analytics.budgetVar < 0 ? "down" : "up"}
        />
        <MetricCard
          label="Despesas"
          value={analytics.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={txs.length ? Math.round((analytics.expense / Math.max(analytics.income, 1)) * 100) : 0}
          trend="down"
        />
        <MetricCard
          label="Quanto sobrou (%)"
          value={analytics.savingsRate.toFixed(1)}
          change={txs.length ? Math.round(analytics.topShare) : 0}
          prefix=""
          suffix="%"
          trend={txs.length ? (analytics.savingsRate >= 20 ? "up" : "neutral") : "neutral"}
        />
        <MetricCard
          label="Gasto médio por dia"
          value={analytics.dailyAvgExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          change={0}
          trend="down"
        />
        <MetricCard
          label="Sua nota (0–100)"
          value={(kpisRes?.kpis?.financialScore ?? Math.round(analytics.score)).toString()}
          change={3}
          prefix=""
          suffix="/100"
          trend="up"
        />
      </div>

      {kpisRes?.kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl border border-cgreen-500/30 bg-cgreen-50/50 dark:bg-cgreen-900/10 p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Score Financeiro IA</p>
            <p className="text-2xl font-bold text-cgreen-600 dark:text-cgreen-400">{kpisRes.kpis.financialScore}/100</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {(kpisRes.kpis.expectedIncome ?? 0) > 0 ? "Disponível estimado" : "Previsão saldo fim do mês"}
            </p>
            <p className="text-lg font-semibold tabular">
              R${" "}
              {((kpisRes.kpis.expectedIncome ?? 0) > 0
                ? kpisRes.kpis.projectedAvailable ?? 0
                : kpisRes.kpis.endOfMonthBalanceProjection
              ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Projeção de gastos</p>
            <p className="text-lg font-semibold tabular">R$ {kpisRes.kpis.expenseProjection.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tendência</p>
            <p className="text-lg font-semibold capitalize">{kpisRes.kpis.trend === "up" ? "📈 Positiva" : kpisRes.kpis.trend === "down" ? "📉 Negativa" : "➡️ Estável"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risco endividamento</p>
            <p className="text-lg font-semibold capitalize">{kpisRes.kpis.debtRisk === "low" ? "Baixo" : kpisRes.kpis.debtRisk === "medium" ? "Médio" : "Alto"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Meta estimada</p>
            <p className="text-lg font-semibold">{kpisRes.kpis.goalCompletionMonths ? `${kpisRes.kpis.goalCompletionMonths} meses` : "—"}</p>
          </div>
        </div>
      )}

      {(insightsRes?.insights?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-camber-main" />
            <h3 className="text-sm font-semibold">Insights IA</h3>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {insightsRes!.insights.map((insight, i) => (
              <li key={i}>• {insight}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Valor médio por compra</p>
          <p className="text-lg font-semibold tabular text-foreground">
            R$ {secondaryCards.ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-muted-foreground">{secondaryCards.ticketNote}</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Onde mais gastou</p>
          <p className="truncate text-lg font-semibold text-foreground">{secondaryCards.topCat}</p>
          <p className="text-[11px] text-muted-foreground">{secondaryCards.topNote}</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dias com registro</p>
          <p className="text-lg font-semibold tabular text-foreground">{secondaryCards.days}</p>
          <p className="text-[11px] text-muted-foreground">{secondaryCards.daysNote}</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Renda que você planejou</p>
          <p className="text-lg font-semibold tabular text-foreground">{secondaryCards.plannedStr}</p>
          <p className="text-[11px] text-muted-foreground">{secondaryCards.plannedNote}</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Sobra vs. gastos</p>
          <p className="text-lg font-semibold tabular text-cgreen-500">{secondaryCards.liq}%</p>
          <p className="text-[11px] text-muted-foreground">{secondaryCards.liqNote}</p>
        </div>
        <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dinheiro após ~5 dias</p>
          <p className="text-lg font-semibold tabular text-foreground">{secondaryCards.projStr}</p>
          <p className="text-[11px] text-muted-foreground">Se o ritmo de gasto continuar igual</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Saldo atual</p>
          <p className="text-xl font-semibold tabular tracking-tight text-cgreen-500">
            R$ {analytics.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-muted-foreground">Dados reais do banco</p>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Risco endividamento</p>
          <p className="text-xl font-semibold tabular tracking-tight text-foreground capitalize">
            {kpisRes?.kpis?.debtRisk === "high" ? "Alto" : kpisRes?.kpis?.debtRisk === "medium" ? "Médio" : "Baixo"}
          </p>
          <p className="text-[11px] text-muted-foreground">Calculado pela IA</p>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Projeção fim do mês</p>
          <p className="text-xl font-semibold tabular tracking-tight text-foreground">
            R$ {(kpisRes?.kpis?.endOfMonthBalanceProjection ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-muted-foreground">Baseado nos gastos atuais</p>
        </div>
        <div className="flex min-h-[100px] flex-col justify-between rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Transações no período</p>
          <p className="text-xl font-semibold tabular tracking-tight text-foreground">{txs.length}</p>
          <p className="text-[11px] text-muted-foreground">{expenseCount} despesas registradas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gastos por categoria</h3>
          <p className="mb-4 text-xs text-muted-foreground">Cada fatia mostra quanto foi para cada tipo de despesa.</p>
          {pieData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Sem despesas no período — registre pelo WhatsApp ou acima.</p>
          ) : (
          <>
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
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Entrou vs. saiu (por mês)</h3>
          <p className="mb-4 text-xs text-muted-foreground">Barras verdes = receitas; vermelhas = despesas.</p>
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
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Saldo ao longo do mês</h3>
          <p className="mb-4 text-xs text-muted-foreground">Soma do que sobrou dia a dia (exemplo ilustrativo).</p>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={balanceOverTime.length > 0 ? balanceOverTime : barEvolution.map((r) => ({ day: r.month, accumulated: r.balance }))}>
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: tickFill }} />
                <YAxis tick={{ fontSize: 10, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} width={42} />
                <Tooltip content={<DashTooltip />} />
                {goalMode && expectedIncome != null && expectedIncome > 0 && (
                  <ReferenceLine
                    y={expectedIncome}
                    stroke="#FFB300"
                    strokeDasharray="5 5"
                    label={{ value: "Renda", fill: "#FFB300", fontSize: 10 }}
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
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Equilíbrio por tipo de gasto</h3>
          <p className="mb-4 text-xs text-muted-foreground">Cada eixo é uma área; a linha tracejada é só uma referência visual.</p>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarCategoryData}>
                <PolarGrid stroke={gridStroke} />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 9, fill: tickFill }} />
                <Radar name="Gastos" dataKey="value" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.25} />
                <Tooltip content={<DashTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: tickFill }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Limite vs. gasto real</h3>
        <p className="mb-4 text-xs text-muted-foreground">Barra colorida = quanto você já usou da meta da categoria (exemplo).</p>
        {pieData.length > 0 && (
          <BulletChart
            data={pieData.map((p) => {
              const target = p.goal ?? p.value * 1.1;
              return { name: p.name, actual: p.value, target, ranges: [target * 0.5, target * 0.8, target] as [number, number, number] };
            })}
            isDark={isDark}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Receitas e despesas empilhadas</h3>
          <p className="mb-4 text-xs text-muted-foreground">Áreas verde e vermelha mostram o volume de cada tipo ao longo dos meses.</p>
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
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gasto por semana</h3>
          <p className="mb-4 text-xs text-muted-foreground">Barras = total da semana; linha tracejada = média (exemplo).</p>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={gastosPorDiaSemanaComposed}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: tickFill }} />
                <YAxis tick={{ fontSize: 10, fill: tickFill }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={42} />
                <Tooltip content={<DashTooltip />} />
                <Bar dataKey="total" name="Despesas" fill="#EF5350" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="avg" name="Média" stroke="#FFB300" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gasto do dia e média de 7 dias</h3>
          <p className="mb-4 text-xs text-muted-foreground">Linha verde suaviza picos do dia a dia (exemplo).</p>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={expenseDailyWithAvg.length > 0 ? expenseDailyWithAvg : cumulativeExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: tickFill }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: tickFill }} width={42} />
                <Tooltip content={<DashTooltip />} />
                {"daily" in (expenseDailyWithAvg[0] ?? {}) && (
                  <Line type="monotone" dataKey="daily" name="Diário" stroke={tickFill} strokeWidth={1} dot={false} />
                )}
                {"avg7d" in (expenseDailyWithAvg[0] ?? {}) && (
                  <Line type="monotone" dataKey="avg7d" name="Média 7d" stroke="#4CAF50" strokeWidth={2} dot={false} />
                )}
                {expenseDailyWithAvg.length === 0 && (
                  <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#4CAF50" strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Gastos por faixa do dia</h3>
          <p className="mb-4 text-xs text-muted-foreground">Manhã, tarde ou noite — onde entram mais lançamentos (exemplo).</p>
          <ChartPlotArea>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={despesasPorOrigem}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="75%"
                  animationDuration={600}
                >
                  {despesasPorOrigem.map((entry, i) => (
                    <Cell key={i} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
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
        <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Calendário: dias com mais gasto</h3>
        <p className="mb-4 text-xs text-muted-foreground">Quanto mais escuro, mais você gastou naquele dia (exemplo).</p>
        <ChartPlotArea className="p-4">
          {txs.length > 0 && <SpendingHeatmap txs={txs} />}
        </ChartPlotArea>
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Mais gráficos de gastos</h2>
        <p className="text-sm text-muted-foreground">
          Quando você filtra o período, usamos seus dados; se não houver despesas, mostramos números de exemplo para o painel não ficar vazio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Quanto cada categoria “pesa”</h3>
          <p className="mb-4 text-xs text-muted-foreground">Quadrados maiores = mais dinheiro naquela categoria.</p>
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
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Categorias que mais gastaram</h3>
          <p className="mb-4 text-xs text-muted-foreground">Lista da maior para a menor despesa.</p>
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
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Total gasto somando as compras</h3>
          <p className="mb-4 text-xs text-muted-foreground">A linha sobe a cada nova despesa; mostra quanto já saiu no período.</p>
          <ChartPlotArea>
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
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Cada ponto é uma compra</h3>
          <p className="mb-4 text-xs text-muted-foreground">Eixo de baixo = dia do mês; altura = valor. Pontos altos = gastos maiores naquele dia.</p>
          <ChartPlotArea>
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
          </ChartPlotArea>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Quanto gastou em cada dia da semana</h3>
          <p className="mb-4 text-xs text-muted-foreground">Compare domingo a sábado de um relance.</p>
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
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">De onde veio o lançamento</h3>
          <p className="mb-4 text-xs text-muted-foreground">WhatsApp, site, recorrente ou lançamento manual no app.</p>
          <ChartPlotArea>
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
          </ChartPlotArea>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground capitalize">Resumo do mês — {monthLabel}</h3>
        <p className="mb-4 text-xs text-muted-foreground">Três números rápidos; sem dados no filtro, usamos um exemplo.</p>
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maior compra do período</p>
            {largest ? (
              <>
                <p className="text-base font-semibold text-foreground">
                  R$ {txAmount(largest).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CategoryIcon name={largest.categoryIcon} size={14} />
                  {largest.description ?? largest.categoryName} — {new Date(largest.occurredAt).toLocaleDateString("pt-BR")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma despesa neste período</p>
            )}
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dia em que mais gastou</p>
            {priciestDay ? (
              <>
                <p className="text-base font-semibold text-foreground">
                  {new Date(priciestDay.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  R$ {priciestDay.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em {priciestDay.count}{" "}
                  transações
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma despesa neste período</p>
            )}
          </div>
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maior fatia do gasto</p>
            <p className="text-base font-semibold text-camber-main">{concentrationLabel}</p>
            <p className="text-xs text-muted-foreground">Quanto essa parte representa do que você gastou</p>
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
              {pieData.map((c) => {
                const pct = c.goal ? Math.round((c.value / c.goal) * 100) : 0;
                return (
                  <tr key={c.name} className="border-b border-border/60">
                    <td className="py-2.5 font-medium text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CategoryIcon name={c.icon ?? "wallet"} size={16} />
                        {c.name}
                      </span>
                    </td>
                    <td className="py-2.5 text-right tabular text-foreground">
                      R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right tabular text-muted-foreground">R$ {(c.goal ?? 0).toLocaleString("pt-BR")}</td>
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
                    <td className="py-2.5 text-right tabular text-muted-foreground">—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(insightsRes?.insights?.length ?? 0) === 0 && txs.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Registre gastos pelo WhatsApp ou manualmente para ver insights da IA.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Hábitos que vale observar</h3>
          <p className="mb-4 text-xs text-muted-foreground">Exemplos para ilustrar o painel — com seus dados reais, estes textos podem mudar.</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <CalendarDays className="h-8 w-8 shrink-0 text-cgreen-500" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Fins de semana costumam pesar mais</p>
                <p className="text-xs text-muted-foreground">Muita gente gasta um pouco mais sábado e domingo — compare com seus lançamentos.</p>
              </div>
              <span className="shrink-0 rounded-full bg-camber-light px-2 py-1 text-xs font-medium text-camber-main dark:bg-amber-900/30">
                Dica
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <Utensils className="h-8 w-8 shrink-0 text-camber-main" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Comida à noite</p>
                <p className="text-xs text-muted-foreground">Se delivery e restaurante concentram à noite, o total do mês sobe rápido.</p>
              </div>
              <span className="shrink-0 rounded-full bg-cred-light px-2 py-1 text-xs font-medium text-cred-main dark:bg-red-900/25">
                Olho vivo
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
              <CreditCard className="h-8 w-8 shrink-0 text-cred-main" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">Compras maiores sem planejar</p>
                <p className="text-xs text-muted-foreground">Alguns gastos acima do habitual podem ser só revisar antes de repetir.</p>
              </div>
              <span className="shrink-0 rounded-full bg-camber-light px-2 py-1 text-xs font-medium text-camber-main dark:bg-amber-900/30">
                Lembrete
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold tracking-tight text-foreground">Fechamento do mês (estimativa)</h3>
          <p className="mb-4 text-xs text-muted-foreground">Número aproximado; serve para ter uma ideia, não é promessa exata.</p>
          <div className="space-y-4">
            <div className="rounded-xl bg-cgreen-50 p-4 dark:bg-cgreen-900/20">
              <div className="mb-1 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cgreen-600 dark:text-cgreen-400" />
                <p className="text-sm font-medium text-cgreen-700 dark:text-cgreen-400">Saldo estimado no último dia do mês</p>
              </div>
              <p className="text-xl font-semibold tabular tracking-tight text-cgreen-700 dark:text-cgreen-400">
                R$ {monthEndPreview.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-1 text-xs text-cgreen-600 dark:text-cgreen-500/90">
                {txs.length ? "Com base no que já entrou e no ritmo de gasto do período." : "Valor de exemplo até você registrar transações."}
              </p>
            </div>
            <div className="rounded-xl bg-camber-light p-4 dark:bg-amber-900/20">
              <div className="mb-1 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-camber-main" />
                <p className="text-sm font-medium text-camber-main">Meta de alimentação</p>
              </div>
              <p className="text-sm text-foreground/90">
                Se o ritmo continuar, <span className="font-medium text-cred-main">alimentação</span> pode passar do limite que você definiu — vale conferir a categoria esta semana.
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Target className="h-4 w-4 text-foreground" />
                <p className="text-sm font-medium text-foreground">Sua nota geral</p>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-cgreen-500"
                    style={{ width: `${kpisRes?.kpis?.financialScore ?? Math.round(analytics.score)}%` }}
                  />
                </div>
                <span className="text-base font-semibold tabular text-foreground">
                  {kpisRes?.kpis?.financialScore ?? Math.round(analytics.score)}/100
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Quanto você poupa, como distribui gastos e se bate a meta de renda entram nessa nota.</p>
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
                    {t.type === "income" ? "+" : "-"} R$ {txAmount(t).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-cred-main"
                    aria-label="Inativar lançamento"
                    title="Inativar lançamento"
                    disabled={inactivateTx.isPending}
                    onClick={() => inactivateTx.mutate(t.id)}
                  >
                    <Ban size={14} />
                  </button>
                </div>
              ))
            : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma transação no período. Registre pelo WhatsApp ou use os botões acima.
                </p>
              )}
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
            void qc.invalidateQueries({ queryKey: ["kpis"] });
            void qc.invalidateQueries({ queryKey: ["insights"] });
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
            void qc.invalidateQueries({ queryKey: ["kpis"] });
            void qc.invalidateQueries({ queryKey: ["insights"] });
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
