import { NavLink, Outlet } from "react-router-dom";
import { LogoFull } from "./Logo";
import { LayoutDashboard, Target, MessageCircle, Settings, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/goals", icon: Target, label: "Metas" },
  { to: "/ai", icon: MessageCircle, label: "IA Chat" },
  { to: "/settings", icon: Settings, label: "Configurações" },
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

export default function Layout() {
  const { user } = useAuth();
  const displayName = user?.name ?? "Usuário";
  const displayPlan = user ? planLabel(user.plan) : "—";

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] bg-surface-card dark:bg-card border-r border-cgray-200 dark:border-cgray-800 fixed inset-y-0 left-0 z-30">
        <div className="p-6 pb-4">
          <LogoFull />
        </div>
        <nav className="flex-1 px-3 space-y-1">
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cgreen-50 dark:bg-cgreen-900/40 text-cgreen-700 dark:text-cgreen-400 flex items-center justify-center text-sm font-semibold">
              {initials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-cgray-900 dark:text-foreground truncate">{displayName}</p>
              <p className="text-xs text-cgray-400">Plano {displayPlan}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 lg:ml-[240px] flex flex-col min-h-screen">
        <header className="lg:hidden flex items-center justify-between px-5 py-4 bg-surface-card dark:bg-card border-b border-cgray-200 dark:border-cgray-800 sticky top-0 z-20">
          <LogoFull />
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-cgray-50 dark:bg-muted flex items-center justify-center"
            aria-label="Notificações"
          >
            <Bell size={18} className="text-cgray-600 dark:text-muted-foreground" />
          </button>
        </header>

        <main className="flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/80 dark:bg-card/90 backdrop-blur-xl border-t border-cgray-200 dark:border-cgray-800 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-[60px]">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                  isActive ? "text-cgreen-500" : "text-cgray-400 dark:text-muted-foreground"
                }`
              }
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
