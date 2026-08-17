/**
 * Metas financeiras — criar, editar e acompanhar progresso via API /goals.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion"; // Animações de entrada dos cards
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, TrendingUp, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Slider } from "@/components/ui/slider";
import { MagicCard } from "@/components/ui/magic-card";
import { ChartPlotArea } from "@/components/ChartPlotArea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/lib/category-icons";
import { useAuth } from "@/lib/auth";
import {
  apiCreateGoal,
  apiGetCategories,
  apiGetGoals,
  apiPatchGoal,
  type ApiCategory,
  type ApiGoal,
} from "@/lib/api";

type GoalTemplate = {
  name: string;
  goalType: "limit" | "saving";
  limitAmount: number;
  targetAmount?: number;
  periodType: "monthly" | "quarterly" | "yearly";
  categoryName?: string;
  color: string;
  icon: string;
  description: string;
};

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    name: "Limite alimentação",
    goalType: "limit",
    limitAmount: 800,
    periodType: "monthly",
    categoryName: "Alimentação",
    color: "#4CAF50",
    icon: "utensils",
    description: "Controle gastos com mercado, delivery e restaurantes",
  },
  {
    name: "Fundo de emergência",
    goalType: "saving",
    limitAmount: 10000,
    targetAmount: 10000,
    periodType: "yearly",
    color: "#42A5F5",
    icon: "piggy-bank",
    description: "Guarde uma reserva para imprevistos",
  },
  {
    name: "Limite transporte",
    goalType: "limit",
    limitAmount: 600,
    periodType: "monthly",
    categoryName: "Transporte",
    color: "#FFB300",
    icon: "car",
    description: "Combustível, Uber e deslocamentos do mês",
  },
  {
    name: "Viagem",
    goalType: "saving",
    limitAmount: 5000,
    targetAmount: 5000,
    periodType: "yearly",
    color: "#AB47BC",
    icon: "plane",
    description: "Junte para a próxima viagem",
  },
  {
    name: "Limite lazer",
    goalType: "limit",
    limitAmount: 400,
    periodType: "monthly",
    categoryName: "Lazer",
    color: "#26C6DA",
    icon: "gamepad-2",
    description: "Streaming, cinema e passeios",
  },
  {
    name: "Reduzir assinaturas",
    goalType: "limit",
    limitAmount: 150,
    periodType: "monthly",
    categoryName: "Assinaturas",
    color: "#EF5350",
    icon: "tv",
    description: "Teto mensal para apps e serviços",
  },
];

function findCategoryId(categories: ApiCategory[], name?: string): string | null {
  if (!name) return null;
  const hit = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return hit?.id ?? null;
}

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

function GoalCard({ goal, onInactivate }: { goal: ApiGoal; onInactivate: () => void }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";
  const [simAmount, setSimAmount] = useState([500]);

  const target = goal.targetAmount ?? goal.limitAmount;
  const riskColors = {
    low: "text-cgreen-600 dark:text-cgreen-400 bg-cgreen-50 dark:bg-cgreen-900/30",
    medium: "text-camber-main bg-camber-light dark:bg-amber-900/25",
    high: "text-cred-main bg-cred-light dark:bg-red-900/25",
  };
  const riskLabels = { low: "Baixo", medium: "Médio", high: "Alto" };

  const evolutionData = [{ month: "Atual", value: goal.currentAmount }];

  const monthsToGoal =
    goal.goalType === "saving" && simAmount[0] > 0
      ? Math.ceil(Math.max(target - goal.currentAmount, 0) / simAmount[0])
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
                <CategoryIcon name={goal.categoryIcon ?? "wallet"} size={20} />
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
            <button
              type="button"
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-cred-main"
              aria-label="Inativar meta"
              title="Inativar meta"
              onClick={onInactivate}
            >
              <Ban size={16} />
            </button>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">
                R$ {goal.currentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="font-medium tabular text-foreground">
                {goal.percentage.toFixed(0)}% de R$ {target.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <GoalProgressBar percentage={goal.percentage} />
          </div>

          <ChartPlotArea className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fill: tickFill, fontSize: 11 }} />
                <YAxis tick={{ fill: tickFill, fontSize: 11 }} width={48} />
                <Line type="monotone" dataKey="value" stroke={goal.color} strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </ChartPlotArea>

          {goal.goalType === "saving" && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Simulação de aporte mensal</p>
              <Slider value={simAmount} onValueChange={setSimAmount} min={100} max={5000} step={100} />
              <p className="text-xs text-muted-foreground">
                R$ {simAmount[0].toLocaleString("pt-BR")}/mês
                {monthsToGoal ? ` → meta em ~${monthsToGoal} meses` : ""}
              </p>
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
  icon: React.ComponentType<{ size?: number; className?: string }>;
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

function TemplateCard({
  template,
  onUse,
  loading,
}: {
  template: GoalTemplate;
  onUse: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onUse}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-cgreen-500/50 hover:bg-cgreen-500/5 disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${template.color}22`, color: template.color }}
        >
          <CategoryIcon name={template.icon} size={20} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground">{template.name}</p>
          <p className="text-xs text-muted-foreground">
            {template.goalType === "limit" ? "Limite" : "Poupança"} · R${" "}
            {template.limitAmount.toLocaleString("pt-BR")}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{template.description}</p>
    </button>
  );
}

export default function Goals() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false); // Modal de nova meta
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("500");
  const [customType, setCustomType] = useState<"limit" | "saving">("limit");

  // GET /api/goals — lista metas com progresso calculado no backend
  const { data, isLoading } = useQuery({
    queryKey: ["goals", token],
    queryFn: () => apiGetGoals(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: catRes } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => apiGetCategories(token!),
    enabled: Boolean(token),
  });
  const categories = catRes?.categories ?? [];

  const createMut = useMutation({
    mutationFn: (payload: Parameters<typeof apiCreateGoal>[1]) => apiCreateGoal(token!, payload),
    onSuccess: () => {
      toast.success("Meta criada!");
      void qc.invalidateQueries({ queryKey: ["goals"] });
      setDialogOpen(false);
      setCustomName("");
      setCustomAmount("500");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const inactivateMut = useMutation({
    mutationFn: (id: string) => apiPatchGoal(token!, id, { isActive: false }),
    onSuccess: () => {
      toast.success("Meta inativada");
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createFromTemplate = (template: GoalTemplate) => {
    createMut.mutate({
      name: template.name,
      goalType: template.goalType,
      limitAmount: template.limitAmount,
      targetAmount: template.targetAmount ?? template.limitAmount,
      periodType: template.periodType,
      categoryId: findCategoryId(categories, template.categoryName),
      color: template.color,
    });
  };

  const createCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(customAmount.replace(",", "."));
    if (!customName.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Preencha nome e valor válidos");
      return;
    }
    createMut.mutate({
      name: customName.trim(),
      goalType: customType,
      limitAmount: amount,
      targetAmount: customType === "saving" ? amount : undefined,
      periodType: "monthly",
      color: "#6366f1",
    });
  };

  const goals = (data?.goals ?? []).filter((g) => g.isActive);
  const onTrack = goals.filter((g) => g.percentage < 90 && !g.exceeded).length;
  const exceeded = goals.filter((g) => g.exceeded || g.percentage >= 100).length;

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Metas Financeiras</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Escolha um modelo ou crie a sua — o progresso vem das transações registradas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-cgreen-500 hover:bg-cgreen-700">
              <Plus size={16} />
              Nova meta
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar meta personalizada</DialogTitle>
            </DialogHeader>
            <form onSubmit={createCustom} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="goal-name">Nome</Label>
                <Input
                  id="goal-name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex.: Economizar para notebook"
                  required
                />
              </div>
              <div>
                <Label htmlFor="goal-amount">Valor (R$)</Label>
                <Input
                  id="goal-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                {(["limit", "saving"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCustomType(t)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      customType === t
                        ? "border-cgreen-500 bg-cgreen-500/10 text-cgreen-700 dark:text-cgreen-400"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t === "limit" ? "Limite de gasto" : "Poupança"}
                  </button>
                ))}
              </div>
              <Button type="submit" className="w-full bg-cgreen-500 hover:bg-cgreen-700" disabled={createMut.isPending}>
                {createMut.isPending ? "Salvando…" : "Criar meta"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando metas…</p>}

      {!isLoading && goals.length === 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Comece com um modelo pronto:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GOAL_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.name}
                template={template}
                onUse={() => createFromTemplate(template)}
                loading={createMut.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryStat icon={CheckCircle2} label="No prazo" value={onTrack} iconBg="bg-cgreen-50 dark:bg-cgreen-900/30" iconClass="text-cgreen-500" />
            <SummaryStat icon={AlertTriangle} label="Atenção" value={goals.length - onTrack - exceeded} iconBg="bg-camber-light dark:bg-amber-900/25" iconClass="text-camber-main" />
            <SummaryStat icon={TrendingUp} label="Excedidas" value={exceeded} iconBg="bg-cred-light dark:bg-red-900/25" iconClass="text-cred-main" />
          </div>
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onInactivate={() => inactivateMut.mutate(goal.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
