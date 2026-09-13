/**
 * Layout principal — sidebar, navegação e outlet das páginas autenticadas.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect } from "react";
// Importa funções/componentes de react-router-dom
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom"; // Navegação e conteúdo filho
// Importa funções/componentes de ./Logo
import { LogoFull } from "./Logo"; // Marca Controla.AI
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  LayoutDashboard,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Target,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  MessageCircle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Settings,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Bell,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Smartphone,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ScrollText,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Users,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ClipboardList,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Shield,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "lucide-react";
// Importa funções/componentes de @/lib/utils
import { cn } from "@/lib/utils";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth"; // Dados do usuário logado
// Importa funções/componentes de @/hooks/use-capabilities
import { useCapabilities } from "@/hooks/use-capabilities"; // Flag isAdmin da API
// Importa funções/componentes de @/lib/admin
import { isAdminUser, userIsAdmin } from "@/lib/admin"; // Admin por e-mail ou accessLevel
// Importa funções/componentes de @/components/TrialCountdownBanner
import { TrialCountdownBanner } from "@/components/TrialCountdownBanner";

/** Itens de menu para todos os usuários autenticados. */
// Constante local
const baseNavItems = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/goals", icon: Target, label: "Metas" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/ai", icon: MessageCircle, label: "IA Chat" },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

// Constante local
const settingsNavItem = { to: "/settings", icon: Settings, label: "Configurações" };

/** Itens visíveis para staff (admin, operator, viewer) — sem Assinantes. */
// Constante local
const staffNavItems = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/admin/audit", icon: ClipboardList, label: "Auditoria" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/admin/lgpd", icon: Shield, label: "LGPD" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/admin/ai-logs", icon: ScrollText, label: "Logs IA" },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/** Exclusivo admin@admin.com — CRUD Assinantes. */
// Constante local
const systemAdminNavItems = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/admin/subscribers", icon: Users, label: "Assinantes" },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

/** Itens extras só para admin (WhatsApp Baileys). */
// Constante local
const adminOnlyNavItems = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { to: "/admin/whatsapp", icon: Smartphone, label: "WhatsApp" },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

// Declara função auxiliar interna
function initials(name: string) {
  // Constante local
  const p = name.trim().split(/\s+/).filter(Boolean);
  // Condição — executa bloco só se verdadeira
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  // Retorna valor ou JSX para quem chamou
  return name.slice(0, 2).toUpperCase() || "?";
}

// Declara função auxiliar interna
function planLabel(plan: string) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const m: Record<string, string> = { free: "Free", pro: "Pro", premium: "Premium" };
  // Retorna valor ou JSX para quem chamou
  return m[plan] ?? plan;
}

/** Rótulo curto para a barra inferior no mobile. */
// Declara função auxiliar interna
function mobileNavLabel(label: string) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const map: Record<string, string> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    Dashboard: "Início",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "IA Chat": "IA",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    Configurações: "Config",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    Assinantes: "Users",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    Auditoria: "Audit",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    LGPD: "LGPD",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "Logs IA": "Logs",
  };
  // Retorna valor ou JSX para quem chamou
  return map[label] ?? label.split(" ")[0];
}

