import { useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Plus, Pause, Pencil, Trash2, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { goalsData, type Goal } from "@/lib/mockData";
import { Slider } from "@/components/ui/slider";
import { MagicCard } from "@/components/ui/magic-card";
import { ChartPlotArea } from "@/components/ChartPlotArea";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/category-icons";

function GoalProgressBar({ percentage }: { percentage: number }) {
  const color = percentage < 60 ? "#4CAF50" : percentage < 90 ? "#FFB300" : "#EF5350";
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(percentage, 100)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";

  const [simAmount, setSimAmount] = useState([500]);
  const percentage = Math.round((goal.currentAmount / goal.targetAmount) * 100);
  const riskColors = {
    low: "text-cgreen-600 dark:text-cgreen-400 bg-cgreen-50 dark:bg-cgreen-900/30",
    medium: "text-camber-main bg-camber-light dark:bg-amber-900/25",
    high: "text-cred-main bg-cred-light dark:bg-red-900/25",
  };
  const riskLabels = { low: "Baixo", medium: "Médio", high: "Alto" };

  const evolutionData = goal.history.map((h) => ({
    month: h.month,
    value: Math.round((h.percentage / 100) * goal.targetAmount),
  }));
  evolutionData.push({ month: "Abr", value: goal.currentAmount });

  const monthsToGoal =
    goal.goalType === "saving" && simAmount[0] > 0
      ? Math.ceil((goal.targetAmount - goal.currentAmount) / simAmount[0])
      : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full min-h-0 rounded-xl">
      <MagicCard
        className="h-full rounded-xl border border-border/60"
        gradientFrom="#6ee7b7"
        gradientTo="#22c55e"
        gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
        gradientSize={200}
      >
        <div className="flex h-full flex-col space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                <CategoryIcon name={goal.categoryIcon} size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold tracking-tight text-foreground">{goal.name}</h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {goal.goalType === "limit" ? "Limite" : "Poupança"}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", riskColors[goal.riskLevel])}>
                    Risco {riskLabels[goal.riskLevel]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Pause size={14} />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-cred-light hover:text-cred-main dark:hover:bg-red-900/30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between gap-2">
              <span className="text-lg font-semibold tabular tracking-tight text-foreground">
                R$ {goal.currentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="tabular text-sm text-muted-foreground">
                de R$ {goal.targetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <GoalProgressBar percentage={percentage} />
            <div className="mt-1.5 flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-semibold",
                  percentage >= 100 ? "text-cred-main" : percentage >= 90 ? "text-camber-main" : "text-cgreen-500",
                )}
              >
                {percentage}%
              </span>
              <span className="text-xs text-muted-foreground">{goal.estimatedCompletion}</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Evolução</p>
            <ChartPlotArea className="p-2">
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: tickFill }} />
                  <YAxis hide />
                  <ReferenceLine y={goal.targetAmount} stroke="#FFB300" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={goal.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: goal.color }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartPlotArea>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-muted-foreground">Últimos 3 meses:</span>
            {goal.history.map((h, i) => {
              const c =
                h.percentage < 60 ? "bg-cgreen-500" : h.percentage < 90 ? "bg-camber-main" : "bg-cred-main";
              return (
                <div key={i} className="flex items-center gap-1">
                  <div className={`h-3 w-3 rounded-full ${c}`} title={`${h.month}: ${h.percentage}%`} />
                  <span className="text-xs text-muted-foreground">{h.percentage}%</span>
                </div>
              );
            })}
          </div>

          {goal.goalType === "saving" && (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Simulação de Aporte
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Aporte mensal</span>
                  <span className="tabular text-sm font-semibold text-foreground">
                    R$ {simAmount[0].toLocaleString("pt-BR")}
                  </span>
                </div>
                <Slider value={simAmount} onValueChange={setSimAmount} min={100} max={3000} step={100} className="w-full" />
                {monthsToGoal && (
                  <p className="text-sm font-medium text-cgreen-600 dark:text-cgreen-400">
                    ✨ Com R$ {simAmount[0]}/mês, você atinge a meta em {monthsToGoal} meses
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </MagicCard>
    </motion.div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  iconBg,
  iconClass,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  iconBg: string;
  iconClass: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <MagicCard
      className="min-h-[92px] rounded-xl border border-border/60"
      gradientFrom="#6ee7b7"
      gradientTo="#22c55e"
      gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
      gradientSize={180}
    >
      <div className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon size={18} className={iconClass} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold tabular tracking-tight text-foreground">{value}</p>
        </div>
      </div>
    </MagicCard>
  );
}

export default function Goals() {
  const activeGoals = goalsData.filter((g) => g.isActive);
  const onTrack = activeGoals.filter((g) => g.currentAmount / g.targetAmount < 0.9).length;
  const exceeded = activeGoals.filter((g) => g.currentAmount / g.targetAmount >= 1).length;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Metas Financeiras</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Abril 2026</p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-full bg-cgreen-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cgreen-700 active:scale-[0.97]"
        >
          <Plus size={16} />
          Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryStat
          icon={CheckCircle2}
          label="No prazo"
          value={onTrack}
          iconBg="bg-cgreen-50 dark:bg-cgreen-900/30"
          iconClass="text-cgreen-500"
        />
        <SummaryStat
          icon={AlertTriangle}
          label="Atenção"
          value={activeGoals.length - onTrack - exceeded}
          iconBg="bg-camber-light dark:bg-amber-900/25"
          iconClass="text-camber-main"
        />
        <SummaryStat
          icon={TrendingUp}
          label="Excedidas"
          value={exceeded}
          iconBg="bg-cred-light dark:bg-red-900/25"
          iconClass="text-cred-main"
        />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {goalsData.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
