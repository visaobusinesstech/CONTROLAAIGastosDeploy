/**
 * Mapeamento categoria → ícone Lucide para listas e dashboard.
 *
 * Papel no sistema: Módulo backend Fastify — registrado ou importado por index.ts.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Briefcase,
  Car,
  Circle,
  Coins,
  Gamepad2,
  HeartPulse,
  Home,
  Laptop,
  Lightbulb,
  LineChart,
  Package,
  PiggyBank,
  Plane,
  Shirt,
  Smartphone,
  Target,
  TrendingUp,
  Tv,
  Utensils,
} from "lucide-react"; // Ícones SVG usados nas categorias financeiras

/** Tabela nome do ícone (API) → componente Lucide. */
const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
  "gamepad-2": Gamepad2,
  shirt: Shirt,
  laptop: Laptop,
  smartphone: Smartphone,
  package: Package,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  "trending-up": TrendingUp,
  coins: Coins,
  "alert-triangle": AlertTriangle,
  target: Target,
  "bar-chart-3": BarChart3,
  "alert-octagon": AlertOctagon,
  "line-chart": LineChart,
  plane: Plane,
  "piggy-bank": PiggyBank,
  tv: Tv,
};

/** Renderiza o ícone da categoria com fallback para círculo genérico. */
// Exporta função usada por outros arquivos
export function CategoryIcon({
  name,
  className,
  size = 18,
}: {
  name: string | null | undefined;
  className?: string;
  size?: number;
}) {
  const key = (name ?? "circle").toLowerCase().trim();
  const Icon = ICONS[key] ?? Circle;
  return <Icon className={className} size={size} strokeWidth={2} aria-hidden />;
}

/** Retorna o componente Lucide (sem JSX) para uso em listas dinâmicas. */
// Exporta função usada por outros arquivos
export function getCategoryIconComponent(name: string | null | undefined): LucideIcon {
  const key = (name ?? "circle").toLowerCase().trim();
  return ICONS[key] ?? Circle;
}
