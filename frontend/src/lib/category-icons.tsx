/**
 * Mapeamento categoria → ícone Lucide para listas e dashboard.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de lucide-react
import type { LucideIcon } from "lucide-react";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertOctagon,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertTriangle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  BarChart3,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  BookOpen,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Briefcase,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Car,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Circle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Coins,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Gamepad2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  HeartPulse,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Home,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Laptop,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Lightbulb,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  LineChart,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Package,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  PiggyBank,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Plane,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Shirt,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Smartphone,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Target,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  TrendingUp,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Tv,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Utensils,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "lucide-react"; // Ícones SVG usados nas categorias financeiras

/** Tabela nome do ícone (API) → componente Lucide. */
// Instrução do fluxo — parte da lógica de negócio ou interface
const ICONS: Record<string, LucideIcon> = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  utensils: Utensils,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  car: Car,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  home: Home,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "heart-pulse": HeartPulse,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "book-open": BookOpen,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "gamepad-2": Gamepad2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  shirt: Shirt,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  laptop: Laptop,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  smartphone: Smartphone,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  package: Package,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  briefcase: Briefcase,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  lightbulb: Lightbulb,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "trending-up": TrendingUp,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  coins: Coins,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "alert-triangle": AlertTriangle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  target: Target,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "bar-chart-3": BarChart3,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "alert-octagon": AlertOctagon,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "line-chart": LineChart,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  plane: Plane,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "piggy-bank": PiggyBank,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  tv: Tv,
};

/** Renderiza o ícone da categoria com fallback para círculo genérico. */
// Exporta função usada por outros arquivos
export function CategoryIcon({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  className,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  size = 18,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string | null | undefined;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  className?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  size?: number;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Constante local
  const key = (name ?? "circle").toLowerCase().trim();
  // Constante local
  const Icon = ICONS[key] ?? Circle;
  // Retorna valor ou JSX para quem chamou
  return <Icon className={className} size={size} strokeWidth={2} aria-hidden />;
}

/** Retorna o componente Lucide (sem JSX) para uso em listas dinâmicas. */
// Exporta função usada por outros arquivos
export function getCategoryIconComponent(name: string | null | undefined): LucideIcon {
  // Constante local
  const key = (name ?? "circle").toLowerCase().trim();
  // Retorna valor ou JSX para quem chamou
  return ICONS[key] ?? Circle;
}
