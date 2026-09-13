/**
 * Configurações do usuário — perfil, notificações, tema e exportação CSV.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect, useRef, useState } from "react";
// Importa funções/componentes de react-router-dom
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
// Importa funções/componentes de next-themes
import { useTheme } from "next-themes"; // Tema claro/escuro/sistema
// Importa funções/componentes de @tanstack/react-query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Importa funções/componentes de sonner
import { toast } from "sonner";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  User,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Bell,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Shield,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ShieldCheck,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Palette,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ChevronRight,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Smartphone,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  LogOut,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  HelpCircle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Download,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Tags,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Wallet,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  CreditCard,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "lucide-react";
// Importa funções/componentes de @/components/Logo
import { LogoFull } from "@/components/Logo";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiExportTransactionsCsv,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetCategories,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetBudget,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetSettings,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPatchProfile,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPatchSettings,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPutBudget,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetBillingStatus,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPostBillingPortal,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  enableTwoFactorRequest,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  disableTwoFactorRequest,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  verifyTwoFactorRequest,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isAuthChallenge,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ApiError,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  translateApiError,
  // Define formato de dados (TypeScript)
  type AuthChallengeResponse,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/api";
// Importa funções/componentes de @/components/EmailOtpStep
import { EmailOtpStep } from "@/components/EmailOtpStep";
// Importa funções/componentes de @/components/BillingPaywall
import { BillingPaywall } from "@/components/BillingPaywall";
// Importa funções/componentes de @/components/BillingPlanCards
import { BillingPlanCards } from "@/components/BillingPlanCards";
// Importa funções/componentes de @/lib/category-icons
import { CategoryIcon } from "@/lib/category-icons";
// Importa funções/componentes de @/components/ui/button
import { Button } from "@/components/ui/button";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Dialog,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogContent,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogFooter,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogHeader,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogTitle,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/components/ui/dialog";
// Importa funções/componentes de @/components/ui/input
import { Input } from "@/components/ui/input";
// Importa funções/componentes de @/components/ui/label
import { Label } from "@/components/ui/label";
// Importa funções/componentes de @/lib/utils
import { cn } from "@/lib/utils";

// Declara função auxiliar interna
function SettingRow({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  icon: Icon,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  iconBg,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  title,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  subtitle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  action,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onClick,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  icon: React.ElementType;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  iconBg: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  title: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  subtitle?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  action?: React.ReactNode;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onClick?: () => void;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <button
      // Botão comum (não envia formulário)
      type="button"
      // Executa ação quando o usuário clica
      onClick={onClick}
      // Classes CSS Tailwind — controla aparência visual
      className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5 text-left transition-colors hover:bg-muted/60"
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >
      // Tag HTML na interface
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", iconBg)}>
        // Elemento/componente React na tela
        <Icon size={16} className="text-white" />
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="min-w-0 flex-1">
        // Tag HTML na interface
        <p className="text-base font-medium text-foreground">{title}</p>
        // Classes CSS Tailwind — controla aparência visual
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      // Tag HTML na interface
      </div>
      // Classes CSS Tailwind — controla aparência visual
      {action ?? <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
    // Tag HTML na interface
    </button>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

// Declara função auxiliar interna
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <button
      // Botão comum (não envia formulário)
      type="button"
      // Executa ação quando o usuário clica
      onClick={() => onChange(!checked)}
      // Classes CSS Tailwind — controla aparência visual
      className={cn(
        // Instrução do fluxo — parte da lógica de negócio ou interface
        "relative flex h-[26px] w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        // Instrução do fluxo — parte da lógica de negócio ou interface
        checked ? "bg-cgreen-500" : "bg-muted",
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >
      // Tag HTML na interface
      <div
        // Classes CSS Tailwind — controla aparência visual
        className={cn(
          // Instrução do fluxo — parte da lógica de negócio ou interface
          "absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200",
          // Instrução do fluxo — parte da lógica de negócio ou interface
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      />
    // Tag HTML na interface
    </button>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

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

// Declara função auxiliar interna
function formatBrPhone(d: string) {
  // Condição — executa bloco só se verdadeira
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  // Condição — executa bloco só se verdadeira
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  // Retorna valor ou JSX para quem chamou
  return d;
}

// Declara função auxiliar interna
function monthKey(d = new Date()) {
  // Retorna valor ou JSX para quem chamou
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Declara função auxiliar interna
function formatBrl(value: number) {
  // Retorna valor ou JSX para quem chamou
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Declara função auxiliar interna
function incomeRecurrenceLabel(recurrence?: string | null) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const map: Record<string, string> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    monthly_fixed: "Fixa mensal",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    manual: "Manual / variável",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    weekly: "Semanal",
  };
  // Retorna valor ou JSX para quem chamou
  return recurrence ? (map[recurrence] ?? recurrence) : "Não informada";
}

// Constante local
const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// Exporta como padrão do módulo (import default)
export default function SettingsPage() {
  // Constante local
  const navigate = useNavigate();
  // Constante local
  const location = useLocation();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [searchParams] = useSearchParams();
  // Constante local
  const incomeSectionRef = useRef<HTMLDivElement>(null);
  // Constante local
  const billingSectionRef = useRef<HTMLDivElement>(null);
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { user, token, logout, refreshUser } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { theme, setTheme } = useTheme();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [profileOpen, setProfileOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [catOpen, setCatOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [nameEdit, setNameEdit] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [phoneEdit, setPhoneEdit] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [savingProfile, setSavingProfile] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [incomeEdit, setIncomeEdit] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [savingIncome, setSavingIncome] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [twoFaChallenge, setTwoFaChallenge] = useState<AuthChallengeResponse | null>(null);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [twoFaWaiting, setTwoFaWaiting] = useState(false); // Abre o modal na hora do clique
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [twoFaSubmitting, setTwoFaSubmitting] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [twoFaError, setTwoFaError] = useState("");
  // Constante local
  const currentMonth = monthKey();

  // GET /api/settings — alertas e preferências
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["settings", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetSettings(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
  });

  // GET /api/categories — lista para modal de categorias
  const { data: catData } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["categories", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetCategories(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
  });

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["budget", token, currentMonth],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetBudget(token!, currentMonth),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
  });

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: billingData } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["billing", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetBillingStatus(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: !!token,
  });

  // Mutação na API (criar/editar/excluir)
  const patchSettingsMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (body: Parameters<typeof apiPatchSettings>[1]) => apiPatchSettings(token!, body),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["settings", token] });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Constante local
    const pref = settingsData?.settings?.themePreference;
    // Condição — executa bloco só se verdadeira
    if (pref === "light" || pref === "dark" || pref === "system") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setTheme(pref);
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [settingsData?.settings?.themePreference, setTheme]);

  // Constante local
  const monthlyIncome = budgetData?.budget?.totalIncomeExpected ?? null;

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (monthlyIncome != null) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setIncomeEdit(String(monthlyIncome));
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } else {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setIncomeEdit("");
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [monthlyIncome]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (location.hash !== "#renda-mensal") return;
    // Constante local
    const t = window.setTimeout(() => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      incomeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }, 120);
    // Retorna valor ou JSX para quem chamou
    return () => window.clearTimeout(t);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [location.hash, budgetLoading, settingsLoading]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (location.hash !== "#assinatura") return;
    // Constante local
    const t = window.setTimeout(() => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      billingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }, 120);
    // Retorna valor ou JSX para quem chamou
    return () => window.clearTimeout(t);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [location.hash]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Constante local
    const billing = searchParams.get("billing");
    // Condição — executa bloco só se verdadeira
    if (billing === "success") {
      // Exibe notificação temporária (toast) na tela
      toast.success("Assinatura ativada! Obrigado por assinar o Controla.ai.");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["billing"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["capabilities"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void refreshUser();
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } else if (billing === "cancel") {
      // Exibe notificação temporária (toast) na tela
      toast.message("Checkout cancelado. Você pode assinar quando quiser.");
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [searchParams, qc, refreshUser]);

  // Constante local
  const s = settingsData?.settings;

  // Constante local
  const themeSubtitle = theme === "dark" ? "Escuro" : theme === "light" ? "Claro" : "Sistema";

  // Constante local
  const cycleTheme = () => {
    // Variável mutável local
    let next: "light" | "dark" | "system";
    // Condição — executa bloco só se verdadeira
    if (theme === "light") next = "dark";
    // Senão, se outra condição…
    else if (theme === "dark") next = "system";
    // Senão — caminho alternativo
    else next = "light";
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setTheme(next);
    // Condição — executa bloco só se verdadeira
    if (token) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      patchSettingsMut.mutate({ themePreference: next });
    }
  };

  // Constante local
  const handleLogout = () => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    logout();
    // Instrução do fluxo — parte da lógica de negócio ou interface
    qc.clear();
    // Navega para outra página do app
    navigate("/login");
  };

  // Constante local
  const name = user?.name ?? "—";
  // Constante local
  const email = user?.email ?? "—";
  // Constante local
  const phone = user?.phone ? formatBrPhone(user.phone) : "Não informado";
  // Constante local
  const incomeRecurrence = s?.incomeRecurrence ?? null;
  // Constante local
  const incomePayDay = s?.incomePayDay ?? null;
  // Constante local
  const incomePayWeekday = s?.incomePayWeekday ?? null;
  // Constante local
  const payTimingLabel =
    // Instrução do fluxo — parte da lógica de negócio ou interface
    incomeRecurrence === "monthly_fixed" && incomePayDay
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ? `Recebe todo dia ${incomePayDay}`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      : incomeRecurrence === "weekly" && incomePayWeekday != null
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ? `Recebe toda ${WEEKDAY_NAMES[incomePayWeekday]}`
        // Instrução do fluxo — parte da lógica de negócio ou interface
        : null;

  // Constante local
  const openProfile = () => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setNameEdit(user?.name ?? "");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setPhoneEdit(user?.phone ? formatBrPhone(user.phone) : "");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setProfileOpen(true);
  };

  // Constante local
  const saveProfile = async () => {
    // Condição — executa bloco só se verdadeira
    if (!token) return;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setSavingProfile(true);
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const digits = phoneEdit.replace(/\D/g, "");
      // Aguarda resposta assíncrona (API, timer)
      await apiPatchProfile(token, {
        // Remove espaços no início/fim do texto
        name: nameEdit.trim() || undefined,
        // Remove espaços no início/fim do texto
        phone: phoneEdit.trim() === "" ? null : digits.length >= 10 ? digits : undefined,
      });
      // Exibe notificação temporária (toast) na tela
      toast.success("Perfil atualizado.");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setProfileOpen(false);
      // Aguarda resposta assíncrona (API, timer)
      await refreshUser();
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (e) {
      // Exibe notificação temporária (toast) na tela
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setSavingProfile(false);
    }
  };

  // Constante local
  const saveIncome = async () => {
    // Condição — executa bloco só se verdadeira
    if (!token) return;
    // Constante local
    const normalized = incomeEdit.replace(/\./g, "").replace(",", ".").trim();
    // Constante local
    const amount = Number(normalized);
    // Condição — executa bloco só se verdadeira
    if (!normalized || Number.isNaN(amount) || amount <= 0) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Informe um valor válido de renda mensal.");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setSavingIncome(true);
    // Tenta executar — erros vão para catch
    try {
      // Aguarda resposta assíncrona (API, timer)
      await apiPutBudget(token, {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        month: currentMonth,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        totalIncomeExpected: amount,
      });
      // Exibe notificação temporária (toast) na tela
      toast.success("Renda mensal atualizada.");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["budget", token, currentMonth] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["transactions", token] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["settings", token] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (e) {
      // Exibe notificação temporária (toast) na tela
      toast.error(e instanceof Error ? e.message : "Erro ao salvar renda");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setSavingIncome(false);
    }
  };

  // Constante local
  const startTwoFactorChange = async (enable: boolean) => {
    // Condição — executa bloco só se verdadeira
    if (!token) return;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setTwoFaError("");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setTwoFaWaiting(true); // Modal abre sem esperar o Gmail
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setTwoFaSubmitting(true);
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const result = enable ? await enableTwoFactorRequest(token) : await disableTwoFactorRequest(token);
      // Condição — executa bloco só se verdadeira
      if (isAuthChallenge(result)) {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setTwoFaChallenge(result);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setTwoFaWaiting(false);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setTwoFaWaiting(false);
      // Exibe notificação temporária (toast) na tela
      toast.success(result.twoFactorEnabled ? "Verificação em 2 etapas ativada." : "Verificação em 2 etapas desativada.");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["settings", token] });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (e) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setTwoFaWaiting(false);
      // Constante local
      const msg =
        // Instrução do fluxo — parte da lógica de negócio ou interface
        e instanceof ApiError
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? translateApiError(e.message) || e.message || "Servidor indisponível. Tente de novo."
          // Instrução do fluxo — parte da lógica de negócio ou interface
          : e instanceof Error
            // Instrução do fluxo — parte da lógica de negócio ou interface
            ? e.message
            // Instrução do fluxo — parte da lógica de negócio ou interface
            : "Não foi possível alterar o 2FA.";
      // Exibe notificação temporária (toast) na tela
      toast.error(msg || "Não foi possível alterar o 2FA.");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setTwoFaSubmitting(false);
    }
  };

  // Constante local
  const confirmTwoFactorCode = async (code: string) => {
    // Condição — executa bloco só se verdadeira
    if (!twoFaChallenge) return;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setTwoFaError("");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setTwoFaSubmitting(true);
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const result = await verifyTwoFactorRequest({ challengeId: twoFaChallenge.challengeId, code });
      // Condição — executa bloco só se verdadeira
      if ("twoFactorEnabled" in result) {
        // Exibe notificação temporária (toast) na tela
        toast.success(result.twoFactorEnabled ? "Verificação em 2 etapas ativada." : "Verificação em 2 etapas desativada.");
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setTwoFaChallenge(null);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        void qc.invalidateQueries({ queryKey: ["settings", token] });
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setTwoFaError("Código confirmado. Atualize a página se o status não mudar.");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (e) {
      // Constante local
      const msg =
        // Instrução do fluxo — parte da lógica de negócio ou interface
        e instanceof ApiError
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? translateApiError(e.message) || e.message || "Código inválido."
          // Instrução do fluxo — parte da lógica de negócio ou interface
          : e instanceof Error
            // Instrução do fluxo — parte da lógica de negócio ou interface
            ? e.message
            // Instrução do fluxo — parte da lógica de negócio ou interface
            : "Código inválido.";
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setTwoFaError(msg || "Código inválido.");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setTwoFaSubmitting(false);
    }
  };

  // Constante local
  const exportCsv = async () => {
    // Condição — executa bloco só se verdadeira
    if (!token) return;
    // Constante local
    const now = new Date();
    // Constante local
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    // Constante local
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const blob = await apiExportTransactionsCsv(token, { from: start.toISOString(), to: end.toISOString() });
      // Constante local
      const url = URL.createObjectURL(blob);
      // Constante local
      const a = document.createElement("a");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      a.href = url;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      a.download = "controla-transacoes.csv";
      // Instrução do fluxo — parte da lógica de negócio ou interface
      a.click();
      // Instrução do fluxo — parte da lógica de negócio ou interface
      URL.revokeObjectURL(url);
      // Exibe notificação temporária (toast) na tela
      toast.success("Exportação concluída.");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (e) {
      // Exibe notificação temporária (toast) na tela
      toast.error(e instanceof Error ? e.message : "Falha na exportação");
    }
  };

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="mx-auto w-full max-w-2xl min-w-0 space-y-6">
      // Tag HTML na interface
      <h1 className="text-xl font-medium text-foreground">Configurações</h1>

      {/* Seção perfil — avatar, nome, e-mail e WhatsApp */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        // Tag HTML na interface
        <div className="flex items-center gap-4 border-b border-border px-5 py-4">
          // Tag HTML na interface
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cgreen-50 text-lg font-medium text-cgreen-700 dark:bg-cgreen-900/40 dark:text-cgreen-400">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {initials(name)}
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="min-w-0 flex-1">
            // Tag HTML na interface
            <p className="truncate text-base font-medium text-foreground">{name}</p>
            // Tag HTML na interface
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            // Tag HTML na interface
            <p className="mt-0.5 text-xs text-muted-foreground">Plano {user ? planLabel(user.plan) : "—"}</p>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <SettingRow icon={User} iconBg="bg-cgreen-500" title="Editar perfil" subtitle="Nome e telefone" onClick={openProfile} />
        // Elemento/componente React na tela
        <SettingRow
          // Instrução do fluxo — parte da lógica de negócio ou interface
          icon={Smartphone}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          iconBg="bg-[#AB47BC]"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          title="WhatsApp"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          subtitle={phone === "Não informado" ? "Cadastrado no registro" : `+55 ${phone}`}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
      // Tag HTML na interface
      </div>

      {/* Assinatura e pagamento */}
      <div
        // Instrução do fluxo — parte da lógica de negócio ou interface
        id="assinatura"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ref={billingSectionRef}
        // Classes CSS Tailwind — controla aparência visual
        className="scroll-mt-24 space-y-4"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {billingData?.requiresPayment ? (
          // Elemento/componente React na tela
          <BillingPaywall />
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        ) : (
          // Tag HTML na interface
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            // Tag HTML na interface
            <div className="border-b border-border px-5 py-3">
              // Tag HTML na interface
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Assinatura</p>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="px-5 py-4 space-y-3">
              // Tag HTML na interface
              <div className="flex items-start gap-3">
                // Tag HTML na interface
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-cgreen-500">
                  // Elemento/componente React na tela
                  <CreditCard size={18} className="text-white" />
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <div className="min-w-0 flex-1">
                  // Tag HTML na interface
                  <p className="text-base font-medium text-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {billingData?.reason === "subscription"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      ? `Plano ${billingData.subscription?.interval === "yearly" ? "Anual" : "Mensal"} ativo`
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      : billingData?.reason === "trial"
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        ? `Trial gratuito · ${billingData.daysLeftInTrial ?? 0} dia(s) restantes`
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        : billingData?.reason === "grandfathered"
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          ? "Acesso vitalício (conta legada)"
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          : user
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            ? `Plano ${planLabel(user.plan)}`
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            : "Plano gratuito"}
                  // Tag HTML na interface
                  </p>
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {billingData?.subscription?.currentPeriodEnd
                      // Cria objeto de data/hora
                      ? `Renova em ${new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}`
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      : billingData?.trialEndsAt
                        // Cria objeto de data/hora
                        ? `Trial até ${new Date(billingData.trialEndsAt).toLocaleDateString("pt-BR")}`
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        : "Sem cobrança no momento"}
                  // Tag HTML na interface
                  </p>
                // Tag HTML na interface
                </div>
              // Tag HTML na interface
              </div>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {billingData?.reason === "subscription" && (
                // Elemento/componente React na tela
                <Button
                  // Botão comum (não envia formulário)
                  type="button"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  variant="outline"
                  // Classes CSS Tailwind — controla aparência visual
                  className="w-full sm:w-auto"
                  // Executa ação quando o usuário clica
                  onClick={async () => {
                    // Tenta executar — erros vão para catch
                    try {
                      // Desestrutura valores do hook/contexto (acesso direto às variáveis)
                      const { url } = await apiPostBillingPortal(token!);
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      window.location.href = url;
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    } catch (e) {
                      // Exibe notificação temporária (toast) na tela
                      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
                    }
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Gerenciar pagamento
                // Elemento/componente React na tela
                </Button>
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              )}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {billingData?.reason === "trial" && token && billingData && (
                // Tag HTML na interface
                <div className="pt-2">
                  // Tag HTML na interface
                  <p className="mb-3 text-sm text-muted-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Antecipe sua assinatura ou aguarde o fim do trial. Pagamento com cartão via Stripe.
                  // Tag HTML na interface
                  </p>
                  // Elemento/componente React na tela
                  <BillingPlanCards billing={billingData} token={token} />
                // Tag HTML na interface
                </div>
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              )}
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
      // Tag HTML na interface
      </div>

      {/* Seção renda mensal — valor informado via WhatsApp ou painel */}
      <div
        // Instrução do fluxo — parte da lógica de negócio ou interface
        id="renda-mensal"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ref={incomeSectionRef}
        // Classes CSS Tailwind — controla aparência visual
        className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card ring-offset-background focus-within:ring-2 focus-within:ring-cgreen-500/40"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Tag HTML na interface
        <div className="border-b border-border px-5 py-3">
          // Tag HTML na interface
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Renda mensal</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="space-y-4 px-5 py-4">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {budgetLoading ? (
            // Tag HTML na interface
            <p className="text-sm text-muted-foreground">Carregando…</p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ) : (
            // Instrução do fluxo — parte da lógica de negócio ou interface
            <>
              // Tag HTML na interface
              <div className="flex items-start gap-3">
                // Tag HTML na interface
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-cgreen-500">
                  // Elemento/componente React na tela
                  <Wallet size={18} className="text-white" />
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <div className="min-w-0 flex-1">
                  // Tag HTML na interface
                  <p className="text-base font-medium text-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {monthlyIncome != null ? formatBrl(monthlyIncome) : "Não informada"}
                  // Tag HTML na interface
                  </p>
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Referência: {currentMonth.replace("-", "/")} · {incomeRecurrenceLabel(incomeRecurrence)}
                  // Tag HTML na interface
                  </p>
                  // Classes CSS Tailwind — controla aparência visual
                  {payTimingLabel && <p className="text-xs text-muted-foreground">{payTimingLabel}</p>}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  {s?.initialBalance != null && (
                    // Tag HTML na interface
                    <p className="text-xs text-muted-foreground">
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      Saldo inicial: {formatBrl(s.initialBalance)}
                    // Tag HTML na interface
                    </p>
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  )}
                // Tag HTML na interface
                </div>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="grid gap-2">
                // Elemento/componente React na tela
                <Label htmlFor="income-amount">Atualizar renda mensal (R$)</Label>
                // Tag HTML na interface
                <div className="flex flex-col gap-2 sm:flex-row">
                  // Elemento/componente React na tela
                  <Input
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    id="income-amount"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    inputMode="decimal"
                    // Texto cinza de exemplo dentro do campo vazio
                    placeholder="Ex: 4500"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    value={incomeEdit}
                    // Atualiza estado quando o usuário digita/seleciona
                    onChange={(e) => setIncomeEdit(e.target.value)}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  />
                  // Elemento/componente React na tela
                  <Button
                    // Botão comum (não envia formulário)
                    type="button"
                    // Classes CSS Tailwind — controla aparência visual
                    className="shrink-0 bg-cgreen-500 hover:bg-cgreen-700"
                    // Desabilita botão/campo (ex.: durante envio)
                    disabled={savingIncome}
                    // Executa ação quando o usuário clica
                    onClick={saveIncome}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  >
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Salvar renda
                  // Elemento/componente React na tela
                  </Button>
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <p className="text-xs text-muted-foreground">
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Também pode informar pelo WhatsApp: &quot;Minha renda é 4500&quot; ou &quot;configurar renda&quot;.
                // Tag HTML na interface
                </p>
              // Tag HTML na interface
              </div>
            // Instrução do fluxo — parte da lógica de negócio ou interface
            </>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        // Tag HTML na interface
        <div className="border-b border-border px-5 py-3">
          // Tag HTML na interface
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notificações</p>
        // Tag HTML na interface
        </div>
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {settingsLoading ? (
          // Tag HTML na interface
          <p className="px-5 py-4 text-sm text-muted-foreground">Carregando…</p>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        ) : (
          // Instrução do fluxo — parte da lógica de negócio ou interface
          <>
            // Tag HTML na interface
            <div className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              // Tag HTML na interface
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-camber-main">
                // Elemento/componente React na tela
                <Bell size={16} className="text-white" />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="min-w-0 flex-1 text-left">
                // Tag HTML na interface
                <p className="text-base font-medium text-foreground">Alerta ao atingir 80%</p>
                // Tag HTML na interface
                <p className="text-sm text-muted-foreground">WhatsApp / e-mail (em breve)</p>
              // Tag HTML na interface
              </div>
              // Elemento/componente React na tela
              <Toggle
                // Instrução do fluxo — parte da lógica de negócio ou interface
                checked={s?.alertAt80 ?? true}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(v) => patchSettingsMut.mutate({ alertAt80: v })}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              // Tag HTML na interface
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-cred-main">
                // Elemento/componente React na tela
                <Bell size={16} className="text-white" />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="min-w-0 flex-1 text-left">
                // Tag HTML na interface
                <p className="text-base font-medium text-foreground">Alerta ao atingir 100%</p>
                // Tag HTML na interface
                <p className="text-sm text-muted-foreground">WhatsApp / e-mail (em breve)</p>
              // Tag HTML na interface
              </div>
              // Elemento/componente React na tela
              <Toggle
                // Instrução do fluxo — parte da lógica de negócio ou interface
                checked={s?.alertAt100 ?? true}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(v) => patchSettingsMut.mutate({ alertAt100: v })}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              // Tag HTML na interface
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#42A5F5]">
                // Elemento/componente React na tela
                <Bell size={16} className="text-white" />
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="min-w-0 flex-1 text-left">
                // Tag HTML na interface
                <p className="text-base font-medium text-foreground">Relatório semanal</p>
                // Tag HTML na interface
                <p className="text-sm text-muted-foreground">Resumo automático</p>
              // Tag HTML na interface
              </div>
              // Elemento/componente React na tela
              <Toggle
                // Instrução do fluxo — parte da lógica de negócio ou interface
                checked={s?.weeklyReport ?? false}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(v) => patchSettingsMut.mutate({ weeklyReport: v })}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </div>
          // Instrução do fluxo — parte da lógica de negócio ou interface
          </>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        // Tag HTML na interface
        <div className="border-b border-border px-5 py-3">
          // Tag HTML na interface
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Segurança</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="flex w-full items-center gap-3 bg-card px-5 py-3.5">
          // Tag HTML na interface
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-cgreen-500">
            // Elemento/componente React na tela
            <ShieldCheck size={16} className="text-white" />
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="min-w-0 flex-1 text-left">
            // Tag HTML na interface
            <p className="text-base font-medium text-foreground">Verificação em 2 etapas</p>
            // Tag HTML na interface
            <p className="text-sm text-muted-foreground">Código por e-mail após a senha no login</p>
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <Toggle
            // Instrução do fluxo — parte da lógica de negócio ou interface
            checked={s?.twoFactorEnabled ?? false}
            // Atualiza estado quando o usuário digita/seleciona
            onChange={(v) => {
              // Condição — executa bloco só se verdadeira
              if (twoFaSubmitting) return;
              // Instrução do fluxo — parte da lógica de negócio ou interface
              void startTwoFactorChange(v);
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          />
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        // Tag HTML na interface
        <div className="border-b border-border px-5 py-3">
          // Tag HTML na interface
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Personalização</p>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <SettingRow
          // Instrução do fluxo — parte da lógica de negócio ou interface
          icon={Palette}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          iconBg="bg-[#AB47BC]"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          title="Aparência"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          subtitle={themeSubtitle}
          // Executa ação quando o usuário clica
          onClick={cycleTheme}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Elemento/componente React na tela
        <SettingRow
          // Instrução do fluxo — parte da lógica de negócio ou interface
          icon={Tags}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          iconBg="bg-[#6366f1]"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          title="Categorias padrão"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          subtitle="Nomes e ícones do sistema"
          // Executa ação quando o usuário clica
          onClick={() => setCatOpen(true)}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        // Tag HTML na interface
        <div className="border-b border-border px-5 py-3">
          // Tag HTML na interface
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Privacidade e dados</p>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <SettingRow
          // Instrução do fluxo — parte da lógica de negócio ou interface
          icon={Shield}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          iconBg="bg-zinc-800 dark:bg-zinc-700"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          title="Exportar transações"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          subtitle="CSV compatível com Excel"
          // Executa ação quando o usuário clica
          onClick={exportCsv}
          // Classes CSS Tailwind — controla aparência visual
          action={<Download size={16} className="text-muted-foreground" />}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        // Elemento/componente React na tela
        <SettingRow
          // Instrução do fluxo — parte da lógica de negócio ou interface
          icon={HelpCircle}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          iconBg="bg-muted-foreground/80"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          title="Ajuda e suporte"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          subtitle="suporte@controla.ai"
          // Executa ação quando o usuário clica
          onClick={() => window.open("mailto:suporte@controla.ai", "_blank")}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        />
        // Elemento/componente React na tela
        <SettingRow icon={LogOut} iconBg="bg-cred-main" title="Sair da conta" onClick={handleLogout} />
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="flex items-center justify-center py-4">
        // Elemento/componente React na tela
        <LogoFull />
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <p className="text-center text-xs text-muted-foreground">Versão 1.0.0 · Controla.AI © 2026</p>

      // Elemento/componente React na tela
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        // Elemento/componente React na tela
        <DialogContent>
          // Elemento/componente React na tela
          <DialogHeader>
            // Elemento/componente React na tela
            <DialogTitle>Editar perfil</DialogTitle>
          // Elemento/componente React na tela
          </DialogHeader>
          // Tag HTML na interface
          <div className="grid gap-3 py-2">
            // Tag HTML na interface
            <div className="grid gap-2">
              // Elemento/componente React na tela
              <Label htmlFor="p-name">Nome</Label>
              // Elemento/componente React na tela
              <Input id="p-name" value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="grid gap-2">
              // Elemento/componente React na tela
              <Label htmlFor="p-phone">Telefone (apenas números)</Label>
              // Elemento/componente React na tela
              <Input id="p-phone" value={phoneEdit} onChange={(e) => setPhoneEdit(e.target.value)} placeholder="11999990000" />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <p className="text-xs text-muted-foreground">E-mail: {email} (não editável nesta versão)</p>
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <DialogFooter>
            // Elemento/componente React na tela
            <Button variant="outline" type="button" onClick={() => setProfileOpen(false)}>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Cancelar
            // Elemento/componente React na tela
            </Button>
            // Elemento/componente React na tela
            <Button type="button" className="bg-cgreen-500 hover:bg-cgreen-700" disabled={savingProfile} onClick={saveProfile}>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Salvar
            // Elemento/componente React na tela
            </Button>
          // Elemento/componente React na tela
          </DialogFooter>
        // Elemento/componente React na tela
        </DialogContent>
      // Elemento/componente React na tela
      </Dialog>

      // Elemento/componente React na tela
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        // Elemento/componente React na tela
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          // Elemento/componente React na tela
          <DialogHeader>
            // Elemento/componente React na tela
            <DialogTitle>Categorias</DialogTitle>
          // Elemento/componente React na tela
          </DialogHeader>
          // Tag HTML na interface
          <ul className="space-y-2 py-2">
            // Percorre lista e renderiza um item para cada elemento
            {(catData?.categories ?? []).map((c) => (
              // Tag HTML na interface
              <li
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key={c.id}
                // Classes CSS Tailwind — controla aparência visual
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Tag HTML na interface
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                // Elemento/componente React na tela
                <CategoryIcon name={c.icon} size={18} className="text-foreground" />
                // Tag HTML na interface
                <span className="font-medium text-foreground">{c.name}</span>
                // Tag HTML na interface
                <span className="ml-auto text-xs capitalize text-muted-foreground">{c.type}</span>
              // Tag HTML na interface
              </li>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ))}
          // Tag HTML na interface
          </ul>
          // Elemento/componente React na tela
          <DialogFooter>
            // Elemento/componente React na tela
            <Button type="button" onClick={() => setCatOpen(false)}>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Fechar
            // Elemento/componente React na tela
            </Button>
          // Elemento/componente React na tela
          </DialogFooter>
        // Elemento/componente React na tela
        </DialogContent>
      // Elemento/componente React na tela
      </Dialog>

      // Elemento/componente React na tela
      <Dialog
        // Instrução do fluxo — parte da lógica de negócio ou interface
        open={Boolean(twoFaChallenge) || twoFaWaiting}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        onOpenChange={(open) => {
          // Condição — executa bloco só se verdadeira
          if (!open) {
            // Instrução do fluxo — parte da lógica de negócio ou interface
            setTwoFaChallenge(null);
            // Instrução do fluxo — parte da lógica de negócio ou interface
            setTwoFaWaiting(false);
          }
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        }}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Elemento/componente React na tela
        <DialogContent>
          // Elemento/componente React na tela
          <DialogHeader>
            // Elemento/componente React na tela
            <DialogTitle>Confirmação por e-mail</DialogTitle>
          // Elemento/componente React na tela
          </DialogHeader>
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {twoFaWaiting && !twoFaChallenge && (
            // Tag HTML na interface
            <p className="text-sm text-muted-foreground">Enviando o código para o seu e-mail…</p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {twoFaChallenge && (
            // Elemento/componente React na tela
            <EmailOtpStep
              // Instrução do fluxo — parte da lógica de negócio ou interface
              challenge={twoFaChallenge}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              submitting={twoFaSubmitting}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              error={twoFaError}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              onChangeChallenge={(next) => {
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setTwoFaChallenge(next);
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setTwoFaWaiting(false);
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              }}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              onCodeComplete={confirmTwoFactorCode}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            />
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
        // Elemento/componente React na tela
        </DialogContent>
      // Elemento/componente React na tela
      </Dialog>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
