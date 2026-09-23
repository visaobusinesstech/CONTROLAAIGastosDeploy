/**
 * Indicador do dashboard: gastos do recorte atual × período anterior equivalente.
 *
 * Filtros: data (calendário), semana, mês, trimestre, semestre e ano.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { ArrowDownRight, ArrowUpRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  COMPARE_PERIOD_LABELS,
  COMPARE_PERIODS,
  COMPARE_PREVIOUS_CAPTION,
  type ComparePeriodKind,
  type ExpensePeriodComparison,
} from "@/lib/financial-summary";

function brl(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRange(from: Date, to: Date) {
  return `${format(from, "dd/MM", { locale: ptBR })} — ${format(to, "dd/MM/yyyy", { locale: ptBR })}`;
}

export function ExpensePeriodCompare({
  comparison,
  kind,
  currentRange,
  previousRange,
  onPeriodChange,
  loading,
}: {
  comparison: ExpensePeriodComparison;
  kind: ComparePeriodKind;
  currentRange: { from: Date; to: Date };
  previousRange: { from: Date; to: Date };
  onPeriodChange: (kind: ComparePeriodKind) => void;
  loading?: boolean;
}) {
  const spentMore = comparison.trend === "up";
  const spentLess = comparison.trend === "down";
  const max = Math.max(comparison.current, comparison.previous, 1);
  const caption = COMPARE_PREVIOUS_CAPTION[kind];
  const deltaAbs = Math.abs(comparison.delta);
  const HeadlineIcon = spentMore ? TrendingUp : spentLess ? TrendingDown : Minus;
  const TrendIcon = spentMore ? ArrowUpRight : spentLess ? ArrowDownRight : Minus;

  let headline = "Gastos iguais ao período anterior";
  if (comparison.percent == null && comparison.current > 0) {
    headline = "Sem gastos no período anterior para comparar";
  } else if (comparison.percent == null && comparison.current === 0) {
    headline = "Sem gastos neste recorte nem no anterior";
  } else if (spentMore) {
    headline = `Gastou ${comparison.percent}% a mais que o ${caption}`;
  } else if (spentLess) {
    headline = `Gastou ${Math.abs(comparison.percent ?? 0)}% a menos que o ${caption}`;
  }

  return (
    <section
      aria-label="Comparativo de gastos com o período anterior"
      className="rounded-xl border border-border/60 bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Gastos atuais × {caption}
          </p>
          <p className="text-2xl font-semibold tracking-tight tabular text-foreground">
            R$ {brl(comparison.current)}
          </p>
          <p className="text-sm text-muted-foreground">
            Recorte atual {formatRange(currentRange.from, currentRange.to)}
          </p>
        </div>
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-medium",
            spentMore && "bg-cred-light/80 text-cred-main dark:bg-red-900/20",
            spentLess && "bg-cgreen-500/15 text-cgreen-600 dark:text-cgreen-400",
            comparison.trend === "neutral" && "bg-muted/60 text-muted-foreground",
          )}
        >
          <HeadlineIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p>{headline}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-normal opacity-90">
              <TrendIcon className="h-3 w-3" aria-hidden />
              {comparison.delta === 0
                ? "Diferença R$ 0,00"
                : `${comparison.delta > 0 ? "+" : "−"} R$ ${brl(deltaAbs)} · anterior R$ ${brl(comparison.previous)}`}
            </p>
            <p className="text-xs font-normal opacity-80">
              {caption}: {formatRange(previousRange.from, previousRange.to)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Filtrar período</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro do comparativo de gastos">
          {COMPARE_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onPeriodChange(period)}
              aria-pressed={kind === period}
              className={cn(
                "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
                kind === period
                  ? "border-cgreen-500/40 bg-cgreen-500/15 text-cgreen-600 dark:text-cgreen-400"
                  : "border-border bg-muted/50 text-muted-foreground hover:border-cgreen-500/30 hover:bg-cgreen-500/10",
              )}
            >
              {COMPARE_PERIOD_LABELS[period]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3" aria-hidden={loading}>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Atual</span>
            <span className="tabular">R$ {brl(comparison.current)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", spentMore ? "bg-cred-main" : "bg-cgreen-500")}
              style={{ width: `${Math.min(100, (comparison.current / max) * 100)}%` }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{caption}</span>
            <span className="tabular">R$ {brl(comparison.previous)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground/40 transition-all"
              style={{ width: `${Math.min(100, (comparison.previous / max) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
