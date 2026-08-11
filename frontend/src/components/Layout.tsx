/**
 * Layout principal — sidebar, navegação e outlet das páginas autenticadas.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom"; // Navegação e conteúdo filho
import { LogoFull } from "./Logo"; // Marca Controla.AI
import {
  LayoutDashboard,
  Target,
  MessageCircle,
  Settings,
  Bell,
  Smartphone,
  ScrollText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth"; // Dados do usuário logado
import { useCapabilities } from "@/hooks/use-capabilities"; // Flag isAdmin da API
import { isAdminUser } from "@/lib/admin"; // E-mail admin@admin.com
import { TrialCountdownBanner } from "@/components/TrialCountdownBanner";

/** Itens de menu para todos os usuários autenticados. */
const baseNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/goals", icon: Target, label: "Metas" },
  { to: "/ai", icon: MessageCircle, label: "IA Chat" },
];

const settingsNavItem = { to: "/settings", icon: Settings, label: "Configurações" };

/** Itens extras visíveis apenas para administradores. */
const adminNavItems = [
  { to: "/admin/subscribers", icon: Users, label: "Assinantes" },
  { to: "/admin/ai-logs", icon: ScrollText, label: "Logs IA" },
  { to: "/admin/whatsapp", icon: Smartphone, label: "WhatsApp" },
];

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function planLabel(plan: string) {
  const m: Record<string, string> = { free: "Free", pro: "Pro", premium: "Premium" };
  return m[plan] ?? plan;
}

/** Rótulo curto para a barra inferior no mobile. */
function mobileNavLabel(label: string) {
  const map: Record<string, string> = {
    Dashboard: "Início",
    "IA Chat": "IA",
    Configurações: "Config",
    "Logs IA": "Logs",
  };
  return map[label] ?? label.split(" ")[0];
}

export default function Layout() {
  const { user } = useAuth();
  const { data: caps } = useCapabilities();
  const location = useLocation();
  const navigate = useNavigate();
  const displayName = user?.name ?? "Usuário";
  const displayPlan = user ? planLabel(user.plan) : "—";
  const isAdmin = isAdminUser(user?.email) || caps?.isAdmin;
  const billingBlocked = caps?.billing && !caps.billing.hasAccess && !isAdmin;
  const onSettings = location.pathname === "/settings";
  const navItems = isAdmin
    ? [...baseNavItems, ...adminNavItems, settingsNavItem]
    : [...baseNavItems, settingsNavItem];
  const isAiChat = location.pathname === "/ai";

  // Impede usuário comum de acessar URLs /admin/* via barra de endereço
  useEffect(() => {
    if (user && !isAdmin && location.pathname.startsWith("/admin")) {
      navigate("/", { replace: true });
    }
  }, [user, isAdmin, location.pathname, navigate]);

  useEffect(() => {
    if (billingBlocked && !onSettings) {
      navigate("/settings#assinatura", { replace: true });
    }
  }, [billingBlocked, onSettings, navigate]);

  return (
    <div className="flex min-h-[100dvh] min-h-screen min-w-0 max-w-full bg-background overflow-x-hidden">
      {/* Sidebar desktop — navegação principal */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] bg-surface-card dark:bg-card border-r border-cgray-200 dark:border-cgray-800 fixed inset-y-0 left-0 z-30">
        <div className="p-6 pb-4">
          <Link to="/" className="inline-flex rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-cgreen-500" aria-label="Ir para o Dashboard">
            <LogoFull />
          </Link>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-cgreen-50 dark:bg-cgreen-900/30 text-cgreen-700 dark:text-cgreen-400 border-l-[3px] border-cgreen-500"
                    : "text-cgray-600 dark:text-muted-foreground hover:bg-cgray-50 dark:hover:bg-muted hover:text-cgray-900 dark:hover:text-foreground"
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-cgray-200 dark:border-cgray-800">
          <button
            type="button"
            onClick={() => navigate("/settings#renda-mensal")}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-cgray-50 dark:hover:bg-muted"
            aria-label="Abrir configurações e renda mensal"
          >
            <div className="w-10 h-10 rounded-full bg-cgreen-50 dark:bg-cgreen-900/40 text-cgreen-700 dark:text-cgreen-400 flex items-center justify-center text-sm font-semibold">
              {initials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cgray-900 dark:text-foreground truncate">{displayName}</p>
              <p className="text-xs text-cgray-400">Plano {displayPlan}</p>
            </div>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col min-h-[100dvh] min-h-screen lg:ml-[240px]">
        {/* Cabeçalho mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-surface-card dark:bg-card border-b border-cgray-200 dark:border-cgray-800 sticky top-0 z-20 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link to="/" className="inline-flex" aria-label="Ir para o Dashboard">
            <LogoFull />
          </Link>
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-cgray-50 dark:bg-muted flex items-center justify-center"
            aria-label="Notificações"
          >
            <Bell size={18} className="text-cgray-600 dark:text-muted-foreground" />
          </button>
        </header>

        <TrialCountdownBanner />

        {/* Área de conteúdo — chat IA ocupa altura total no mobile */}
        <main
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden max-w-full",
            isAiChat ? "p-0 pb-0 lg:p-8 lg:pb-8" : "p-3 sm:p-5 lg:p-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8",
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Barra de navegação inferior — mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/80 dark:bg-card/90 backdrop-blur-xl border-t border-cgray-200 dark:border-cgray-800 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-14 sm:h-[60px] items-center justify-around gap-0.5 overflow-x-auto px-1 sm:px-2 scrollbar-none">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-w-[56px] sm:min-w-[64px] flex-shrink-0 flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-medium transition-colors",
                  isActive ? "text-cgreen-500" : "text-cgray-400 dark:text-muted-foreground",
                )
              }
            >
              <item.icon size={20} className="sm:w-[22px] sm:h-[22px]" />
              <span className="max-w-[56px] sm:max-w-[64px] truncate">{mobileNavLabel(item.label)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
