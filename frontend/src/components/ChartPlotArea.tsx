/**
 * Área interna dos gráficos Recharts — fundo branco (claro) ou cinza (escuro).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { cn } from "@/lib/utils";

/** Container com padding e altura mínima para gráficos responsivos no mobile. */
export function ChartPlotArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full min-h-[220px] overflow-x-auto rounded-xl bg-white p-2 sm:p-3 ring-1 ring-black/[0.06] dark:bg-[#3A3A3C] dark:ring-white/[0.08]",
        className,
      )}
    >
      <div className="min-h-[200px] w-full min-w-0">{children}</div>
    </div>
  );
}
