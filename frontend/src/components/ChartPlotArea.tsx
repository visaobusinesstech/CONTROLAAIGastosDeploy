import { cn } from "@/lib/utils";

/** Área interna dos gráficos: branco no claro, cinza no escuro */
export function ChartPlotArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl bg-white p-3 ring-1 ring-black/[0.06] dark:bg-[#3A3A3C] dark:ring-white/[0.08]",
        className,
      )}
    >
      {children}
    </div>
  );
}
