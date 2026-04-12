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
} from "lucide-react";

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

export function getCategoryIconComponent(name: string | null | undefined): LucideIcon {
  const key = (name ?? "circle").toLowerCase().trim();
  return ICONS[key] ?? Circle;
}