// Exporta como padrão do módulo (import default)
export default function Layout() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { user } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: caps } = useCapabilities();
  // Constante local
  const location = useLocation();
  // Constante local
  const navigate = useNavigate();
  // Constante local
  const displayName = user?.name ?? "Usuário";
  // Constante local
  const displayPlan = user ? planLabel(user.plan) : "—";
  // Constante local
  const isSystemAdmin = isAdminUser(user?.email);
  // Admin por sessão (e-mail/accessLevel) — não depende do Railway capabilities
  const isAdmin = userIsAdmin(user) || Boolean(caps?.isAdmin);
  // Constante local
  const isStaff = Boolean(caps?.isStaff) || isAdmin;
  // Constante local
  const billingBlocked = caps?.billing && !caps.billing.hasAccess && !isStaff;
  // Constante local
  const onSettings = location.pathname === "/settings";
  // Constante local
  const navItems = [
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ...baseNavItems,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ...(isSystemAdmin ? systemAdminNavItems : []),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ...(isAdmin || isStaff ? staffNavItems : []),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ...(isAdmin ? adminOnlyNavItems : []),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    settingsNavItem,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ];
  // Constante local
  const isAiChat = location.pathname === "/ai";

  // Impede usuário comum de acessar URLs /admin/* via barra de endereço
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (user && !isStaff && location.pathname.startsWith("/admin")) {
      // Navega para outra página do app
      navigate("/", { replace: true });
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [user, isStaff, location.pathname, navigate]);

  // Assinantes: somente admin@admin.com
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (user && location.pathname.startsWith("/admin/subscribers") && !isSystemAdmin) {
      // Navega para outra página do app
      navigate("/", { replace: true });
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [user, isSystemAdmin, location.pathname, navigate]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (billingBlocked && !onSettings) {
      // Navega para outra página do app
      navigate("/settings#assinatura", { replace: true });
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [billingBlocked, onSettings, navigate]);

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="flex min-h-[100dvh] min-h-screen min-w-0 max-w-full bg-background overflow-x-hidden">
      {/* Sidebar desktop — navegação principal */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] bg-surface-card dark:bg-card border-r border-cgray-200 dark:border-cgray-800 fixed inset-y-0 left-0 z-30">
        // Tag HTML na interface
        <div className="p-6 pb-4">
          // Elemento/componente React na tela
          <Link to="/" className="inline-flex rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-cgreen-500" aria-label="Ir para o Dashboard">
            // Elemento/componente React na tela
            <LogoFull />
          // Elemento/componente React na tela
          </Link>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          // Percorre lista e renderiza um item para cada elemento
          {navItems.map((item) => (
            // Elemento/componente React na tela
            <NavLink
              // Instrução do fluxo — parte da lógica de negócio ou interface
              key={item.to}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              to={item.to}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              end={item.to === "/"}
              // Classes CSS Tailwind — controla aparência visual
              className={({ isActive }) =>
                // Instrução do fluxo — parte da lógica de negócio ou interface
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  isActive
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    ? "bg-cgreen-50 dark:bg-cgreen-900/30 text-cgreen-700 dark:text-cgreen-400 border-l-[3px] border-cgreen-500"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    : "text-cgray-600 dark:text-muted-foreground hover:bg-cgray-50 dark:hover:bg-muted hover:text-cgray-900 dark:hover:text-foreground"
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                }`
              }
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Tag HTML na interface
              <item.icon size={20} />
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {item.label}
            // Elemento/componente React na tela
            </NavLink>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ))}
        // Tag HTML na interface
        </nav>
        // Tag HTML na interface
        <div className="p-4 border-t border-cgray-200 dark:border-cgray-800">
          // Tag HTML na interface
          <button
            // Botão comum (não envia formulário)
            type="button"
            // Navega para outra página do app
            onClick={() => navigate("/settings#renda-mensal")}
            // Classes CSS Tailwind — controla aparência visual
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-cgray-50 dark:hover:bg-muted"
            // Texto acessível para leitores de tela
            aria-label="Abrir configurações e renda mensal"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Tag HTML na interface
            <div className="w-10 h-10 rounded-full bg-cgreen-50 dark:bg-cgreen-900/40 text-cgreen-700 dark:text-cgreen-400 flex items-center justify-center text-sm font-semibold">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {initials(displayName)}
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="flex-1 min-w-0">
              // Tag HTML na interface
              <p className="text-sm font-medium text-cgray-900 dark:text-foreground truncate">{displayName}</p>
              // Tag HTML na interface
              <p className="text-xs text-cgray-400">Plano {displayPlan}</p>
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </button>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </aside>

      // Tag HTML na interface
      <div className="flex min-w-0 flex-1 flex-col min-h-[100dvh] min-h-screen lg:ml-[240px]">
        {/* Cabeçalho mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-surface-card dark:bg-card border-b border-cgray-200 dark:border-cgray-800 sticky top-0 z-20 pt-[max(0.75rem,env(safe-area-inset-top))]">
          // Elemento/componente React na tela
          <Link to="/" className="inline-flex" aria-label="Ir para o Dashboard">
            // Elemento/componente React na tela
            <LogoFull />
          // Elemento/componente React na tela
          </Link>
          // Tag HTML na interface
          <button
            // Botão comum (não envia formulário)
            type="button"
            // Classes CSS Tailwind — controla aparência visual
            className="w-10 h-10 rounded-full bg-cgray-50 dark:bg-muted flex items-center justify-center"
            // Texto acessível para leitores de tela
            aria-label="Notificações"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Elemento/componente React na tela
            <Bell size={18} className="text-cgray-600 dark:text-muted-foreground" />
          // Tag HTML na interface
          </button>
        // Tag HTML na interface
        </header>

        // Elemento/componente React na tela
        <TrialCountdownBanner />

        {/* Área de conteúdo — chat IA ocupa altura total no mobile */}
        <main
          // Classes CSS Tailwind — controla aparência visual
          className={cn(
            // Instrução do fluxo — parte da lógica de negócio ou interface
            "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden max-w-full",
            // Instrução do fluxo — parte da lógica de negócio ou interface
            isAiChat ? "p-0 pb-0 lg:p-8 lg:pb-8" : "p-3 sm:p-5 lg:p-8 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-8",
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Elemento/componente React na tela
          <Outlet />
        // Tag HTML na interface
        </main>
      // Tag HTML na interface
      </div>

      {/* Barra de navegação inferior — mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/80 dark:bg-card/90 backdrop-blur-xl border-t border-cgray-200 dark:border-cgray-800 z-30 pb-[env(safe-area-inset-bottom)]">
        // Tag HTML na interface
        <div className="flex h-14 sm:h-[60px] items-center justify-around gap-0.5 overflow-x-auto px-1 sm:px-2 scrollbar-none">
          // Percorre lista e renderiza um item para cada elemento
          {navItems.map((item) => (
            // Elemento/componente React na tela
            <NavLink
              // Instrução do fluxo — parte da lógica de negócio ou interface
              key={item.to}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              to={item.to}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              end={item.to === "/"}
              // Classes CSS Tailwind — controla aparência visual
              className={({ isActive }) =>
                // Instrução do fluxo — parte da lógica de negócio ou interface
                cn(
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  "flex min-w-[56px] sm:min-w-[64px] flex-shrink-0 flex-col items-center justify-center gap-0.5 px-1.5 sm:px-2 text-[10px] sm:text-[11px] font-medium transition-colors",
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  isActive ? "text-cgreen-500" : "text-cgray-400 dark:text-muted-foreground",
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                )
              }
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Tag HTML na interface
              <item.icon size={20} className="sm:w-[22px] sm:h-[22px]" />
              // Tag HTML na interface
              <span className="max-w-[56px] sm:max-w-[64px] truncate">{mobileNavLabel(item.label)}</span>
            // Elemento/componente React na tela
            </NavLink>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ))}
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </nav>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
