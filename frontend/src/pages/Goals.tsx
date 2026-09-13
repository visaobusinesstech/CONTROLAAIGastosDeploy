/**
 * Metas financeiras — CRUD completo com progresso real via API /goals.
 *
 * Papel no sistema: Página React Router — UI autenticada consumindo api.ts e auth.tsx.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useState } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, TrendingUp, AlertTriangle, CheckCircle2, Ban, Pencil } from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { computeGoalProgressPercent } from "@/lib/financial-summary";

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
    name: "Meta de faturamento mensal",
    goalType: "saving",
    limitAmount: 20000,
    targetAmount: 20000,
    periodType: "monthly",
    color: "#4CAF50",
    icon: "wallet",
    description: "Progresso baseado nos ganhos reais registrados no período",
  },
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
    description: "Guarde uma reserva — progresso pelos ganhos registrados",
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
];

// Declara função auxiliar interna
function findCategoryId(categories: ApiCategory[], name?: string): string | null {
  if (!name) return null;
  const hit = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return hit?.id ?? null;
}

// Declara função auxiliar interna
function GoalProgressBar({ percentage }: { percentage: number }) {
  const color = percentage < 60 ? "#4CAF50" : percentage < 90 ? "#FFB300" : "#EF5350";
  return (
    // Tag HTML na interface
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      // Tag HTML na interface
      <motion.div
        initial={{ width: 0 }}
        // Operação matemática (arredondar, somar, etc.)
        animate={{ width: `${Math.min(percentage, 100)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        // Classes CSS Tailwind — controla aparência visual
        className="h-full rounded-full"
        style={{ background: color }}
      />
    // Tag HTML na interface
    </div>
  );
}

// Declara função auxiliar interna
function GoalCard({
  goal,
  onInactivate,
  onEdit,
}: {
  goal: ApiGoal;
  onInactivate: () => void;
  onEdit: () => void;
}) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";
  const [simAmount, setSimAmount] = useState([500]);
  const target = goal.targetAmount ?? goal.limitAmount;
  // Progresso dinâmico: backend já calcula; reforçamos a mesma regra no cliente
  const livePct =
    goal.goalType === "saving"
      ? computeGoalProgressPercent(goal.currentAmount, target)
      : goal.percentage;
  const riskColors = {
    low: "text-cgreen-600 dark:text-cgreen-400 bg-cgreen-50 dark:bg-cgreen-900/30",
    medium: "text-camber-main bg-camber-light dark:bg-amber-900/25",
    high: "text-cred-main bg-cred-light dark:bg-red-900/25",
  };
  const riskLabels = { low: "Baixo", medium: "Médio", high: "Alto" };
  const evolutionData = [{ month: "Atual", value: goal.currentAmount }];
  const monthsToGoal =
    goal.goalType === "saving" && simAmount[0] > 0
      // Operação matemática (arredondar, somar, etc.)
      ? Math.ceil(Math.max(target - goal.currentAmount, 0) / simAmount[0])
      : null;
  return (
    // Tag HTML na interface
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full min-h-0 rounded-xl">
      // Elemento/componente React na tela
      <MagicCard
        // Classes CSS Tailwind — controla aparência visual
        className="h-full rounded-xl border border-border/60"
        gradientFrom="#6ee7b7"
        gradientTo="#22c55e"
        gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
        gradientSize={200}
      >
        // Tag HTML na interface
        <div className="flex h-full flex-col space-y-4 p-5">
          // Tag HTML na interface
          <div className="flex items-start justify-between gap-3">
            // Tag HTML na interface
            <div className="flex min-w-0 items-center gap-3">
              // Tag HTML na interface
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground">
                // Elemento/componente React na tela
                <CategoryIcon name={goal.categoryIcon ?? "wallet"} size={20} />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="min-w-0">
                // Tag HTML na interface
                <h3 className="text-base font-semibold tracking-tight text-foreground">{goal.name}</h3>
                // Tag HTML na interface
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  // Tag HTML na interface
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {goal.goalType === "limit" ? "Limite de gasto" : "Meta de ganhos/faturamento"}
                  // Tag HTML na interface
                  </span>
                  // Tag HTML na interface
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {goal.periodType === "monthly"
                      ? "Mensal"
                      : goal.periodType === "quarterly"
                        ? "Trimestral"
                        : "Anual"}
                  // Tag HTML na interface
                  </span>
                  // Tag HTML na interface
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", riskColors[goal.riskLevel])}>
                    Risco {riskLabels[goal.riskLevel]}
                  // Tag HTML na interface
                  </span>
                // Tag HTML na interface
                </div>
              // Tag HTML na interface
              </div>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="flex items-center gap-1">
              // Tag HTML na interface
              <button
                // Botão comum (não envia formulário)
                type="button"
                // Classes CSS Tailwind — controla aparência visual
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                // Texto acessível para leitores de tela
                aria-label="Editar meta"
                title="Editar meta"
                // Executa ação quando o usuário clica
                onClick={onEdit}
              >
                // Elemento/componente React na tela
                <Pencil size={16} />
              // Tag HTML na interface
              </button>
              // Tag HTML na interface
              <button
                // Botão comum (não envia formulário)
                type="button"
                // Classes CSS Tailwind — controla aparência visual
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-cred-main"
                // Texto acessível para leitores de tela
                aria-label="Excluir meta"
                title="Excluir meta"
                // Executa ação quando o usuário clica
                onClick={onInactivate}
              >
                // Elemento/componente React na tela
                <Ban size={16} />
              // Tag HTML na interface
              </button>
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div>
            // Tag HTML na interface
            <div className="mb-1 flex justify-between text-sm">
              // Tag HTML na interface
              <span className="text-muted-foreground">
                // Formata número como moeda/texto local (pt-BR)
                R$ {goal.currentAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                {goal.goalType === "saving" ? " em ganhos" : " gastos"}
              // Tag HTML na interface
              </span>
              // Tag HTML na interface
              <span className="font-medium tabular text-foreground">
                // Formata número como moeda/texto local (pt-BR)
                {livePct.toFixed(0)}% de R$ {target.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              // Tag HTML na interface
              </span>
            // Tag HTML na interface
            </div>
            // Elemento/componente React na tela
            <GoalProgressBar percentage={livePct} />
            {goal.currentAmount === 0 && (
              // Tag HTML na interface
              <p className="mt-2 text-xs text-muted-foreground">
                {goal.goalType === "saving"
                  ? "Você ainda não possui ganhos registrados neste período da meta."
                  : "Nenhuma despesa registrada neste período da meta."}
              // Tag HTML na interface
              </p>
            )}
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <ChartPlotArea className="h-[120px]">
            // Elemento/componente React na tela
            <ResponsiveContainer width="100%" height="100%">
              // Elemento/componente React na tela
              <LineChart data={evolutionData}>
                // Elemento/componente React na tela
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                // Elemento/componente React na tela
                <XAxis dataKey="month" tick={{ fill: tickFill, fontSize: 11 }} />
                // Elemento/componente React na tela
                <YAxis tick={{ fill: tickFill, fontSize: 11 }} width={48} />
                // Elemento/componente React na tela
                <Line type="monotone" dataKey="value" stroke={goal.color} strokeWidth={2} dot />
              // Elemento/componente React na tela
              </LineChart>
            // Elemento/componente React na tela
            </ResponsiveContainer>
          // Elemento/componente React na tela
          </ChartPlotArea>
          {goal.goalType === "saving" && (
            // Tag HTML na interface
            <div className="space-y-2 border-t border-border pt-3">
              // Tag HTML na interface
              <p className="text-xs font-medium text-muted-foreground">Simulação de aporte mensal</p>
              // Elemento/componente React na tela
              <Slider value={simAmount} onValueChange={setSimAmount} min={100} max={5000} step={100} />
              // Tag HTML na interface
              <p className="text-xs text-muted-foreground">
                // Formata número como moeda/texto local (pt-BR)
                R$ {simAmount[0].toLocaleString("pt-BR")}/mês
                {monthsToGoal ? ` → meta em ~${monthsToGoal} meses` : ""}
              // Tag HTML na interface
              </p>
            // Tag HTML na interface
            </div>
          )}
        // Tag HTML na interface
        </div>
      // Elemento/componente React na tela
      </MagicCard>
    // Tag HTML na interface
    </motion.div>
  );
}

// Declara função auxiliar interna
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
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    // Elemento/componente React na tela
    <MagicCard
      // Classes CSS Tailwind — controla aparência visual
      className="min-h-[92px] rounded-xl border border-border/60"
      gradientFrom="#6ee7b7"
      gradientTo="#22c55e"
      gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
      gradientSize={180}
    >
      // Tag HTML na interface
      <div className="flex items-center gap-3 p-4">
        // Tag HTML na interface
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          // Elemento/componente React na tela
          <Icon size={18} className={iconClass} />
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="min-w-0">
          // Tag HTML na interface
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          // Tag HTML na interface
          <p className="text-lg font-semibold tabular tracking-tight text-foreground">{value}</p>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
    // Elemento/componente React na tela
    </MagicCard>
  );
}

// Declara função auxiliar interna
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
    // Tag HTML na interface
    <button
      // Botão comum (não envia formulário)
      type="button"
      // Desabilita botão/campo (ex.: durante envio)
      disabled={loading}
      // Executa ação quando o usuário clica
      onClick={onUse}
      // Classes CSS Tailwind — controla aparência visual
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-cgreen-500/50 hover:bg-cgreen-500/5 disabled:opacity-60"
    >
      // Tag HTML na interface
      <div className="flex items-center gap-3">
        // Tag HTML na interface
        <div
          // Classes CSS Tailwind — controla aparência visual
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${template.color}22`, color: template.color }}
        >
          // Elemento/componente React na tela
          <CategoryIcon name={template.icon} size={20} />
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="min-w-0">
          // Tag HTML na interface
          <p className="font-medium text-foreground">{template.name}</p>
          // Tag HTML na interface
          <p className="text-xs text-muted-foreground">
            {template.goalType === "limit" ? "Limite" : "Ganhos"} · R${" "}
            // Formata número como moeda/texto local (pt-BR)
            {template.limitAmount.toLocaleString("pt-BR")}
          // Tag HTML na interface
          </p>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <p className="text-xs text-muted-foreground">{template.description}</p>
    // Tag HTML na interface
    </button>
  );
}

export default function Goals() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<ApiGoal | null>(null);
  const [customName, setCustomName] = useState("");
  const [customAmount, setCustomAmount] = useState("20000");
  const [customType, setCustomType] = useState<"limit" | "saving">("saving");
  const [customPeriod, setCustomPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPeriod, setEditPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data, isLoading } = useQuery({
    queryKey: ["goals", token],
    queryFn: () => apiGetGoals(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: catRes } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => apiGetCategories(token!),
    enabled: Boolean(token),
  });
  const categories = catRes?.categories ?? [];
  // Mutação na API (criar/editar/excluir)
  const createMut = useMutation({
    mutationFn: (payload: Parameters<typeof apiCreateGoal>[1]) => apiCreateGoal(token!, payload),
    onSuccess: () => {
      // Exibe notificação temporária (toast) na tela
      toast.success("Meta criada!");
      void qc.invalidateQueries({ queryKey: ["goals"] });
      setDialogOpen(false);
      setCustomName("");
      setCustomAmount("20000");
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Mutação na API (criar/editar/excluir)
  const inactivateMut = useMutation({
    mutationFn: (id: string) => apiPatchGoal(token!, id, { isActive: false }),
    onSuccess: () => {
      // Exibe notificação temporária (toast) na tela
      toast.success("Meta excluída (inativada)");
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Mutação na API (criar/editar/excluir)
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof apiPatchGoal>[2] }) =>
      apiPatchGoal(token!, id, body),
    onSuccess: () => {
      // Exibe notificação temporária (toast) na tela
      toast.success("Meta atualizada — progresso recalculado");
      void qc.invalidateQueries({ queryKey: ["goals"] });
      setEditGoal(null);
    },
    // Exibe notificação temporária (toast) na tela
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
      // Exibe notificação temporária (toast) na tela
      toast.error("Preencha nome e valor válidos (maior que zero)");
      return;
    }
    createMut.mutate({
      // Remove espaços no início/fim do texto
      name: customName.trim(),
      goalType: customType,
      limitAmount: amount,
      targetAmount: customType === "saving" ? amount : undefined,
      periodType: customPeriod,
      color: "#6366f1",
    });
  };
  const openEdit = (goal: ApiGoal) => {
    setEditGoal(goal);
    setEditName(goal.name);
    setEditAmount(String(goal.targetAmount ?? goal.limitAmount));
    setEditPeriod((goal.periodType as "monthly" | "quarterly" | "yearly") || "monthly");
  };
  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGoal) return;
    const amount = Number(editAmount.replace(",", "."));
    if (!editName.trim() || !Number.isFinite(amount) || amount <= 0) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Nome e valor da meta são obrigatórios (valor > 0)");
      return;
    }
    updateMut.mutate({
      id: editGoal.id,
      body: {
        // Remove espaços no início/fim do texto
        name: editName.trim(),
        limitAmount: amount,
        targetAmount: editGoal.goalType === "saving" ? amount : null,
        periodType: editPeriod,
      },
    });
  };
  const goals = (data?.goals ?? []).filter((g) => g.isActive);
  const onTrack = goals.filter((g) => g.percentage < 90 && !g.exceeded).length;
  const exceeded = goals.filter((g) => g.exceeded || g.percentage >= 100).length;
  return (
    // Tag HTML na interface
    <div className="space-y-6 min-w-0 max-w-full">
      // Tag HTML na interface
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        // Tag HTML na interface
        <div>
          // Tag HTML na interface
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Metas Financeiras</h1>
          // Tag HTML na interface
          <p className="mt-0.5 text-sm text-muted-foreground">
            Crie, edite e acompanhe — progresso baseado em ganhos/despesas reais
          // Tag HTML na interface
          </p>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          // Elemento/componente React na tela
          <DialogTrigger asChild>
            // Elemento/componente React na tela
            <Button className="gap-2 bg-cgreen-500 hover:bg-cgreen-700">
              // Elemento/componente React na tela
              <Plus size={16} />
              Nova meta
            // Elemento/componente React na tela
            </Button>
          // Elemento/componente React na tela
          </DialogTrigger>
          // Elemento/componente React na tela
          <DialogContent className="sm:max-w-md">
            // Elemento/componente React na tela
            <DialogHeader>
              // Elemento/componente React na tela
              <DialogTitle>Criar meta personalizada</DialogTitle>
            // Elemento/componente React na tela
            </DialogHeader>
            // Tag HTML na interface
            <form onSubmit={createCustom} className="space-y-4 pt-2">
              // Tag HTML na interface
              <div>
                // Elemento/componente React na tela
                <Label htmlFor="goal-name">Nome *</Label>
                // Elemento/componente React na tela
                <Input
                  id="goal-name"
                  value={customName}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setCustomName(e.target.value)}
                  // Texto cinza de exemplo dentro do campo vazio
                  placeholder="Ex.: Faturamento mensal R$ 20.000"
                  required
                />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div>
                // Elemento/componente React na tela
                <Label htmlFor="goal-amount">Valor (R$) *</Label>
                // Elemento/componente React na tela
                <Input
                  id="goal-amount"
                  type="number"
                  min={1}
                  step={1}
                  value={customAmount}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setCustomAmount(e.target.value)}
                  required
                />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div>
                // Elemento/componente React na tela
                <Label>Período</Label>
                // Elemento/componente React na tela
                <Select value={customPeriod} onValueChange={(v) => setCustomPeriod(v as typeof customPeriod)}>
                  // Elemento/componente React na tela
                  <SelectTrigger>
                    // Elemento/componente React na tela
                    <SelectValue />
                  // Elemento/componente React na tela
                  </SelectTrigger>
                  // Elemento/componente React na tela
                  <SelectContent>
                    // Elemento/componente React na tela
                    <SelectItem value="monthly">Mensal</SelectItem>
                    // Elemento/componente React na tela
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    // Elemento/componente React na tela
                    <SelectItem value="yearly">Anual</SelectItem>
                  // Elemento/componente React na tela
                  </SelectContent>
                // Elemento/componente React na tela
                </Select>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="flex gap-2">
                // Percorre lista e renderiza um item para cada elemento
                {(["saving", "limit"] as const).map((t) => (
                  // Tag HTML na interface
                  <button
                    key={t}
                    // Botão comum (não envia formulário)
                    type="button"
                    // Executa ação quando o usuário clica
                    onClick={() => setCustomType(t)}
                    // Classes CSS Tailwind — controla aparência visual
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      customType === t
                        ? "border-cgreen-500 bg-cgreen-500/10 text-cgreen-700 dark:text-cgreen-400"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {t === "limit" ? "Limite de gasto" : "Meta de ganhos"}
                  // Tag HTML na interface
                  </button>
                ))}
              // Tag HTML na interface
              </div>
              // Elemento/componente React na tela
              <Button type="submit" className="w-full bg-cgreen-500 hover:bg-cgreen-700" disabled={createMut.isPending}>
                {createMut.isPending ? "Salvando…" : "Criar meta"}
              // Elemento/componente React na tela
              </Button>
            // Tag HTML na interface
            </form>
          // Elemento/componente React na tela
          </DialogContent>
        // Elemento/componente React na tela
        </Dialog>
      // Tag HTML na interface
      </div>
      // Elemento/componente React na tela
      <Dialog
        open={Boolean(editGoal)}
        onOpenChange={(v) => {
          if (!v) setEditGoal(null);
        }}
      >
        // Elemento/componente React na tela
        <DialogContent className="sm:max-w-md">
          // Elemento/componente React na tela
          <DialogHeader>
            // Elemento/componente React na tela
            <DialogTitle>Editar meta</DialogTitle>
          // Elemento/componente React na tela
          </DialogHeader>
          // Tag HTML na interface
          <form onSubmit={saveEdit} className="space-y-4 pt-2">
            // Tag HTML na interface
            <div>
              // Elemento/componente React na tela
              <Label htmlFor="edit-goal-name">Nome *</Label>
              // Elemento/componente React na tela
              <Input id="edit-goal-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div>
              // Elemento/componente React na tela
              <Label htmlFor="edit-goal-amount">Valor (R$) *</Label>
              // Elemento/componente React na tela
              <Input
                id="edit-goal-amount"
                type="number"
                min={1}
                step={1}
                value={editAmount}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setEditAmount(e.target.value)}
                required
              />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div>
              // Elemento/componente React na tela
              <Label>Período</Label>
              // Elemento/componente React na tela
              <Select value={editPeriod} onValueChange={(v) => setEditPeriod(v as typeof editPeriod)}>
                // Elemento/componente React na tela
                <SelectTrigger>
                  // Elemento/componente React na tela
                  <SelectValue />
                // Elemento/componente React na tela
                </SelectTrigger>
                // Elemento/componente React na tela
                <SelectContent>
                  // Elemento/componente React na tela
                  <SelectItem value="monthly">Mensal</SelectItem>
                  // Elemento/componente React na tela
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  // Elemento/componente React na tela
                  <SelectItem value="yearly">Anual</SelectItem>
                // Elemento/componente React na tela
                </SelectContent>
              // Elemento/componente React na tela
              </Select>
            // Tag HTML na interface
            </div>
            // Elemento/componente React na tela
            <DialogFooter>
              // Elemento/componente React na tela
              <Button type="button" variant="outline" onClick={() => setEditGoal(null)}>
                Cancelar
              // Elemento/componente React na tela
              </Button>
              // Elemento/componente React na tela
              <Button type="submit" className="bg-cgreen-500 hover:bg-cgreen-700" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Salvando…" : "Salvar"}
              // Elemento/componente React na tela
              </Button>
            // Elemento/componente React na tela
            </DialogFooter>
          // Tag HTML na interface
          </form>
        // Elemento/componente React na tela
        </DialogContent>
      // Elemento/componente React na tela
      </Dialog>
      // Classes CSS Tailwind — controla aparência visual
      {isLoading && <p className="text-sm text-muted-foreground">Carregando metas…</p>}
      {!isLoading && goals.length === 0 && (
        // Tag HTML na interface
        <div className="space-y-4">
          // Tag HTML na interface
          <p className="text-sm text-muted-foreground">Nenhuma meta ativa. Comece com um modelo pronto:</p>
          // Tag HTML na interface
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            // Percorre lista e renderiza um item para cada elemento
            {GOAL_TEMPLATES.map((template) => (
              // Elemento/componente React na tela
              <TemplateCard
                key={template.name}
                template={template}
                onUse={() => createFromTemplate(template)}
                loading={createMut.isPending}
              />
            ))}
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      )}
      {goals.length > 0 && (
        <>
          // Tag HTML na interface
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            // Elemento/componente React na tela
            <SummaryStat icon={CheckCircle2} label="No prazo" value={onTrack} iconBg="bg-cgreen-50 dark:bg-cgreen-900/30" iconClass="text-cgreen-500" />
            // Elemento/componente React na tela
            <SummaryStat icon={AlertTriangle} label="Atenção" value={goals.length - onTrack - exceeded} iconBg="bg-camber-light dark:bg-amber-900/25" iconClass="text-camber-main" />
            // Elemento/componente React na tela
            <SummaryStat icon={TrendingUp} label="Excedidas / batidas" value={exceeded} iconBg="bg-cred-light dark:bg-red-900/25" iconClass="text-cred-main" />
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
            // Percorre lista e renderiza um item para cada elemento
            {goals.map((goal) => (
              // Elemento/componente React na tela
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => openEdit(goal)}
                onInactivate={() => {
                  if (confirm(`Excluir a meta "${goal.name}"?`)) inactivateMut.mutate(goal.id);
                }}
              />
            ))}
          // Tag HTML na interface
          </div>
        </>
      )}
    // Tag HTML na interface
    </div>
  );
}
