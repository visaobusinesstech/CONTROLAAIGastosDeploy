/**
 * Dashboard principal — KPIs, gráficos, transações e filtros (dados reais da API).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useMemo, useState, type ReactNode } from "react"; // Estado de filtros e período
// Importa funções/componentes de next-themes
import { useTheme } from "next-themes"; // Cores dos gráficos por tema
// Importa funções/componentes de framer-motion
import { motion } from "framer-motion"; // Animações de cards
// Importa funções/componentes de @tanstack/react-query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // Dados da API com cache
// Importa funções/componentes de sonner
import { toast } from "sonner";
// Importa funções/componentes de date-fns
import { format } from "date-fns";
// Importa funções/componentes de date-fns/locale
import { ptBR } from "date-fns/locale";
// Importa funções/componentes de @/lib/utils
import { cn } from "@/lib/utils";
// Importa funções/componentes de @/components/ui/magic-card
import { MagicCard } from "@/components/ui/magic-card";
// Importa funções/componentes de @/components/ChartPlotArea
import { ChartPlotArea } from "@/components/ChartPlotArea";
// Importa funções/componentes de @/components/ui/button
import { Button } from "@/components/ui/button";
// Importa funções/componentes de @/components/ui/calendar
import { Calendar } from "@/components/ui/calendar";
// Importa funções/componentes de @/components/ui/popover
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Importa funções/componentes de @/components/DashboardDialogs
import { MonthlyBudgetDialog, TransactionDialog } from "@/components/DashboardDialogs";
// Importa funções/componentes de @/lib/category-icons
import { CategoryIcon } from "@/lib/category-icons";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiExportTransactionsCsv,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetBudget,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetCategories,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetMonthlyReport,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetTransactions,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetKpis,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetInsights,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetSettings,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPostTransaction,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPatchTransaction,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPutBudget,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiSeedRichDemo,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiDeleteTransaction,
  // Define formato de dados (TypeScript)
  type ApiTransaction,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/api";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  computeFinancialPeriodSummary,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  EMPTY_FINANCIAL_COPY,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  INCOME_FREQUENCY_LABELS,
  // Define formato de dados (TypeScript)
  type IncomeFrequency,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/financial-summary";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ChevronLeft,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ChevronRight,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Filter,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  BarChart3,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ArrowUpRight,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ArrowDownRight,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Minus,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Lightbulb,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Plus,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Download,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  CalendarClock,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  CalendarDays,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Utensils,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  CreditCard,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertTriangle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Target,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Wallet,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Ban,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Pencil,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Trash2,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "lucide-react";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  CartesianGrid, Tooltip, LineChart, Line, Area, AreaChart, RadarChart,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  PolarGrid, PolarAngleAxis, Radar, Legend, ComposedChart, ReferenceLine,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Treemap, ScatterChart, Scatter, ZAxis,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "recharts";
// Importa funções/componentes de @/lib/chart-colors
import { CHART_COLORS } from "@/lib/chart-colors";

/** Tooltip customizado dos gráficos Recharts — adapta cores ao tema. */
// Declara função auxiliar interna
function DashTooltip({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  active,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  payload,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  label,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  active?: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  payload?: Array<{ name: string; value: number; color: string }>;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  label?: string;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  // Constante local
  const dark = resolvedTheme === "dark";
  // Condição — executa bloco só se verdadeira
  if (!active || !payload?.length) return null;
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div
      // Classes CSS Tailwind — controla aparência visual
      className={cn(
        // Instrução do fluxo — parte da lógica de negócio ou interface
        "rounded-xl px-3 py-2 text-xs shadow-none ring-1",
        // Instrução do fluxo — parte da lógica de negócio ou interface
        dark
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? "bg-[#2C2C2E] text-foreground ring-white/10"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          : "bg-white text-foreground ring-black/5",
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}
    // Instrução do fluxo — parte da lógica de negócio ou interface
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
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      ))}
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Declara função auxiliar interna
function startOfDay(d: Date) {
  // Constante local
  const x = new Date(d);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  x.setHours(0, 0, 0, 0);
  // Retorna valor ou JSX para quem chamou
  return x;
}

// Declara função auxiliar interna
function endOfDay(d: Date) {
  // Constante local
  const x = new Date(d);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  x.setHours(23, 59, 59, 999);
  // Retorna valor ou JSX para quem chamou
  return x;
}

// Declara função auxiliar interna
function startOfMonthFromYm(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  // Retorna valor ou JSX para quem chamou
  return startOfDay(new Date(y, m - 1, 1));
}

// Declara função auxiliar interna
function endOfMonthFromYm(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  // Retorna valor ou JSX para quem chamou
  return endOfDay(new Date(y, m, 0));
}

// Declara função auxiliar interna
function monthLabelFromYm(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  // Retorna valor ou JSX para quem chamou
  return format(new Date(y, m - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
}

// Declara função auxiliar interna
function shiftMonthYm(ym: string, delta: number) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, m] = ym.split("-").map(Number);
  // Constante local
  const d = new Date(y, m - 1 + delta, 1);
  // Retorna valor ou JSX para quem chamou
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Declara função auxiliar interna
function monthShortLabel(ym: string) {
  // Percorre lista e renderiza um item para cada elemento
  const [y, mo] = ym.split("-").map(Number);
  // Retorna valor ou JSX para quem chamou
  return format(new Date(y, mo - 1, 1), "MMM", { locale: ptBR }).replace(".", "");
}

// Declara função auxiliar interna
function txAmount(t: ApiTransaction): number {
  // Constante local
  const n = typeof t.amount === "number" ? t.amount : Number(t.amount);
  // Retorna valor ou JSX para quem chamou
  return Number.isFinite(n) ? n : 0;
}

// Declara função auxiliar interna
function aggregateExpensesByCategory(txs: ApiTransaction[]) {
  // Constante local
  const map = new Map<string, { value: number; color: string; icon: string | null }>();
  // Loop — repete para cada item
  for (const t of txs) {
    // Condição — executa bloco só se verdadeira
    if (t.type !== "expense") continue;
    // Constante local
    const name = t.categoryName ?? "Sem categoria";
    // Constante local
    const cur = map.get(name) ?? { value: 0, color: "#78909C", icon: t.categoryIcon };
    // Instrução do fluxo — parte da lógica de negócio ou interface
    cur.value += txAmount(t);
    // Condição — executa bloco só se verdadeira
    if (t.categoryColor) cur.color = t.categoryColor;
    // Condição — executa bloco só se verdadeira
    if (t.categoryIcon) cur.icon = t.categoryIcon;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    map.set(name, cur);
  }
  // Retorna valor ou JSX para quem chamou
  return [...map.entries()].map(([name, v], i) => ({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name,
    // Operação matemática (arredondar, somar, etc.)
    value: Math.round(v.value * 100) / 100,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color: v.color || CHART_COLORS[i % CHART_COLORS.length],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    icon: v.icon,
    // Operação matemática (arredondar, somar, etc.)
    goal: Math.max(v.value * 1.1, 100),
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }));
}

// Declara função auxiliar interna
function periodSummary(
  // Instrução do fluxo — parte da lógica de negócio ou interface
  txs: ApiTransaction[],
  // Instrução do fluxo — parte da lógica de negócio ou interface
  rangeDays: number,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  expectedIncome: number | null,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initialBalance = 0,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
) {
  // Fonte única: ganhos ≠ gastos; faturamento NÃO usa budget nem saldo inicial
  const core = computeFinancialPeriodSummary(txs);
  // Constante local
  const income = core.ganhos;
  // Constante local
  const expense = core.gastos;
  // Constante local
  const balance = core.faturamentoLiquido;
  // Constante local
  const saldoComInicial = Math.round((balance + initialBalance) * 100) / 100;
  // Constante local
  const days = Math.max(1, rangeDays);
  // Constante local
  const dailyAvgExpense = expense / days;
  // Constante local
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  // Constante local
  const expList = txs.filter((t) => t.type === "expense");
  // Constante local
  const avgTicket = expList.length ? expense / expList.length : 0;
  // Variável mutável local
  let topCat = "";
  // Variável mutável local
  let topVal = 0;
  // Constante local
  const byCat = aggregateExpensesByCategory(txs);
  // Loop — repete para cada item
  for (const c of byCat) {
    // Condição — executa bloco só se verdadeira
    if (c.value > topVal) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      topVal = c.value;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      topCat = c.name;
    }
  }
  // Constante local
  const topShare = expense > 0 ? (topVal / expense) * 100 : 0;
  // Constante local
  const budgetVar =
    // Instrução do fluxo — parte da lógica de negócio ou interface
    expectedIncome != null && expectedIncome > 0 && income > 0
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ? ((income - expectedIncome) / expectedIncome) * 100
      // Instrução do fluxo — parte da lógica de negócio ou interface
      : null;
  // Constante local
  const score = Math.min(
    // Instrução do fluxo — parte da lógica de negócio ou interface
    100,
    // Operação matemática (arredondar, somar, etc.)
    Math.max(
      // Instrução do fluxo — parte da lógica de negócio ou interface
      0,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      50 + (savingsRate > 20 ? 15 : 0) + (topShare < 45 ? 10 : 0) + (budgetVar != null && budgetVar >= 0 ? 10 : 0),
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    ),
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    income,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    expense,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    balance,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    saldoComInicial,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ganhos: core.ganhos,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    gastos: core.gastos,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    faturamentoBruto: core.faturamentoBruto,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    faturamentoLiquido: core.faturamentoLiquido,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ganhosCount: core.ganhosCount,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    gastosCount: core.gastosCount,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    isEmpty: core.isEmpty,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    dailyAvgExpense,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    savingsRate,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    avgTicket,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    topCat,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    topShare,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    budgetVar,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    score,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    txCount: txs.length,
    // Percorre lista e renderiza um item para cada elemento
    activeDays: new Set(txs.map((t) => t.occurredAt.slice(0, 10))).size,
  };
}

