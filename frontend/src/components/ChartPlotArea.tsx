/**
 * Caixa visual que envolve gráficos (Recharts) com fundo e bordas consistentes.
 *
 * Papel no sistema: Componente reutilizável do frontend — compõe páginas ou layout.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { cn } from "@/lib/utils";

/**
 * Container responsivo para gráficos — garante altura mínima e scroll horizontal no celular.
 * @param children — o gráfico Recharts que será desenhado dentro
 * @param className — classes extras opcionais (margem, altura, etc.)
 */
export function ChartPlotArea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full min-h-[220px] overflow-x-auto rounded-xl bg-white p-2 sm:p-3 ring-1 ring-black/[0.06] dark:bg-[#3A3A3C] dark:ring-white/[0.08]",
        className, // Mescla classes extras passadas pelo componente pai
      )}
    >
      {/* Div interna: reserva espaço mínimo para o gráfico não ficar espremido */}
      <div className="min-h-[200px] w-full min-w-0">{children}</div>
    </div>
  );
}
