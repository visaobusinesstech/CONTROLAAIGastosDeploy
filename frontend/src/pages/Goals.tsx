/**
 * Metas financeiras — CRUD completo com progresso real via API /goals.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useState } from "react";
// Importa funções/componentes de next-themes
import { useTheme } from "next-themes";
// Importa funções/componentes de framer-motion
import { motion } from "framer-motion"; // Animações de entrada dos cards
// Importa funções/componentes de @tanstack/react-query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Importa funções/componentes de sonner
import { toast } from "sonner";
// Importa funções/componentes de lucide-react
import { Plus, TrendingUp, AlertTriangle, CheckCircle2, Ban, Pencil } from "lucide-react";
// Importa funções/componentes de recharts
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
// Importa funções/componentes de @/components/ui/slider
import { Slider } from "@/components/ui/slider";
// Importa funções/componentes de @/components/ui/magic-card
import { MagicCard } from "@/components/ui/magic-card";
// Importa funções/componentes de @/components/ChartPlotArea
import { ChartPlotArea } from "@/components/ChartPlotArea";
// Importa funções/componentes de @/components/ui/button
import { Button } from "@/components/ui/button";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Dialog,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogContent,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogHeader,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogTitle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogTrigger,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogFooter,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/components/ui/dialog";
// Importa funções/componentes de @/components/ui/input
import { Input } from "@/components/ui/input";
// Importa funções/componentes de @/components/ui/label
import { Label } from "@/components/ui/label";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Select,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectContent,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectItem,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectTrigger,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectValue,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/components/ui/select";
// Importa funções/componentes de @/lib/utils
import { cn } from "@/lib/utils";
// Importa funções/componentes de @/lib/category-icons
import { CategoryIcon } from "@/lib/category-icons";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiCreateGoal,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetCategories,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetGoals,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPatchGoal,
  // Define formato de dados (TypeScript)
  type ApiCategory,
  // Define formato de dados (TypeScript)
  type ApiGoal,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/api";
// Importa funções/componentes de @/lib/financial-summary
import { computeGoalProgressPercent } from "@/lib/financial-summary";

// Define formato de dados (TypeScript)
type GoalTemplate = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  goalType: "limit" | "saving";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  limitAmount: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  targetAmount?: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  periodType: "monthly" | "quarterly" | "yearly";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryName?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  color: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  icon: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  description: string;
};

// Instrução do fluxo — parte da lógica de negócio ou interface
const GOAL_TEMPLATES: GoalTemplate[] = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: "Meta de faturamento mensal",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: "saving",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount: 20000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    targetAmount: 20000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType: "monthly",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color: "#4CAF50",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    icon: "wallet",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description: "Progresso baseado nos ganhos reais registrados no período",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: "Limite alimentação",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: "limit",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount: 800,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType: "monthly",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    categoryName: "Alimentação",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color: "#4CAF50",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    icon: "utensils",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description: "Controle gastos com mercado, delivery e restaurantes",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: "Fundo de emergência",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: "saving",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount: 10000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    targetAmount: 10000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType: "yearly",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color: "#42A5F5",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    icon: "piggy-bank",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description: "Guarde uma reserva — progresso pelos ganhos registrados",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: "Limite transporte",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: "limit",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount: 600,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType: "monthly",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    categoryName: "Transporte",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color: "#FFB300",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    icon: "car",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description: "Combustível, Uber e deslocamentos do mês",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: "Viagem",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: "saving",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount: 5000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    targetAmount: 5000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType: "yearly",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color: "#AB47BC",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    icon: "plane",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description: "Junte para a próxima viagem",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    name: "Limite lazer",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goalType: "limit",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    limitAmount: 400,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    periodType: "monthly",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    categoryName: "Lazer",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    color: "#26C6DA",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    icon: "gamepad-2",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    description: "Streaming, cinema e passeios",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

// Declara função auxiliar interna
function findCategoryId(categories: ApiCategory[], name?: string): string | null {
  // Condição — executa bloco só se verdadeira
  if (!name) return null;
  // Constante local
  const hit = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  // Retorna valor ou JSX para quem chamou
  return hit?.id ?? null;
}

// Declara função auxiliar interna
function GoalProgressBar({ percentage }: { percentage: number }) {
  // Constante local
  const color = percentage < 60 ? "#4CAF50" : percentage < 90 ? "#FFB300" : "#EF5350";
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      // Tag HTML na interface
      <motion.div
        // Instrução do fluxo — parte da lógica de negócio ou interface
        initial={{ width: 0 }}
        // Operação matemática (arredondar, somar, etc.)
        animate={{ width: `${Math.min(percentage, 100)}%` }}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        transition={{ duration: 0.6, ease: "easeOut" }}
        // Classes CSS Tailwind — controla aparência visual
        className="h-full rounded-full"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        style={{ background: color }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      />
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Declara função auxiliar interna
function GoalCard({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  goal,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onInactivate,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onEdit,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  goal: ApiGoal;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onInactivate: () => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onEdit: () => void;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  // Constante local
  const isDark = resolvedTheme === "dark";
  // Constante local
  const gridStroke = isDark ? "#48484A" : "#F0F0F2";
  // Constante local
  const tickFill = isDark ? "#A8A8AD" : "#AEAEB2";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [simAmount, setSimAmount] = useState([500]);

  // Constante local
  const target = goal.targetAmount ?? goal.limitAmount;
  // Progresso dinâmico: backend já calcula; reforçamos a mesma regra no cliente
  const livePct =
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goal.goalType === "saving"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ? computeGoalProgressPercent(goal.currentAmount, target)
      // Instrução do fluxo — parte da lógica de negócio ou interface
      : goal.percentage;
  // Constante local
  const riskColors = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    low: "text-cgreen-600 dark:text-cgreen-400 bg-cgreen-50 dark:bg-cgreen-900/30",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    medium: "text-camber-main bg-camber-light dark:bg-amber-900/25",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    high: "text-cred-main bg-cred-light dark:bg-red-900/25",
  };
  // Constante local
  const riskLabels = { low: "Baixo", medium: "Médio", high: "Alto" };
  // Constante local
  const evolutionData = [{ month: "Atual", value: goal.currentAmount }];
  // Constante local
  const monthsToGoal =
    // Instrução do fluxo — parte da lógica de negócio ou interface
    goal.goalType === "saving" && simAmount[0] > 0
      // Operação matemática (arredondar, somar, etc.)
      ? Math.ceil(Math.max(target - goal.currentAmount, 0) / simAmount[0])
      // Instrução do fluxo — parte da lógica de negócio ou interface
      : null;

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="h-full min-h-0 rounded-xl">
      // Elemento/componente React na tela
      <MagicCard
        // Classes CSS Tailwind — controla aparência visual
        className="h-full rounded-xl border border-border/60"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientFrom="#6ee7b7"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientTo="#22c55e"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        gradientSize={200}
      // Instrução do fluxo — parte da lógica de negócio ou interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {goal.goalType === "limit" ? "Limite de gasto" : "Meta de ganhos/faturamento"}
                  // Tag HTML na interface
                  </span>
                  // Tag HTML na interface
                  <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {goal.periodType === "monthly"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      ? "Mensal"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      : goal.periodType === "quarterly"
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        ? "Trimestral"
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        : "Anual"}
                  // Tag HTML na interface
                  </span>
                  // Tag HTML na interface
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", riskColors[goal.riskLevel])}>
                    // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                title="Editar meta"
                // Executa ação quando o usuário clica
                onClick={onEdit}
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                title="Excluir meta"
                // Executa ação quando o usuário clica
                onClick={onInactivate}
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {goal.currentAmount === 0 && (
              // Tag HTML na interface
              <p className="mt-2 text-xs text-muted-foreground">
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {goal.goalType === "saving"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  ? "Você ainda não possui ganhos registrados neste período da meta."
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  : "Nenhuma despesa registrada neste período da meta."}
              // Tag HTML na interface
              </p>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
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

          // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {monthsToGoal ? ` → meta em ~${monthsToGoal} meses` : ""}
              // Tag HTML na interface
              </p>
            // Tag HTML na interface
            </div>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
        // Tag HTML na interface
        </div>
      // Elemento/componente React na tela
      </MagicCard>
    // Tag HTML na interface
    </motion.div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Declara função auxiliar interna
function SummaryStat({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  icon: Icon,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  label,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  value,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  iconBg,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  iconClass,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  icon: React.ComponentType<{ size?: number; className?: string }>;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  label: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  value: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  iconBg: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  iconClass: string;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  // Constante local
  const isDark = resolvedTheme === "dark";
  // Retorna valor ou JSX para quem chamou
  return (
    // Elemento/componente React na tela
    <MagicCard
      // Classes CSS Tailwind — controla aparência visual
      className="min-h-[92px] rounded-xl border border-border/60"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      gradientFrom="#6ee7b7"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      gradientTo="#22c55e"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      gradientColor={isDark ? "#1c1c1e" : "#e4e4e7"}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      gradientSize={180}
    // Instrução do fluxo — parte da lógica de negócio ou interface
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
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Declara função auxiliar interna
function TemplateCard({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  template,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onUse,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  loading,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  template: GoalTemplate;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onUse: () => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  loading: boolean;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Retorna valor ou JSX para quem chamou
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
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >
      // Tag HTML na interface
      <div className="flex items-center gap-3">
        // Tag HTML na interface
        <div
          // Classes CSS Tailwind — controla aparência visual
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          style={{ backgroundColor: `${template.color}22`, color: template.color }}
        // Instrução do fluxo — parte da lógica de negócio ou interface
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
            // Instrução do fluxo — parte da lógica de negócio ou interface
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
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Exporta como padrão do módulo (import default)
export default function Goals() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [dialogOpen, setDialogOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [editGoal, setEditGoal] = useState<ApiGoal | null>(null);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [customName, setCustomName] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [customAmount, setCustomAmount] = useState("20000");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [customType, setCustomType] = useState<"limit" | "saving">("saving");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [customPeriod, setCustomPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [editName, setEditName] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [editAmount, setEditAmount] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [editPeriod, setEditPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly");

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data, isLoading } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["goals", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetGoals(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchOnWindowFocus: true,
  });

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: catRes } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["categories", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetCategories(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
  });
  // Constante local
  const categories = catRes?.categories ?? [];

  // Mutação na API (criar/editar/excluir)
  const createMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (payload: Parameters<typeof apiCreateGoal>[1]) => apiCreateGoal(token!, payload),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Exibe notificação temporária (toast) na tela
      toast.success("Meta criada!");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["goals"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setDialogOpen(false);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setCustomName("");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setCustomAmount("20000");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutação na API (criar/editar/excluir)
  const inactivateMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (id: string) => apiPatchGoal(token!, id, { isActive: false }),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Exibe notificação temporária (toast) na tela
      toast.success("Meta excluída (inativada)");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["goals"] });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutação na API (criar/editar/excluir)
  const updateMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof apiPatchGoal>[2] }) =>
      // Instrução do fluxo — parte da lógica de negócio ou interface
      apiPatchGoal(token!, id, body),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Exibe notificação temporária (toast) na tela
      toast.success("Meta atualizada — progresso recalculado");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["goals"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setEditGoal(null);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Constante local
  const createFromTemplate = (template: GoalTemplate) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    createMut.mutate({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      name: template.name,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      goalType: template.goalType,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      limitAmount: template.limitAmount,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      targetAmount: template.targetAmount ?? template.limitAmount,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      periodType: template.periodType,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      categoryId: findCategoryId(categories, template.categoryName),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      color: template.color,
    });
  };

  // Constante local
  const createCustom = (e: React.FormEvent) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    e.preventDefault();
    // Constante local
    const amount = Number(customAmount.replace(",", "."));
    // Condição — executa bloco só se verdadeira
    if (!customName.trim() || !Number.isFinite(amount) || amount <= 0) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Preencha nome e valor válidos (maior que zero)");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Instrução do fluxo — parte da lógica de negócio ou interface
    createMut.mutate({
      // Remove espaços no início/fim do texto
      name: customName.trim(),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      goalType: customType,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      limitAmount: amount,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      targetAmount: customType === "saving" ? amount : undefined,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      periodType: customPeriod,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      color: "#6366f1",
    });
  };

  // Constante local
  const openEdit = (goal: ApiGoal) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setEditGoal(goal);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setEditName(goal.name);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setEditAmount(String(goal.targetAmount ?? goal.limitAmount));
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setEditPeriod((goal.periodType as "monthly" | "quarterly" | "yearly") || "monthly");
  };

  // Constante local
  const saveEdit = (e: React.FormEvent) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    e.preventDefault();
    // Condição — executa bloco só se verdadeira
    if (!editGoal) return;
    // Constante local
    const amount = Number(editAmount.replace(",", "."));
    // Condição — executa bloco só se verdadeira
    if (!editName.trim() || !Number.isFinite(amount) || amount <= 0) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Nome e valor da meta são obrigatórios (valor > 0)");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Instrução do fluxo — parte da lógica de negócio ou interface
    updateMut.mutate({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      id: editGoal.id,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      body: {
        // Remove espaços no início/fim do texto
        name: editName.trim(),
        // Instrução do fluxo — parte da lógica de negócio ou interface
        limitAmount: amount,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        targetAmount: editGoal.goalType === "saving" ? amount : null,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        periodType: editPeriod,
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      },
    });
  };

  // Constante local
  const goals = (data?.goals ?? []).filter((g) => g.isActive);
  // Constante local
  const onTrack = goals.filter((g) => g.percentage < 90 && !g.exceeded).length;
  // Constante local
  const exceeded = goals.filter((g) => g.exceeded || g.percentage >= 100).length;

  // Retorna valor ou JSX para quem chamou
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
            // Instrução do fluxo — parte da lógica de negócio ou interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  id="goal-name"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  value={customName}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setCustomName(e.target.value)}
                  // Texto cinza de exemplo dentro do campo vazio
                  placeholder="Ex.: Faturamento mensal R$ 20.000"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  required
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div>
                // Elemento/componente React na tela
                <Label htmlFor="goal-amount">Valor (R$) *</Label>
                // Elemento/componente React na tela
                <Input
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  id="goal-amount"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  type="number"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  min={1}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  step={1}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  value={customAmount}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setCustomAmount(e.target.value)}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  required
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    key={t}
                    // Botão comum (não envia formulário)
                    type="button"
                    // Executa ação quando o usuário clica
                    onClick={() => setCustomType(t)}
                    // Classes CSS Tailwind — controla aparência visual
                    className={cn(
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      customType === t
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        ? "border-cgreen-500 bg-cgreen-500/10 text-cgreen-700 dark:text-cgreen-400"
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        : "border-border text-muted-foreground hover:bg-muted",
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    )}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  >
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {t === "limit" ? "Limite de gasto" : "Meta de ganhos"}
                  // Tag HTML na interface
                  </button>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                ))}
              // Tag HTML na interface
              </div>
              // Elemento/componente React na tela
              <Button type="submit" className="w-full bg-cgreen-500 hover:bg-cgreen-700" disabled={createMut.isPending}>
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
        // Instrução do fluxo — parte da lógica de negócio ou interface
        open={Boolean(editGoal)}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        onOpenChange={(v) => {
          // Condição — executa bloco só se verdadeira
          if (!v) setEditGoal(null);
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                id="edit-goal-amount"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                type="number"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                min={1}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                step={1}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={editAmount}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setEditAmount(e.target.value)}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                required
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Cancelar
              // Elemento/componente React na tela
              </Button>
              // Elemento/componente React na tela
              <Button type="submit" className="bg-cgreen-500 hover:bg-cgreen-700" disabled={updateMut.isPending}>
                // Instrução do fluxo — parte da lógica de negócio ou interface
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

      // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key={template.name}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                template={template}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                onUse={() => createFromTemplate(template)}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                loading={createMut.isPending}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ))}
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}

      // Instrução do fluxo — parte da lógica de negócio ou interface
      {goals.length > 0 && (
        // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key={goal.id}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                goal={goal}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                onEdit={() => openEdit(goal)}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                onInactivate={() => {
                  // Condição — executa bloco só se verdadeira
                  if (confirm(`Excluir a meta "${goal.name}"?`)) inactivateMut.mutate(goal.id);
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                }}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
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
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