// Declara função auxiliar interna
function largestExpense(txs: ApiTransaction[]) {
  // Constante local
  const ex = txs.filter((t) => t.type === "expense");
  // Condição — executa bloco só se verdadeira
  if (!ex.length) return null;
  // Retorna valor ou JSX para quem chamou
  return ex.reduce((a, b) => (txAmount(a) >= txAmount(b) ? a : b));
}

// Declara função auxiliar interna
function spendByDay(txs: ApiTransaction[]) {
  // Constante local
  const map = new Map<string, { total: number; count: number }>();
  // Loop — repete para cada item
  for (const t of txs) {
    // Condição — executa bloco só se verdadeira
    if (t.type !== "expense") continue;
    // Constante local
    const d = t.occurredAt.slice(0, 10);
    // Constante local
    const cur = map.get(d) ?? { total: 0, count: 0 };
    // Instrução do fluxo — parte da lógica de negócio ou interface
    cur.total += txAmount(t);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    cur.count += 1;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    map.set(d, cur);
  }
  // Variável mutável local
  let best: { day: string; total: number; count: number } | null = null;
  // Loop — repete para cada item
  for (const [day, v] of map) {
    // Condição — executa bloco só se verdadeira
    if (!best || v.total > best.total) best = { day, total: v.total, count: v.count };
  }
  // Retorna valor ou JSX para quem chamou
  return best;
}

/* Card de métrica — Magic UI + tipografia compacta e simétrica */
// Declara função auxiliar interna
function MetricCard({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  label,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  value,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  change,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  prefix = "R$ ",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  suffix = "",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  trend,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  label: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  value: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  change: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  prefix?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  suffix?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  trend?: "up" | "down" | "neutral";
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  // Constante local
  const isDark = resolvedTheme === "dark";
  // Constante local
  const trendColor =
    // Instrução do fluxo — parte da lógica de negócio ou interface
    trend === "up" ? "text-cgreen-500" : trend === "down" ? "text-cred-main" : "text-muted-foreground";
  // Constante local
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <motion.div
      // Instrução do fluxo — parte da lógica de negócio ou interface
      initial={{ opacity: 0, y: 8 }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      animate={{ opacity: 1, y: 0 }}
      // Classes CSS Tailwind — controla aparência visual
      className="h-full min-h-[112px] rounded-xl"
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >
      // Elemento/componente React na tela
      <MagicCard
        // Classes CSS Tailwind — controla aparência visual
        className="h-full min-h-[112px] rounded-xl border border-border/60"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientFrom="#6ee7b7"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientTo="#22c55e"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientSize={220}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Tag HTML na interface
        <div className="flex h-full min-h-[112px] flex-col justify-between gap-2 px-4 py-3.5 text-left">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground leading-none">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {label}
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <p className="text-lg font-semibold leading-tight tracking-tight text-foreground tabular">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {prefix}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {value}
            // Instrução do fluxo — parte da lógica de negócio ou interface
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
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

/* Chip de filtro */
// Declara função auxiliar interna
function FilterChip({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  active,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onClick,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  children,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  active: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onClick: () => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  children: ReactNode;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <button
      // Botão comum (não envia formulário)
      type="button"
      // Executa ação quando o usuário clica
      onClick={onClick}
      // Classes CSS Tailwind — controla aparência visual
      className={cn(
        // Instrução do fluxo — parte da lógica de negócio ou interface
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
        // Instrução do fluxo — parte da lógica de negócio ou interface
        active
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? "border-cgreen-500/40 bg-cgreen-500/15 text-cgreen-600 dark:text-cgreen-400"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          : "border-border bg-muted/50 text-muted-foreground hover:border-cgreen-500/30 hover:bg-cgreen-500/10",
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >
      // Instrução do fluxo — parte da lógica de negócio ou interface
      {children}
    // Tag HTML na interface
    </button>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Declara função auxiliar interna
function BulletChart({ data, isDark }: { data: Array<{ name: string; actual: number; target: number; ranges: [number, number, number] }>; isDark: boolean }) {
  // Constante local
  const track = isDark ? "bg-[#2C2C2E]" : "bg-cgray-50";
  // Constante local
  const line = isDark ? "bg-white/80" : "bg-cgray-900";
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="space-y-4">
      // Percorre lista e renderiza um item para cada elemento
      {data.map((item) => {
        // Constante local
        const pct = (item.actual / item.target) * 100;
        // Constante local
        const barColor = pct < 60 ? "#4CAF50" : pct < 90 ? "#FFB300" : "#EF5350";
        // Retorna valor ou JSX para quem chamou
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                initial={{ width: 0 }}
                // Operação matemática (arredondar, somar, etc.)
                animate={{ width: `${Math.min(pct, 100)}%` }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                transition={{ duration: 0.6, ease: "easeOut" }}
                // Classes CSS Tailwind — controla aparência visual
                className="absolute bottom-1 left-0 top-1 rounded"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                style={{ background: barColor }}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
              // Tag HTML na interface
              <div className={cn("absolute bottom-0 top-0 w-0.5", line)} style={{ left: "100%" }} />
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        );
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      })}
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

/* Heatmap calendário mensal */
// Declara função auxiliar interna
function SpendingHeatmap({ txs }: { txs: ApiTransaction[] }) {
  // Valor memorizado — recalcula só quando dependências mudam
  const heatmapData = useMemo(() => {
    // Constante local
    const byDay = new Map<number, number>();
    // Loop — repete para cada item
    for (const t of txs) {
      // Condição — executa bloco só se verdadeira
      if (t.type !== "expense") continue;
      // Constante local
      const d = new Date(t.occurredAt).getDate();
      // Instrução do fluxo — parte da lógica de negócio ou interface
      byDay.set(d, (byDay.get(d) ?? 0) + txAmount(t));
    }
    // Retorna valor ou JSX para quem chamou
    return [...byDay.entries()].map(([day, amount]) => ({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      day,
      // Cria objeto de data/hora
      weekday: new Date(new Date().getFullYear(), new Date().getMonth(), day).getDay(),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      amount,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      categories: [],
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs]);

  // Condição — executa bloco só se verdadeira
  if (heatmapData.length === 0) return null;

  // Constante local
  const maxAmount = Math.max(...heatmapData.map((d) => d.amount), 1);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const weeks: typeof heatmapData[number][][] = [];
  // Variável mutável local
  let currentWeek: typeof heatmapData[number][] = [];

  /* Preenche dias vazios no início */
  // Constante local
  const firstDay = heatmapData[0].weekday;
  // Loop — repete para cada item
  for (let i = 0; i < firstDay; i++) {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    currentWeek.push({ day: 0, weekday: i, amount: -1, categories: [] });
  }

  // Instrução do fluxo — parte da lógica de negócio ou interface
  heatmapData.forEach(d => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    currentWeek.push(d);
    // Condição — executa bloco só se verdadeira
    if (d.weekday === 6) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      weeks.push(currentWeek);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      currentWeek = [];
    }
  });
  // Condição — executa bloco só se verdadeira
  if (currentWeek.length) weeks.push(currentWeek);

  // Constante local
  const getColor = (amount: number) => {
    // Condição — executa bloco só se verdadeira
    if (amount <= 0) return 'transparent';
    // Constante local
    const intensity = amount / maxAmount;
    // Condição — executa bloco só se verdadeira
    if (intensity < 0.25) return '#C8E6C9';
    // Condição — executa bloco só se verdadeira
    if (intensity < 0.5) return '#A5D6A7';
    // Condição — executa bloco só se verdadeira
    if (intensity < 0.75) return '#FFB300';
    // Retorna valor ou JSX para quem chamou
    return '#EF5350';
  };

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="space-y-3">
      // Tag HTML na interface
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        // Percorre lista e renderiza um item para cada elemento
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          // Tag HTML na interface
          <span key={d}>{d}</span>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key={di}
                // Classes CSS Tailwind — controla aparência visual
                className="aspect-square rounded-lg flex items-center justify-center text-xs font-medium relative group cursor-default"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                style={{ background: getColor(day.amount) }}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {day.day > 0 && (
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  <>
                    // Tag HTML na interface
                    <span className={day.amount > 0 ? "text-foreground" : "text-muted-foreground"}>{day.day}</span>
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {day.amount > 0 && (
                      // Tag HTML na interface
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-cgray-900 text-white px-2 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        R$ {day.amount.toFixed(0)} · {day.categories.join(', ')}
                      // Tag HTML na interface
                      </div>
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    )}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  </>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                )}
              // Tag HTML na interface
              </div>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ))}
          // Tag HTML na interface
          </div>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        ))}
        // Tag HTML na interface
        <span>Mais</span>
      // Tag HTML na interface
      </div>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Exporta como padrão do módulo (import default)
export default function Dashboard() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  // Constante local
  const isRichDemoAccount = user?.email?.toLowerCase() === "leonardosena1010@hotmail.com";
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();

  // Mutação na API (criar/editar/excluir)
  const inactivateTx = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (id: string) => apiDeleteTransaction(token!, id),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["kpis"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["monthly"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["insights"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["goals"] });
      // Exibe notificação temporária (toast) na tela
      toast.success("Despesa/ganho excluído — indicadores atualizados");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutação na API (criar/editar/excluir)
  const patchTx = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof apiPatchTransaction>[2] }) =>
      // Instrução do fluxo — parte da lógica de negócio ou interface
      apiPatchTransaction(token!, id, body),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["kpis"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["monthly"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["insights"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["goals"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setEditingTx(null);
      // Exibe notificação temporária (toast) na tela
      toast.success("Lançamento atualizado — indicadores recalculados");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  /* ── Estado local: mês, filtros, modais e calendário ── */
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  // Constante local
  const isDark = resolvedTheme === "dark";
  // Constante local
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  // Constante local
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";

  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Constante local
    const now = new Date();
    // Retorna valor ou JSX para quem chamou
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [periodFilter, setPeriodFilter] = useState("mes");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [showFilters, setShowFilters] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [compareMode, setCompareMode] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [goalMode, setGoalMode] = useState(true);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [rangeOverride, setRangeOverride] = useState<{ from: Date; to: Date } | null>(null);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [calOpen, setCalOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [pickRange, setPickRange] = useState<{ from?: Date; to?: Date } | undefined>();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [timeStart, setTimeStart] = useState("00:00");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [timeEnd, setTimeEnd] = useState("23:59");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [catFilter, setCatFilter] = useState<string | null>(null);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [expenseOpen, setExpenseOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [incomeOpen, setIncomeOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [budgetOpen, setBudgetOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [txLoading, setTxLoading] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [budgetLoading, setBudgetLoading] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [editingTx, setEditingTx] = useState<ApiTransaction | null>(null);

  /** Aplica atalho de período (hoje, semana, mês…) aos indicadores. */
  // Constante local
  const applyPeriodPreset = (preset: string) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setPeriodFilter(preset);
    // Constante local
    const now = new Date();
    // Condição — executa bloco só se verdadeira
    if (preset === "hoje") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setRangeOverride({ from: startOfDay(now), to: endOfDay(now) });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (preset === "semana") {
      // Constante local
      const from = startOfDay(now);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      from.setDate(from.getDate() - from.getDay());
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setRangeOverride({ from, to: endOfDay(now) });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (preset === "mes") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setRangeOverride(null);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setCurrentMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (preset === "mes_anterior") {
      // Constante local
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      // Constante local
      const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setCurrentMonth(ym);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setRangeOverride({ from: startOfMonthFromYm(ym), to: endOfMonthFromYm(ym) });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (preset === "ano") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setRangeOverride({
        // Cria objeto de data/hora
        from: startOfDay(new Date(now.getFullYear(), 0, 1)),
        // Instrução do fluxo — parte da lógica de negócio ou interface
        to: endOfDay(now),
      });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (preset === "7d" || preset === "30d" || preset === "90d") {
      // Constante local
      const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
      // Constante local
      const from = startOfDay(now);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      from.setDate(from.getDate() - (days - 1));
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setRangeOverride({ from, to: endOfDay(now) });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (preset === "1 ano") {
      // Constante local
      const from = startOfDay(now);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      from.setFullYear(from.getFullYear() - 1);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setRangeOverride({ from, to: endOfDay(now) });
    }
  };

  // Valor memorizado — recalcula só quando dependências mudam
  const defaultRange = useMemo(
    // Instrução do fluxo — parte da lógica de negócio ou interface
    () => ({ from: startOfMonthFromYm(currentMonth), to: endOfMonthFromYm(currentMonth) }),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    [currentMonth],
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
  // Constante local
  const activeRange = rangeOverride ?? defaultRange;
  // Constante local
  const fromIso = activeRange.from.toISOString();
  // Constante local
  const toIso = activeRange.to.toISOString();
  // Constante local
  const rangeDays = Math.max(
    // Instrução do fluxo — parte da lógica de negócio ou interface
    1,
    // Operação matemática (arredondar, somar, etc.)
    Math.ceil((activeRange.to.getTime() - activeRange.from.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );

  /* ── Queries React Query — dados financeiros da API ── */

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: catRes } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["categories", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetCategories(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });
  // Constante local
  const categories = catRes?.categories ?? [];

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: txRes, isLoading: txListLoading } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["transactions", token, fromIso, toIso],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetTransactions(token!, { from: fromIso, to: toIso }),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });
  // Constante local
  const rawTxs = txRes?.transactions ?? [];

  // Valor memorizado — recalcula só quando dependências mudam
  const txs = useMemo(() => {
    // Variável mutável local
    let t = rawTxs;
    // Condição — executa bloco só se verdadeira
    if (typeFilter === "recurring") t = t.filter((x) => x.source === "recurring");
    // Senão, se outra condição…
    else if (typeFilter === "income" || typeFilter === "expense") t = t.filter((x) => x.type === typeFilter);
    // Condição — executa bloco só se verdadeira
    if (catFilter) t = t.filter((x) => (x.categoryName ?? "") === catFilter);
    // Retorna valor ou JSX para quem chamou
    return t;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [rawTxs, catFilter, typeFilter]);

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: budgetRes } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["budget", token, currentMonth],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetBudget(token!, currentMonth),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });
  // Constante local
  const expectedIncome = budgetRes?.budget?.totalIncomeExpected ?? null;

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: monthlyRes } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["monthly", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetMonthlyReport(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: kpisRes } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["kpis", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetKpis(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: insightsRes } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["insights", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetInsights(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: settingsRes } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["settings", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetSettings(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });
  // Constante local
  const initialBalance = settingsRes?.settings.initialBalance ?? 0;

  // Mutação na API (criar/editar/excluir)
  const seedRichMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: () => apiSeedRichDemo(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: (d) => {
      // Exibe notificação temporária (toast) na tela
      toast.success(`${d.inserted ?? 0} transações no pacote completo. ${d.message ?? ""}`);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["budget"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["monthly"] });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Valor memorizado — recalcula só quando dependências mudam
  const analytics = useMemo(
    // Instrução do fluxo — parte da lógica de negócio ou interface
    () => periodSummary(txs, rangeDays, expectedIncome, initialBalance),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    [txs, rangeDays, expectedIncome, initialBalance],
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );

  // Valor memorizado — recalcula só quando dependências mudam
  const pieFromApi = useMemo(() => aggregateExpensesByCategory(txs), [txs]);
  // Constante local
  const pieData = pieFromApi;

  // Valor memorizado — recalcula só quando dependências mudam
  const treemapExpenseData = useMemo(() => {
    // Constante local
    const src = pieFromApi;
    // Retorna valor ou JSX para quem chamou
    return src.slice(0, 14).map((c) => ({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      name: c.name,
      // Operação matemática (arredondar, somar, etc.)
      size: Math.max(typeof c.value === "number" ? c.value : 0, 1),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      fill: c.color,
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [pieFromApi]);

  // Valor memorizado — recalcula só quando dependências mudam
  const horizontalCategoryRank = useMemo(() => {
    // Constante local
    const src = pieFromApi;
    // Retorna valor ou JSX para quem chamou
    return [...src]
      // Ordena lista (ex.: por data ou valor)
      .sort((a, b) => b.value - a.value)
      // Recorta parte da lista (paginação ou limite)
      .slice(0, 10)
      // Percorre lista e renderiza um item para cada elemento
      .map((c) => ({ name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name, total: c.value }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [pieFromApi]);

  // Valor memorizado — recalcula só quando dependências mudam
  const cumulativeExpenseData = useMemo(() => {
    // Constante local
    const exp = [...txs].filter((t) => t.type === "expense").sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    // Variável mutável local
    let acc = 0;
    // Constante local
    const rows = exp.map((t, idx) => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      acc += txAmount(t);
      // Retorna valor ou JSX para quem chamou
      return {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ord: idx + 1,
        // Formata data em texto legível (pt-BR)
        label: format(new Date(t.occurredAt), "dd/MM", { locale: ptBR }),
        // Operação matemática (arredondar, somar, etc.)
        acumulado: Math.round(acc * 100) / 100,
      };
    });
    // Retorna valor ou JSX para quem chamou
    return rows;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs]);

  // Valor memorizado — recalcula só quando dependências mudam
  const scatterDespesas = useMemo(() => {
    // Retorna valor ou JSX para quem chamou
    return txs
      // Filtra lista — mantém só itens que passam no teste
      .filter((t) => t.type === "expense")
      // Percorre lista e renderiza um item para cada elemento
      .map((t) => ({
        // Cria objeto de data/hora
        diaMes: new Date(t.occurredAt).getDate(),
        // Instrução do fluxo — parte da lógica de negócio ou interface
        valor: txAmount(t),
        // Recorta parte da lista (paginação ou limite)
        nome: (t.description ?? t.categoryName ?? "Despesa").slice(0, 28),
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs]);

  // Valor memorizado — recalcula só quando dependências mudam
  const gastosPorDiaSemana = useMemo(() => {
    // Constante local
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    // Constante local
    const sums = [0, 0, 0, 0, 0, 0, 0];
    // Loop — repete para cada item
    for (const t of txs) {
      // Condição — executa bloco só se verdadeira
      if (t.type !== "expense") continue;
      // Cria objeto de data/hora
      sums[new Date(t.occurredAt).getDay()] += txAmount(t);
    }
    // Retorna valor ou JSX para quem chamou
    return labels.map((dia, i) => ({ dia, total: Math.round(sums[i] * 100) / 100 }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs]);

  // Valor memorizado — recalcula só quando dependências mudam
  const despesasPorOrigem = useMemo(() => {
    // Constante local
    const m = new Map<string, number>();
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
    // Loop — repete para cada item
    for (const t of txs) {
      // Condição — executa bloco só se verdadeira
      if (t.type !== "expense") continue;
      // Constante local
      const k = t.source in label ? label[t.source] : t.source;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      m.set(k, (m.get(k) ?? 0) + txAmount(t));
    }
    // Retorna valor ou JSX para quem chamou
    return [...m.entries()].map(([name, value], i) => ({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      name,
      // Operação matemática (arredondar, somar, etc.)
      value: Math.round(value * 100) / 100,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      color: CHART_COLORS[i % CHART_COLORS.length],
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs]);

  /** Acumulado dia a dia — só lançamentos reais (sem renda esperada mockada). */
  // Valor memorizado — recalcula só quando dependências mudam
  const balanceOverTime = useMemo(() => {
    // Constante local
    const byDay = new Map<string, { income: number; expense: number }>();
    // Loop — repete para cada item
    for (const t of txs) {
      // Constante local
      const d = t.occurredAt.slice(0, 10);
      // Constante local
      const cur = byDay.get(d) ?? { income: 0, expense: 0 };
      // Condição — executa bloco só se verdadeira
      if (t.type === "income") cur.income += txAmount(t);
      // Senão — caminho alternativo
      else cur.expense += txAmount(t);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      byDay.set(d, cur);
    }
    // Constante local
    const sorted = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    // Variável mutável local
    let acc = initialBalance;
    // Retorna valor ou JSX para quem chamou
    return sorted.map(([day, v]) => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      acc += v.income - v.expense;
      // Retorna valor ou JSX para quem chamou
      return {
        // Formata data em texto legível (pt-BR)
        day: format(new Date(`${day}T12:00:00`), "dd/MM", { locale: ptBR }),
        // Operação matemática (arredondar, somar, etc.)
        accumulated: Math.round(acc * 100) / 100,
      };
    });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs, initialBalance]);

  /** Gastos diários com média móvel de 7 dias. */
  // Valor memorizado — recalcula só quando dependências mudam
  const expenseDailyWithAvg = useMemo(() => {
    // Constante local
    const byDay = new Map<string, number>();
    // Loop — repete para cada item
    for (const t of txs) {
      // Condição — executa bloco só se verdadeira
      if (t.type !== "expense") continue;
      // Constante local
      const d = t.occurredAt.slice(0, 10);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      byDay.set(d, (byDay.get(d) ?? 0) + txAmount(t));
    }
    // Constante local
    const sorted = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
    // Constante local
    const dailyValues = sorted.map(([, v]) => v);
    // Retorna valor ou JSX para quem chamou
    return sorted.map(([day, daily], idx) => {
      // Constante local
      const window = dailyValues.slice(Math.max(0, idx - 6), idx + 1);
      // Constante local
      const avg7d = window.reduce((s, x) => s + x, 0) / window.length;
      // Retorna valor ou JSX para quem chamou
      return {
        // Formata data em texto legível (pt-BR)
        label: format(new Date(`${day}T12:00:00`), "dd/MM", { locale: ptBR }),
        // Operação matemática (arredondar, somar, etc.)
        daily: Math.round(daily * 100) / 100,
        // Operação matemática (arredondar, somar, etc.)
        avg7d: Math.round(avg7d * 100) / 100,
      };
    });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs]);

  // Valor memorizado — recalcula só quando dependências mudam
  const gastosPorDiaSemanaComposed = useMemo(() => {
    // Constante local
    const avg =
      // Filtra lista — mantém só itens que passam no teste
      gastosPorDiaSemana.reduce((s, r) => s + r.total, 0) / Math.max(gastosPorDiaSemana.filter((r) => r.total > 0).length, 1);
    // Retorna valor ou JSX para quem chamou
    return gastosPorDiaSemana.map((r) => ({ ...r, avg: Math.round(avg * 100) / 100 }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [gastosPorDiaSemana]);

  // Valor memorizado — recalcula só quando dependências mudam
  const radarCategoryData = useMemo(
    // Percorre lista e renderiza um item para cada elemento
    () => pieFromApi.map((p) => ({ category: p.name, value: p.value, fullMark: Math.max(p.value * 1.2, 100) })),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    [pieFromApi],
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );

  // Valor memorizado — recalcula só quando dependências mudam
  const barEvolution = useMemo(() => {
    // Constante local
    const rows = monthlyRes?.months ?? [];
    // Condição — executa bloco só se verdadeira
    if (rows.length < 1) return [];
    // Constante local
    const last = rows.slice(-6);
    // Retorna valor ou JSX para quem chamou
    return last.map((r) => ({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      month: monthShortLabel(r.month),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      income: r.income,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      expense: r.expense,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      balance: r.balance,
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [monthlyRes]);

  // Valor memorizado — recalcula só quando dependências mudam
  const stackedFromApi = useMemo(() => {
    // Constante local
    const rows = monthlyRes?.months ?? [];
    // Condição — executa bloco só se verdadeira
    if (rows.length < 1) return [];
    // Retorna valor ou JSX para quem chamou
    return rows.map((r) => ({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      month: monthShortLabel(r.month),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      income: r.income,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      expense: r.expense,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      savings: r.income - r.expense,
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }));
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [monthlyRes]);

  // Constante local
  const largest = largestExpense(txs);
  // Constante local
  const priciestDay = spendByDay(txs);
  // Valor memorizado — recalcula só quando dependências mudam
  const concentrationLabel = useMemo(() => {
    // Condição — executa bloco só se verdadeira
    if (analytics.topCat) return `${analytics.topCat} · ${analytics.topShare.toFixed(0)}%`;
    // Retorna valor ou JSX para quem chamou
    return "—";
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [analytics.topCat, analytics.topShare]);

  // Valor memorizado — recalcula só quando dependências mudam
  const expenseCount = useMemo(() => txs.filter((t) => t.type === "expense").length, [txs]);
  // Constante local
  const hasExpenseData = expenseCount > 0;

  // Valor memorizado — recalcula só quando dependências mudam
  const secondaryCards = useMemo(() => {
    // Constante local
    const ticket = hasExpenseData ? analytics.avgTicket : 0;
    // Constante local
    const ticketNote = hasExpenseData ? `${expenseCount} despesas` : "Sem despesas no período";
    // Constante local
    const topCat = analytics.topCat ?? "—";
    // Constante local
    const topNote = analytics.topCat ? `${analytics.topShare.toFixed(0)}% do que você gastou` : "Registre gastos";
    // Constante local
    const days = analytics.activeDays;
    // Constante local
    const daysNote = txs.length ? "Neste período" : "Sem registros";
    // Constante local
    const planned = expectedIncome ?? 0;
    // Constante local
    const plannedStr = `R$ ${planned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    // Variável mutável local
    let plannedNote: string;
    // Condição — executa bloco só se verdadeira
    if (expectedIncome == null) plannedNote = "Defina o valor em Renda mensal";
    // Senão, se outra condição…
    else if (txs.length && analytics.income > 0)
      // Instrução do fluxo — parte da lógica de negócio ou interface
      plannedNote = analytics.budgetVar != null && analytics.budgetVar >= 0 ? "Receita acima do planejado" : "Receita abaixo do planejado";
    // Senão — caminho alternativo
    else plannedNote = "Valor que você planejou receber";
    // Constante local
    const liq = analytics.expense > 0 ? Math.round((analytics.balance / analytics.expense) * 100) : 0;
    // Constante local
    const liqNote = analytics.expense > 0 ? "Sobra para cada R$ 1 de gasto" : "Sem gastos no período";
    // Constante local
    const proj = Math.max(0, analytics.balance - analytics.dailyAvgExpense * 5);
    // Constante local
    const projStr = `R$ ${proj.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    // Retorna valor ou JSX para quem chamou
    return { ticket, ticketNote, topCat, topNote, days, daysNote, plannedStr, plannedNote, liq, liqNote, projStr };
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs, analytics, expenseCount, hasExpenseData, expectedIncome]);

  // Valor memorizado — recalcula só quando dependências mudam
  const monthEndPreview = useMemo(() => {
    // Condição — executa bloco só se verdadeira
    if (!txs.length) return 0;
    // Constante local
    const rest = Math.max(0, 30 - analytics.activeDays);
    // Retorna valor ou JSX para quem chamou
    return analytics.balance - analytics.dailyAvgExpense * rest;
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [txs.length, analytics.balance, analytics.activeDays, analytics.dailyAvgExpense]);

  // Constante local
  const monthLabel = monthLabelFromYm(currentMonth);

  /* ── UI: cabeçalho, KPIs, gráficos Recharts e lista de transações ── */
  // Retorna valor ou JSX para quem chamou
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setCurrentMonth(shiftMonthYm(currentMonth, -1));
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setRangeOverride(null);
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              }}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setCurrentMonth(shiftMonthYm(currentMonth, 1));
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setRangeOverride(null);
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              }}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
            // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Elemento/componente React na tela
            <Filter size={16} />
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Filtros
          // Tag HTML na interface
          </button>
        // Tag HTML na interface
        </div>

        // Tag HTML na interface
        <div className="flex flex-wrap items-center gap-2">
          // Elemento/componente React na tela
          <Popover
            // Instrução do fluxo — parte da lógica de negócio ou interface
            open={calOpen}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            onOpenChange={(o) => {
              // Instrução do fluxo — parte da lógica de negócio ou interface
              setCalOpen(o);
              // Condição — executa bloco só se verdadeira
              if (o) {
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setPickRange({ from: activeRange.from, to: activeRange.to });
                // Formata data em texto legível (pt-BR)
                setTimeStart(format(activeRange.from, "HH:mm"));
                // Formata data em texto legível (pt-BR)
                setTimeEnd(format(activeRange.to, "HH:mm"));
              }
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  mode="range"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  numberOfMonths={1}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  locale={ptBR}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  selected={pickRange as { from?: Date; to?: Date }}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  onSelect={(r) => setPickRange(r ?? undefined)}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  defaultMonth={pickRange?.from ?? activeRange.from}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
                // Tag HTML na interface
                <div className="grid grid-cols-2 gap-2">
                  // Tag HTML na interface
                  <div>
                    // Tag HTML na interface
                    <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Hora início</p>
                    // Tag HTML na interface
                    <input
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      type="time"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      value={timeStart}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setTimeStart(e.target.value)}
                      // Classes CSS Tailwind — controla aparência visual
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    />
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <div>
                    // Tag HTML na interface
                    <p className="text-[10px] font-medium uppercase text-muted-foreground mb-1">Hora fim</p>
                    // Tag HTML na interface
                    <input
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      type="time"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      value={timeEnd}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setTimeEnd(e.target.value)}
                      // Classes CSS Tailwind — controla aparência visual
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    variant="ghost"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    size="sm"
                    // Executa ação quando o usuário clica
                    onClick={() => {
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      setRangeOverride(null);
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      setCalOpen(false);
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    }}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  >
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Mês atual
                  // Elemento/componente React na tela
                  </Button>
                  // Elemento/componente React na tela
                  <Button
                    // Botão comum (não envia formulário)
                    type="button"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    size="sm"
                    // Classes CSS Tailwind — controla aparência visual
                    className="bg-cgreen-500 hover:bg-cgreen-700"
                    // Executa ação quando o usuário clica
                    onClick={() => {
                      // Condição — executa bloco só se verdadeira
                      if (!pickRange?.from || !pickRange?.to) return;
                      // Percorre lista e renderiza um item para cada elemento
                      const [sh, sm] = timeStart.split(":").map(Number);
                      // Percorre lista e renderiza um item para cada elemento
                      const [eh, em] = timeEnd.split(":").map(Number);
                      // Constante local
                      const from = new Date(pickRange.from);
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      from.setHours(sh, sm, 0, 0);
                      // Constante local
                      const to = new Date(pickRange.to);
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      to.setHours(eh, em, 59, 999);
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      setRangeOverride({ from, to });
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      setCalOpen(false);
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    }}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  >
                    // Instrução do fluxo — parte da lógica de negócio ou interface
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
            // Instrução do fluxo — parte da lógica de negócio ou interface
            size="sm"
            // Classes CSS Tailwind — controla aparência visual
            className="gap-1.5 bg-cgreen-500 hover:bg-cgreen-700"
            // Executa ação quando o usuário clica
            onClick={() => setExpenseOpen(true)}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Elemento/componente React na tela
            <Plus className="h-4 w-4" />
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Adicionar despesa
          // Elemento/componente React na tela
          </Button>
          // Elemento/componente React na tela
          <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => setIncomeOpen(true)}>
            // Elemento/componente React na tela
            <Wallet className="h-4 w-4" />
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Registrar ganho
          // Elemento/componente React na tela
          </Button>
          // Elemento/componente React na tela
          <Button type="button" size="sm" variant="outline" className="gap-1.5 border-border" onClick={() => setBudgetOpen(true)}>
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Renda mensal
          // Elemento/componente React na tela
          </Button>
          // Elemento/componente React na tela
          <Button
            // Botão comum (não envia formulário)
            type="button"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            size="sm"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            variant="outline"
            // Classes CSS Tailwind — controla aparência visual
            className="gap-1.5 border-border"
            // Desabilita botão/campo (ex.: durante envio)
            disabled={!token}
            // Executa ação quando o usuário clica
            onClick={async () => {
              // Tenta executar — erros vão para catch
              try {
                // Constante local
                const blob = await apiExportTransactionsCsv(token!, { from: fromIso, to: toIso });
                // Constante local
                const url = URL.createObjectURL(blob);
                // Constante local
                const a = document.createElement("a");
                // Instrução do fluxo — parte da lógica de negócio ou interface
                a.href = url;
                // Instrução do fluxo — parte da lógica de negócio ou interface
                a.download = "controla-transacoes.csv";
                // Instrução do fluxo — parte da lógica de negócio ou interface
                a.click();
                // Instrução do fluxo — parte da lógica de negócio ou interface
                URL.revokeObjectURL(url);
                // Exibe notificação temporária (toast) na tela
                toast.success("Planilha exportada.");
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              } catch (e) {
                // Exibe notificação temporária (toast) na tela
                toast.error(e instanceof Error ? e.message : "Falha ao exportar");
              }
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Elemento/componente React na tela
            <Download className="h-4 w-4" />
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Exportar CSV
          // Elemento/componente React na tela
          </Button>
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {isRichDemoAccount && (
            // Elemento/componente React na tela
            <Button
              // Botão comum (não envia formulário)
              type="button"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              size="sm"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              variant="secondary"
              // Classes CSS Tailwind — controla aparência visual
              className="gap-1.5"
              // Desabilita botão/campo (ex.: durante envio)
              disabled={seedRichMut.isPending || !token}
              // Executa ação quando o usuário clica
              onClick={() => {
                // Condição — executa bloco só se verdadeira
                if (confirm("Substituir todas as transações pelo pacote completo de demonstração?")) seedRichMut.mutate();
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              }}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Pacote completo
            // Elemento/componente React na tela
            </Button>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
        // Tag HTML na interface
        </div>

        // Instrução do fluxo — parte da lógica de negócio ou interface
        {showFilters && (
          // Tag HTML na interface
          <motion.div
            // Instrução do fluxo — parte da lógica de negócio ou interface
            initial={{ opacity: 0, height: 0 }}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            animate={{ opacity: 1, height: "auto" }}
            // Classes CSS Tailwind — controla aparência visual
            className="space-y-4 rounded-xl border border-border bg-card p-4"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Período</p>
              // Tag HTML na interface
              <div className="flex gap-2 flex-wrap">
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {[
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "Hoje", v: "hoje" },
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "Esta semana", v: "semana" },
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "Este mês", v: "mes" },
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "Mês anterior", v: "mes_anterior" },
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "Este ano", v: "ano" },
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "7 dias", v: "7d" },
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "30 dias", v: "30d" },
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  { l: "90 dias", v: "90d" },
                // Percorre lista e renderiza um item para cada elemento
                ].map((p) => (
                  // Elemento/componente React na tela
                  <FilterChip key={p.v} active={periodFilter === p.v} onClick={() => applyPeriodPreset(p.v)}>
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {p.l}
                  // Elemento/componente React na tela
                  </FilterChip>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {t.l}
                  // Elemento/componente React na tela
                  </FilterChip>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    key={c.name}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    active={catFilter === c.name}
                    // Executa ação quando o usuário clica
                    onClick={() => setCatFilter(catFilter === c.name ? null : c.name)}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  >
                    // Elemento/componente React na tela
                    <CategoryIcon name={c.icon} size={14} className="shrink-0 text-muted-foreground" />
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {c.name}
                  // Elemento/componente React na tela
                  </FilterChip>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  type="checkbox"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  checked={compareMode}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setCompareMode(e.target.checked)}
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-4 w-4 rounded border-border text-cgreen-500 focus:ring-cgreen-500"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Comparar com período anterior
              // Tag HTML na interface
              </label>
              // Tag HTML na interface
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                // Tag HTML na interface
                <input
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  type="checkbox"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  checked={goalMode}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setGoalMode(e.target.checked)}
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-4 w-4 rounded border-border text-cgreen-500 focus:ring-cgreen-500"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Modo metas
              // Tag HTML na interface
              </label>
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </motion.div>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        // Elemento/componente React na tela
        <MetricCard
          // Instrução do fluxo — parte da lógica de negócio ou interface
          label="Ganhos no período"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.ganhos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          change={analytics.ganhosCount}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          trend={analytics.ganhosCount ? "up" : "neutral"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Elemento/componente React na tela
        <MetricCard
          // Instrução do fluxo — parte da lógica de negócio ou interface
          label="Gastos no período"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.gastos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          change={analytics.gastosCount}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          trend={analytics.gastosCount ? "down" : "neutral"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Elemento/componente React na tela
        <MetricCard
          // Instrução do fluxo — parte da lógica de negócio ou interface
          label="Faturamento bruto"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.faturamentoBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          change={0}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          trend={analytics.faturamentoBruto > 0 ? "up" : "neutral"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Elemento/componente React na tela
        <MetricCard
          // Instrução do fluxo — parte da lógica de negócio ou interface
          label="Faturamento líquido"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.faturamentoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Operação matemática (arredondar, somar, etc.)
          change={txs.length ? Math.min(99, Math.abs(analytics.savingsRate)) : 0}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          trend={analytics.faturamentoLiquido >= 0 ? "up" : "down"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Elemento/componente React na tela
        <MetricCard
          // Instrução do fluxo — parte da lógica de negócio ou interface
          label="Gasto médio por dia"
          // Formata número como moeda/texto local (pt-BR)
          value={analytics.dailyAvgExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          change={0}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          trend="down"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Elemento/componente React na tela
        <MetricCard
          // Instrução do fluxo — parte da lógica de negócio ou interface
          label="Sua nota (0–100)"
          // Operação matemática (arredondar, somar, etc.)
          value={(kpisRes?.kpis?.financialScore ?? Math.round(analytics.score)).toString()}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          change={0}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          prefix=""
          // Instrução do fluxo — parte da lógica de negócio ou interface
          suffix="/100"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          trend="up"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
      // Tag HTML na interface
      </div>
      // Instrução do fluxo — parte da lógica de negócio ou interface
      {analytics.isEmpty && (
        // Tag HTML na interface
        <p className="text-sm text-muted-foreground">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {EMPTY_FINANCIAL_COPY.ganhos} {EMPTY_FINANCIAL_COPY.gastos}
        // Tag HTML na interface
        </p>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}

      // Instrução do fluxo — parte da lógica de negócio ou interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {(kpisRes.kpis.expectedIncome ?? 0) > 0 ? "Disponível estimado" : "Previsão saldo fim do mês"}
            // Tag HTML na interface
            </p>
            // Tag HTML na interface
            <p className="text-lg font-semibold tabular">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              R${" "}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {((kpisRes.kpis.expectedIncome ?? 0) > 0
                // Instrução do fluxo — parte da lógica de negócio ou interface
                ? kpisRes.kpis.projectedAvailable ?? 0
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}

      // Instrução do fluxo — parte da lógica de negócio ou interface
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
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ))}
          // Tag HTML na interface
          </ul>
        // Tag HTML na interface
        </div>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
            // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {pieData.length === 0 ? (
            // Tag HTML na interface
            <p className="py-12 text-center text-sm text-muted-foreground">{EMPTY_FINANCIAL_COPY.gastos}</p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ) : (
          // Instrução do fluxo — parte da lógica de negócio ou interface
          <>
          // Elemento/componente React na tela
          <ChartPlotArea>
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height={260}>
              // Elemento/componente React na tela
              <PieChart>
                // Elemento/componente React na tela
                <Pie
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  data={pieData}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  dataKey="value"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  nameKey="name"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  cx="50%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  cy="50%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  innerRadius="55%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  outerRadius="80%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  paddingAngle={2}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  animationDuration={600}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Percorre lista e renderiza um item para cada elemento
                  {pieData.map((entry, i) => (
                    // Elemento/componente React na tela
                    <Cell key={i} fill={entry.color} stroke="none" />
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  {"icon" in c && c.icon ? <CategoryIcon name={c.icon as string} size={14} /> : null}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
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
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ))}
          // Tag HTML na interface
          </div>
          // Instrução do fluxo — parte da lógica de negócio ou interface
          </>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {goalMode && expectedIncome != null && expectedIncome > 0 && (
                  // Elemento/componente React na tela
                  <ReferenceLine
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    y={expectedIncome}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    stroke="#FFB300"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    strokeDasharray="5 5"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    label={{ value: "Renda", fill: "#FFB300", fontSize: 10 }}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  />
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                )}
                // Elemento/componente React na tela
                <Area
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  type="monotone"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  dataKey="accumulated"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  name="Saldo"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  stroke="#4CAF50"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  fill="url(#greenGrad)"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  strokeWidth={2}
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {pieData.length > 0 && (
          // Elemento/componente React na tela
          <BulletChart
            // Percorre lista e renderiza um item para cada elemento
            data={pieData.map((p) => {
              // Constante local
              const target = p.goal ?? p.value * 1.1;
              // Retorna valor ou JSX para quem chamou
              return { name: p.name, actual: p.value, target, ranges: [target * 0.5, target * 0.8, target] as [number, number, number] };
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            })}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            isDark={isDark}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          />
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {"daily" in (expenseDailyWithAvg[0] ?? {}) && (
                  // Elemento/componente React na tela
                  <Line type="monotone" dataKey="daily" name="Diário" stroke={tickFill} strokeWidth={1} dot={false} />
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                )}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {"avg7d" in (expenseDailyWithAvg[0] ?? {}) && (
                  // Elemento/componente React na tela
                  <Line type="monotone" dataKey="avg7d" name="Média 7d" stroke="#4CAF50" strokeWidth={2} dot={false} />
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                )}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {expenseDailyWithAvg.length === 0 && (
                  // Elemento/componente React na tela
                  <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#4CAF50" strokeWidth={2} dot={false} />
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  data={despesasPorOrigem}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  dataKey="value"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  nameKey="name"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  cx="50%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  cy="50%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  outerRadius="75%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  animationDuration={600}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Percorre lista e renderiza um item para cada elemento
                  {despesasPorOrigem.map((entry, i) => (
                    // Elemento/componente React na tela
                    <Cell key={i} fill={entry.color ?? CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ) : (
            // Tag HTML na interface
            <p className="py-8 text-center text-sm text-muted-foreground">{EMPTY_FINANCIAL_COPY.gastos}</p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                data={treemapExpenseData}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                dataKey="size"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                aspectRatio={4 / 3}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                stroke="hsl(var(--border))"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                isAnimationActive
                // Instrução do fluxo — parte da lógica de negócio ou interface
                content={({ x, y, width, height, name, value, fill }) =>
                  // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  ) : (
                    // Tag HTML na interface
                    <g>
                      // Tag HTML na interface
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} ry={2} />
                    // Tag HTML na interface
                    </g>
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  )
                }
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Elemento/componente React na tela
                <Tooltip
                  // Formata número como moeda/texto local (pt-BR)
                  formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Total"]}
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  cursor={{ strokeDasharray: "3 3" }}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  content={({ active, payload }) => {
                    // Condição — executa bloco só se verdadeira
                    if (!active || !payload?.[0]) return null;
                    // Constante local
                    const p = payload[0].payload as { nome: string; valor: number; diaMes: number };
                    // Retorna valor ou JSX para quem chamou
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
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    );
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  data={despesasPorOrigem}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  dataKey="value"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  nameKey="name"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  cx="50%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  cy="50%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  innerRadius="45%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  outerRadius="75%"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  paddingAngle={2}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Percorre lista e renderiza um item para cada elemento
                  {despesasPorOrigem.map((_, i) => (
                    // Elemento/componente React na tela
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {largest ? (
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
              </>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ) : (
              // Tag HTML na interface
              <p className="text-sm text-muted-foreground">Nenhuma despesa neste período</p>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            )}
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="rounded-xl bg-muted/50 p-4">
            // Tag HTML na interface
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dia em que mais gastou</p>
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {priciestDay ? (
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  transações
                // Tag HTML na interface
                </p>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              </>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ) : (
              // Tag HTML na interface
              <p className="text-sm text-muted-foreground">Nenhuma despesa neste período</p>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                // Constante local
                const pct = c.goal ? Math.round((c.value / c.goal) * 100) : 0;
                // Retorna valor ou JSX para quem chamou
                return (
                  // Tag HTML na interface
                  <tr key={c.name} className="border-b border-border/60">
                    // Tag HTML na interface
                    <td className="py-2.5 font-medium text-foreground">
                      // Tag HTML na interface
                      <span className="inline-flex items-center gap-1.5">
                        // Elemento/componente React na tela
                        <CategoryIcon name={c.icon ?? "wallet"} size={16} />
                        // Instrução do fluxo — parte da lógica de negócio ou interface
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
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          pct < 70
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            ? "bg-cgreen-50 text-cgreen-700 dark:bg-cgreen-900/30 dark:text-cgreen-400"
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            : pct < 95
                              // Instrução do fluxo — parte da lógica de negócio ou interface
                              ? "bg-camber-light text-camber-main dark:bg-amber-900/25"
                              // Instrução do fluxo — parte da lógica de negócio ou interface
                              : "bg-cred-light text-cred-main dark:bg-red-900/25",
                        // Passo do algoritmo — executa parte da regra de negócio ou da interface
                        )}
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      >
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {pct}%
                      // Tag HTML na interface
                      </span>
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-2.5 text-right tabular text-muted-foreground">—</td>
                  // Tag HTML na interface
                  </tr>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                );
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              })}
            // Tag HTML na interface
            </tbody>
          // Tag HTML na interface
          </table>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>

      // Instrução do fluxo — parte da lógica de negócio ou interface
      {(insightsRes?.insights?.length ?? 0) === 0 && txs.length === 0 && (
        // Tag HTML na interface
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Registre gastos pelo WhatsApp ou manualmente para ver insights da IA.
        // Tag HTML na interface
        </div>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Nova despesa
            // Elemento/componente React na tela
            </Button>
            // Elemento/componente React na tela
            <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={() => setIncomeOpen(true)}>
              // Elemento/componente React na tela
              <Wallet className="h-4 w-4" />
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Novo ganho
            // Elemento/componente React na tela
            </Button>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {txs.length === 0 ? (
          // Tag HTML na interface
          <p className="py-10 text-center text-sm text-muted-foreground">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {EMPTY_FINANCIAL_COPY.gastos} {EMPTY_FINANCIAL_COPY.ganhos}
          // Tag HTML na interface
          </p>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          t.type === "income"
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            ? "bg-cgreen-50 text-cgreen-700 dark:bg-cgreen-900/30 dark:text-cgreen-400"
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            : "bg-cred-light text-cred-main dark:bg-red-900/25",
                        // Passo do algoritmo — executa parte da regra de negócio ou da interface
                        )}
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      >
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {t.type === "income"
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          ? t.incomeFrequency && t.incomeFrequency in INCOME_FREQUENCY_LABELS
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            ? INCOME_FREQUENCY_LABELS[t.incomeFrequency as IncomeFrequency]
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            : "Ganho"
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          : "Despesa"}
                      // Tag HTML na interface
                      </span>
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="max-w-[220px] truncate py-3 pr-3 font-medium text-foreground">
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      {t.description ?? "—"}
                    // Tag HTML na interface
                    </td>
                    // Tag HTML na interface
                    <td className="py-3 pr-3 text-muted-foreground">
                      // Tag HTML na interface
                      <span className="inline-flex items-center gap-1.5">
                        // Elemento/componente React na tela
                        <CategoryIcon name={t.categoryIcon} size={14} />
                        // Instrução do fluxo — parte da lógica de negócio ou interface
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
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        "py-3 pr-3 text-right tabular font-semibold",
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        t.type === "income" ? "text-cgreen-500" : "text-cred-main",
                      // Passo do algoritmo — executa parte da regra de negócio ou da interface
                      )}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    >
                      // Instrução do fluxo — parte da lógica de negócio ou interface
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
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          title="Editar"
                          // Executa ação quando o usuário clica
                          onClick={() => setEditingTx(t)}
                        // Instrução do fluxo — parte da lógica de negócio ou interface
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
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          title="Excluir"
                          // Desabilita botão/campo (ex.: durante envio)
                          disabled={inactivateTx.isPending}
                          // Executa ação quando o usuário clica
                          onClick={() => {
                            // Condição — executa bloco só se verdadeira
                            if (confirm(`Excluir "${t.description ?? "lançamento"}"? Os indicadores serão recalculados.`)) {
                              // Instrução do fluxo — parte da lógica de negócio ou interface
                              inactivateTx.mutate(t.id);
                            }
                          // Passo do algoritmo — executa parte da regra de negócio ou da interface
                          }}
                        // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                ))}
              // Tag HTML na interface
              </tbody>
            // Tag HTML na interface
            </table>
          // Tag HTML na interface
          </div>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
      // Tag HTML na interface
      </div>

      // Elemento/componente React na tela
      <TransactionDialog
        // Instrução do fluxo — parte da lógica de negócio ou interface
        open={expenseOpen}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        onOpenChange={setExpenseOpen}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        type="expense"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        categories={categories}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        loading={txLoading}
        // Envia formulário quando usuário pressiona Enter ou botão
        onSubmit={async (data) => {
          // Condição — executa bloco só se verdadeira
          if (!token) return;
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setTxLoading(true);
          // Tenta executar — erros vão para catch
          try {
            // Aguarda resposta assíncrona (API, timer)
            await apiPostTransaction(token, {
              // Instrução do fluxo — parte da lógica de negócio ou interface
              amount: data.amount,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              description: data.description,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              categoryId: data.categoryId,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              occurredAt: data.occurredAt,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              type: "expense",
              // Instrução do fluxo — parte da lógica de negócio ou interface
              source: "manual",
            });
            // Exibe notificação temporária (toast) na tela
            toast.success("Despesa registrada — gastos e líquido atualizados.");
            // Instrução do fluxo — parte da lógica de negócio ou interface
            setExpenseOpen(false);
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["transactions"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["monthly"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["kpis"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["insights"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["goals"] });
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          } catch (e) {
            // Exibe notificação temporária (toast) na tela
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          } finally {
            // Instrução do fluxo — parte da lógica de negócio ou interface
            setTxLoading(false);
          }
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      />
      // Elemento/componente React na tela
      <TransactionDialog
        // Instrução do fluxo — parte da lógica de negócio ou interface
        open={incomeOpen}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        onOpenChange={setIncomeOpen}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        type="income"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        categories={categories}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        loading={txLoading}
        // Envia formulário quando usuário pressiona Enter ou botão
        onSubmit={async (data) => {
          // Condição — executa bloco só se verdadeira
          if (!token) return;
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setTxLoading(true);
          // Tenta executar — erros vão para catch
          try {
            // Aguarda resposta assíncrona (API, timer)
            await apiPostTransaction(token, {
              // Instrução do fluxo — parte da lógica de negócio ou interface
              amount: data.amount,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              description: data.description,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              categoryId: data.categoryId,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              occurredAt: data.occurredAt,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              type: "income",
              // Instrução do fluxo — parte da lógica de negócio ou interface
              source: "manual",
              // Instrução do fluxo — parte da lógica de negócio ou interface
              incomeFrequency: data.incomeFrequency ?? "monthly",
            });
            // Exibe notificação temporária (toast) na tela
            toast.success("Ganho registrado — faturamento atualizado.");
            // Instrução do fluxo — parte da lógica de negócio ou interface
            setIncomeOpen(false);
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["transactions"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["monthly"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["kpis"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["insights"] });
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["goals"] });
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          } catch (e) {
            // Exibe notificação temporária (toast) na tela
            toast.error(e instanceof Error ? e.message : "Erro ao salvar");
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          } finally {
            // Instrução do fluxo — parte da lógica de negócio ou interface
            setTxLoading(false);
          }
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      />
      // Elemento/componente React na tela
      <TransactionDialog
        // Instrução do fluxo — parte da lógica de negócio ou interface
        open={Boolean(editingTx)}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        onOpenChange={(v) => {
          // Condição — executa bloco só se verdadeira
          if (!v) setEditingTx(null);
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        }}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        type={editingTx?.type === "income" ? "income" : "expense"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        categories={categories}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        loading={patchTx.isPending}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        mode="edit"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        initial={editingTx}
        // Envia formulário quando usuário pressiona Enter ou botão
        onSubmit={async (data) => {
          // Condição — executa bloco só se verdadeira
          if (!editingTx) return;
          // Aguarda resposta assíncrona (API, timer)
          await patchTx.mutateAsync({
            // Instrução do fluxo — parte da lógica de negócio ou interface
            id: editingTx.id,
            // Instrução do fluxo — parte da lógica de negócio ou interface
            body: {
              // Instrução do fluxo — parte da lógica de negócio ou interface
              amount: data.amount,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              description: data.description,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              categoryId: data.categoryId,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              occurredAt: data.occurredAt,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              incomeFrequency: editingTx.type === "income" ? data.incomeFrequency ?? null : null,
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            },
          });
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      />
      // Elemento/componente React na tela
      <MonthlyBudgetDialog
        // Instrução do fluxo — parte da lógica de negócio ou interface
        open={budgetOpen}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        onOpenChange={setBudgetOpen}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        month={currentMonth}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        initialIncome={
          // Instrução do fluxo — parte da lógica de negócio ou interface
          budgetRes?.budget?.totalIncomeExpected != null ? String(budgetRes.budget.totalIncomeExpected) : "8500"
        }
        // Instrução do fluxo — parte da lógica de negócio ou interface
        initialLimit={budgetRes?.budget?.totalExpenseLimit != null ? String(budgetRes.budget.totalExpenseLimit) : "7000"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        loading={budgetLoading}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        onSave={async (inc, lim) => {
          // Condição — executa bloco só se verdadeira
          if (!token) return;
          // Instrução do fluxo — parte da lógica de negócio ou interface
          setBudgetLoading(true);
          // Tenta executar — erros vão para catch
          try {
            // Aguarda resposta assíncrona (API, timer)
            await apiPutBudget(token, {
              // Instrução do fluxo — parte da lógica de negócio ou interface
              month: currentMonth,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              totalIncomeExpected: inc || null,
              // Instrução do fluxo — parte da lógica de negócio ou interface
              totalExpenseLimit: lim || null,
            });
            // Exibe notificação temporária (toast) na tela
            toast.success("Orçamento salvo.");
            // Instrução do fluxo — parte da lógica de negócio ou interface
            void qc.invalidateQueries({ queryKey: ["budget", token, currentMonth] });
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          } catch (e) {
            // Exibe notificação temporária (toast) na tela
            toast.error(e instanceof Error ? e.message : "Erro");
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          } finally {
            // Instrução do fluxo — parte da lógica de negócio ou interface
            setBudgetLoading(false);
          }
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      />
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
