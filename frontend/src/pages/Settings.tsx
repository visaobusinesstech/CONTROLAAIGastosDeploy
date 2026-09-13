/**
 * Configurações do usuário — perfil, notificações, tema e exportação CSV.
 *
 * Papel no sistema: Página React Router — UI autenticada consumindo api.ts e auth.tsx.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes"; // Tema claro/escuro/sistema
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Bell,
  Shield,
  ShieldCheck,
  Palette,
  ChevronRight,
  Smartphone,
  LogOut,
  HelpCircle,
  Download,
  Tags,
  Wallet,
  CreditCard,
} from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import {
  apiExportTransactionsCsv,
  apiGetCategories,
  apiGetBudget,
  apiGetSettings,
  apiPatchProfile,
  apiPatchSettings,
  apiPutBudget,
  apiGetBillingStatus,
  apiPostBillingPortal,
  enableTwoFactorRequest,
  disableTwoFactorRequest,
  verifyTwoFactorRequest,
  isAuthChallenge,
  ApiError,
  translateApiError,
  type AuthChallengeResponse,
} from "@/lib/api";
import { EmailOtpStep } from "@/components/EmailOtpStep";
import { BillingPaywall } from "@/components/BillingPaywall";
import { BillingPlanCards } from "@/components/BillingPlanCards";
import { CategoryIcon } from "@/lib/category-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Declara função auxiliar interna
function SettingRow({
  icon: Icon,
  iconBg,
  title,
  subtitle,
  action,
  onClick,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    // Tag HTML na interface
    <button
      // Botão comum (não envia formulário)
      type="button"
      // Executa ação quando o usuário clica
      onClick={onClick}
      // Classes CSS Tailwind — controla aparência visual
      className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5 text-left transition-colors hover:bg-muted/60"
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
  );
}

// Declara função auxiliar interna
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    // Tag HTML na interface
    <button
      // Botão comum (não envia formulário)
      type="button"
      // Executa ação quando o usuário clica
      onClick={() => onChange(!checked)}
      // Classes CSS Tailwind — controla aparência visual
      className={cn(
        "relative flex h-[26px] w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-cgreen-500" : "bg-muted",
      )}
    >
      // Tag HTML na interface
      <div
        // Classes CSS Tailwind — controla aparência visual
        className={cn(
          "absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    // Tag HTML na interface
    </button>
  );
}

// Declara função auxiliar interna
function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

// Declara função auxiliar interna
function planLabel(plan: string) {
  const m: Record<string, string> = { free: "Free", pro: "Pro", premium: "Premium" };
  return m[plan] ?? plan;
}

// Declara função auxiliar interna
function formatBrPhone(d: string) {
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return d;
}

// Declara função auxiliar interna
function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Declara função auxiliar interna
function formatBrl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Declara função auxiliar interna
function incomeRecurrenceLabel(recurrence?: string | null) {
  const map: Record<string, string> = {
    monthly_fixed: "Fixa mensal",
    manual: "Manual / variável",
    weekly: "Semanal",
  };
  return recurrence ? (map[recurrence] ?? recurrence) : "Não informada";
}

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const incomeSectionRef = useRef<HTMLDivElement>(null);
  const billingSectionRef = useRef<HTMLDivElement>(null);
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { user, token, logout, refreshUser } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { theme, setTheme } = useTheme();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [incomeEdit, setIncomeEdit] = useState("");
  const [savingIncome, setSavingIncome] = useState(false);
  const [twoFaChallenge, setTwoFaChallenge] = useState<AuthChallengeResponse | null>(null);
  const [twoFaWaiting, setTwoFaWaiting] = useState(false); // Abre o modal na hora do clique
  const [twoFaSubmitting, setTwoFaSubmitting] = useState(false);
  const [twoFaError, setTwoFaError] = useState("");
  const currentMonth = monthKey();
  // GET /api/settings — alertas e preferências
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings", token],
    queryFn: () => apiGetSettings(token!),
    enabled: !!token,
  });
  // GET /api/categories — lista para modal de categorias
  const { data: catData } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => apiGetCategories(token!),
    enabled: !!token,
  });
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ["budget", token, currentMonth],
    queryFn: () => apiGetBudget(token!, currentMonth),
    enabled: !!token,
  });
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: billingData } = useQuery({
    queryKey: ["billing", token],
    queryFn: () => apiGetBillingStatus(token!),
    enabled: !!token,
  });
  // Mutação na API (criar/editar/excluir)
  const patchSettingsMut = useMutation({
    mutationFn: (body: Parameters<typeof apiPatchSettings>[1]) => apiPatchSettings(token!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings", token] });
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    const pref = settingsData?.settings?.themePreference;
    if (pref === "light" || pref === "dark" || pref === "system") {
      setTheme(pref);
    }
  }, [settingsData?.settings?.themePreference, setTheme]);
  const monthlyIncome = budgetData?.budget?.totalIncomeExpected ?? null;
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    if (monthlyIncome != null) {
      setIncomeEdit(String(monthlyIncome));
    } else {
      setIncomeEdit("");
    }
  }, [monthlyIncome]);
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    if (location.hash !== "#renda-mensal") return;
    const t = window.setTimeout(() => {
      incomeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [location.hash, budgetLoading, settingsLoading]);
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    if (location.hash !== "#assinatura") return;
    const t = window.setTimeout(() => {
      billingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [location.hash]);
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      // Exibe notificação temporária (toast) na tela
      toast.success("Assinatura ativada! Obrigado por assinar o Controla.ai.");
      void qc.invalidateQueries({ queryKey: ["billing"] });
      void qc.invalidateQueries({ queryKey: ["capabilities"] });
      void refreshUser();
    } else if (billing === "cancel") {
      // Exibe notificação temporária (toast) na tela
      toast.message("Checkout cancelado. Você pode assinar quando quiser.");
    }
  }, [searchParams, qc, refreshUser]);
  const s = settingsData?.settings;
  const themeSubtitle = theme === "dark" ? "Escuro" : theme === "light" ? "Claro" : "Sistema";
  const cycleTheme = () => {
    let next: "light" | "dark" | "system";
    if (theme === "light") next = "dark";
    // Senão, se outra condição…
    else if (theme === "dark") next = "system";
    // Senão — caminho alternativo
    else next = "light";
    setTheme(next);
    if (token) {
      patchSettingsMut.mutate({ themePreference: next });
    }
  };
  const handleLogout = () => {
    logout();
    qc.clear();
    // Navega para outra página do app
    navigate("/login");
  };
  const name = user?.name ?? "—";
  const email = user?.email ?? "—";
  const phone = user?.phone ? formatBrPhone(user.phone) : "Não informado";
  const incomeRecurrence = s?.incomeRecurrence ?? null;
  const incomePayDay = s?.incomePayDay ?? null;
  const incomePayWeekday = s?.incomePayWeekday ?? null;
  const payTimingLabel =
    incomeRecurrence === "monthly_fixed" && incomePayDay
      ? `Recebe todo dia ${incomePayDay}`
      : incomeRecurrence === "weekly" && incomePayWeekday != null
        ? `Recebe toda ${WEEKDAY_NAMES[incomePayWeekday]}`
        : null;
  const openProfile = () => {
    setNameEdit(user?.name ?? "");
    setPhoneEdit(user?.phone ? formatBrPhone(user.phone) : "");
    setProfileOpen(true);
  };
  const saveProfile = async () => {
    if (!token) return;
    setSavingProfile(true);
    try {
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
      setProfileOpen(false);
      // Aguarda resposta assíncrona (API, timer)
      await refreshUser();
    } catch (e) {
      // Exibe notificação temporária (toast) na tela
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingProfile(false);
    }
  };
  const saveIncome = async () => {
    if (!token) return;
    const normalized = incomeEdit.replace(/\./g, "").replace(",", ".").trim();
    const amount = Number(normalized);
    if (!normalized || Number.isNaN(amount) || amount <= 0) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Informe um valor válido de renda mensal.");
      return;
    }
    setSavingIncome(true);
    try {
      // Aguarda resposta assíncrona (API, timer)
      await apiPutBudget(token, {
        month: currentMonth,
        totalIncomeExpected: amount,
      });
      // Exibe notificação temporária (toast) na tela
      toast.success("Renda mensal atualizada.");
      void qc.invalidateQueries({ queryKey: ["budget", token, currentMonth] });
      void qc.invalidateQueries({ queryKey: ["transactions", token] });
      void qc.invalidateQueries({ queryKey: ["settings", token] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (e) {
      // Exibe notificação temporária (toast) na tela
      toast.error(e instanceof Error ? e.message : "Erro ao salvar renda");
    } finally {
      setSavingIncome(false);
    }
  };
  const startTwoFactorChange = async (enable: boolean) => {
    if (!token) return;
    setTwoFaError("");
    setTwoFaWaiting(true); // Modal abre sem esperar o Gmail
    setTwoFaSubmitting(true);
    try {
      const result = enable ? await enableTwoFactorRequest(token) : await disableTwoFactorRequest(token);
      if (isAuthChallenge(result)) {
        setTwoFaChallenge(result);
        setTwoFaWaiting(false);
        return;
      }
      setTwoFaWaiting(false);
      // Exibe notificação temporária (toast) na tela
      toast.success(result.twoFactorEnabled ? "Verificação em 2 etapas ativada." : "Verificação em 2 etapas desativada.");
      void qc.invalidateQueries({ queryKey: ["settings", token] });
    } catch (e) {
      setTwoFaWaiting(false);
      const msg =
        e instanceof ApiError
          ? translateApiError(e.message) || e.message || "Servidor indisponível. Tente de novo."
          : e instanceof Error
            ? e.message
            : "Não foi possível alterar o 2FA.";
      // Exibe notificação temporária (toast) na tela
      toast.error(msg || "Não foi possível alterar o 2FA.");
    } finally {
      setTwoFaSubmitting(false);
    }
  };
  const confirmTwoFactorCode = async (code: string) => {
    if (!twoFaChallenge) return;
    setTwoFaError("");
    setTwoFaSubmitting(true);
    try {
      const result = await verifyTwoFactorRequest({ challengeId: twoFaChallenge.challengeId, code });
      if ("twoFactorEnabled" in result) {
        // Exibe notificação temporária (toast) na tela
        toast.success(result.twoFactorEnabled ? "Verificação em 2 etapas ativada." : "Verificação em 2 etapas desativada.");
        setTwoFaChallenge(null);
        void qc.invalidateQueries({ queryKey: ["settings", token] });
        return;
      }
      setTwoFaError("Código confirmado. Atualize a página se o status não mudar.");
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? translateApiError(e.message) || e.message || "Código inválido."
          : e instanceof Error
            ? e.message
            : "Código inválido.";
      setTwoFaError(msg || "Código inválido.");
    } finally {
      setTwoFaSubmitting(false);
    }
  };
  const exportCsv = async () => {
    if (!token) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    try {
      const blob = await apiExportTransactionsCsv(token, { from: start.toISOString(), to: end.toISOString() });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "controla-transacoes.csv";
      a.click();
      URL.revokeObjectURL(url);
      // Exibe notificação temporária (toast) na tela
      toast.success("Exportação concluída.");
    } catch (e) {
      // Exibe notificação temporária (toast) na tela
      toast.error(e instanceof Error ? e.message : "Falha na exportação");
    }
  };
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
          icon={Smartphone}
          iconBg="bg-[#AB47BC]"
          title="WhatsApp"
          subtitle={phone === "Não informado" ? "Cadastrado no registro" : `+55 ${phone}`}
        />
      // Tag HTML na interface
      </div>
      {/* Assinatura e pagamento */}
      <div
        id="assinatura"
        ref={billingSectionRef}
        // Classes CSS Tailwind — controla aparência visual
        className="scroll-mt-24 space-y-4"
      >
        {billingData?.requiresPayment ? (
          // Elemento/componente React na tela
          <BillingPaywall />
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
                    {billingData?.reason === "subscription"
                      ? `Plano ${billingData.subscription?.interval === "yearly" ? "Anual" : "Mensal"} ativo`
                      : billingData?.reason === "trial"
                        ? `Trial gratuito · ${billingData.daysLeftInTrial ?? 0} dia(s) restantes`
                        : billingData?.reason === "grandfathered"
                          ? "Acesso vitalício (conta legada)"
                          : user
                            ? `Plano ${planLabel(user.plan)}`
                            : "Plano gratuito"}
                  // Tag HTML na interface
                  </p>
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground">
                    {billingData?.subscription?.currentPeriodEnd
                      // Cria objeto de data/hora
                      ? `Renova em ${new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}`
                      : billingData?.trialEndsAt
                        // Cria objeto de data/hora
                        ? `Trial até ${new Date(billingData.trialEndsAt).toLocaleDateString("pt-BR")}`
                        : "Sem cobrança no momento"}
                  // Tag HTML na interface
                  </p>
                // Tag HTML na interface
                </div>
              // Tag HTML na interface
              </div>
              {billingData?.reason === "subscription" && (
                // Elemento/componente React na tela
                <Button
                  // Botão comum (não envia formulário)
                  type="button"
                  variant="outline"
                  // Classes CSS Tailwind — controla aparência visual
                  className="w-full sm:w-auto"
                  // Executa ação quando o usuário clica
                  onClick={async () => {
                    try {
                      // Desestrutura valores do hook/contexto (acesso direto às variáveis)
                      const { url } = await apiPostBillingPortal(token!);
                      window.location.href = url;
                    } catch (e) {
                      // Exibe notificação temporária (toast) na tela
                      toast.error(e instanceof Error ? e.message : "Erro ao abrir portal");
                    }
                  }}
                >
                  Gerenciar pagamento
                // Elemento/componente React na tela
                </Button>
              )}
              {billingData?.reason === "trial" && token && billingData && (
                // Tag HTML na interface
                <div className="pt-2">
                  // Tag HTML na interface
                  <p className="mb-3 text-sm text-muted-foreground">
                    Antecipe sua assinatura ou aguarde o fim do trial. Pagamento com cartão via Stripe.
                  // Tag HTML na interface
                  </p>
                  // Elemento/componente React na tela
                  <BillingPlanCards billing={billingData} token={token} />
                // Tag HTML na interface
                </div>
              )}
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
        )}
      // Tag HTML na interface
      </div>
      {/* Seção renda mensal — valor informado via WhatsApp ou painel */}
      <div
        id="renda-mensal"
        ref={incomeSectionRef}
        // Classes CSS Tailwind — controla aparência visual
        className="scroll-mt-24 overflow-hidden rounded-xl border border-border bg-card ring-offset-background focus-within:ring-2 focus-within:ring-cgreen-500/40"
      >
        // Tag HTML na interface
        <div className="border-b border-border px-5 py-3">
          // Tag HTML na interface
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Renda mensal</p>
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="space-y-4 px-5 py-4">
          {budgetLoading ? (
            // Tag HTML na interface
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
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
                    {monthlyIncome != null ? formatBrl(monthlyIncome) : "Não informada"}
                  // Tag HTML na interface
                  </p>
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground">
                    Referência: {currentMonth.replace("-", "/")} · {incomeRecurrenceLabel(incomeRecurrence)}
                  // Tag HTML na interface
                  </p>
                  // Classes CSS Tailwind — controla aparência visual
                  {payTimingLabel && <p className="text-xs text-muted-foreground">{payTimingLabel}</p>}
                  {s?.initialBalance != null && (
                    // Tag HTML na interface
                    <p className="text-xs text-muted-foreground">
                      Saldo inicial: {formatBrl(s.initialBalance)}
                    // Tag HTML na interface
                    </p>
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
                    id="income-amount"
                    inputMode="decimal"
                    // Texto cinza de exemplo dentro do campo vazio
                    placeholder="Ex: 4500"
                    value={incomeEdit}
                    // Atualiza estado quando o usuário digita/seleciona
                    onChange={(e) => setIncomeEdit(e.target.value)}
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
                  >
                    Salvar renda
                  // Elemento/componente React na tela
                  </Button>
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <p className="text-xs text-muted-foreground">
                  Também pode informar pelo WhatsApp: &quot;Minha renda é 4500&quot; ou &quot;configurar renda&quot;.
                // Tag HTML na interface
                </p>
              // Tag HTML na interface
              </div>
            </>
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
        {settingsLoading ? (
          // Tag HTML na interface
          <p className="px-5 py-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
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
                checked={s?.alertAt80 ?? true}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(v) => patchSettingsMut.mutate({ alertAt80: v })}
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
                checked={s?.alertAt100 ?? true}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(v) => patchSettingsMut.mutate({ alertAt100: v })}
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
                checked={s?.weeklyReport ?? false}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(v) => patchSettingsMut.mutate({ weeklyReport: v })}
              />
            // Tag HTML na interface
            </div>
          </>
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
            checked={s?.twoFactorEnabled ?? false}
            // Atualiza estado quando o usuário digita/seleciona
            onChange={(v) => {
              if (twoFaSubmitting) return;
              void startTwoFactorChange(v);
            }}
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
          icon={Palette}
          iconBg="bg-[#AB47BC]"
          title="Aparência"
          subtitle={themeSubtitle}
          // Executa ação quando o usuário clica
          onClick={cycleTheme}
        />
        // Elemento/componente React na tela
        <SettingRow
          icon={Tags}
          iconBg="bg-[#6366f1]"
          title="Categorias padrão"
          subtitle="Nomes e ícones do sistema"
          // Executa ação quando o usuário clica
          onClick={() => setCatOpen(true)}
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
          icon={Shield}
          iconBg="bg-zinc-800 dark:bg-zinc-700"
          title="Exportar transações"
          subtitle="CSV compatível com Excel"
          // Executa ação quando o usuário clica
          onClick={exportCsv}
          // Classes CSS Tailwind — controla aparência visual
          action={<Download size={16} className="text-muted-foreground" />}
        />
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        // Elemento/componente React na tela
        <SettingRow
          icon={HelpCircle}
          iconBg="bg-muted-foreground/80"
          title="Ajuda e suporte"
          subtitle="suporte@controla.ai"
          // Executa ação quando o usuário clica
          onClick={() => window.open("mailto:suporte@controla.ai", "_blank")}
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
              Cancelar
            // Elemento/componente React na tela
            </Button>
            // Elemento/componente React na tela
            <Button type="button" className="bg-cgreen-500 hover:bg-cgreen-700" disabled={savingProfile} onClick={saveProfile}>
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
                key={c.id}
                // Classes CSS Tailwind — controla aparência visual
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
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
            ))}
          // Tag HTML na interface
          </ul>
          // Elemento/componente React na tela
          <DialogFooter>
            // Elemento/componente React na tela
            <Button type="button" onClick={() => setCatOpen(false)}>
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
        open={Boolean(twoFaChallenge) || twoFaWaiting}
        onOpenChange={(open) => {
          if (!open) {
            setTwoFaChallenge(null);
            setTwoFaWaiting(false);
          }
        }}
      >
        // Elemento/componente React na tela
        <DialogContent>
          // Elemento/componente React na tela
          <DialogHeader>
            // Elemento/componente React na tela
            <DialogTitle>Confirmação por e-mail</DialogTitle>
          // Elemento/componente React na tela
          </DialogHeader>
          {twoFaWaiting && !twoFaChallenge && (
            // Tag HTML na interface
            <p className="text-sm text-muted-foreground">Enviando o código para o seu e-mail…</p>
          )}
          {twoFaChallenge && (
            // Elemento/componente React na tela
            <EmailOtpStep
              challenge={twoFaChallenge}
              submitting={twoFaSubmitting}
              error={twoFaError}
              onChangeChallenge={(next) => {
                setTwoFaChallenge(next);
                setTwoFaWaiting(false);
              }}
              onCodeComplete={confirmTwoFactorCode}
            />
          )}
        // Elemento/componente React na tela
        </DialogContent>
      // Elemento/componente React na tela
      </Dialog>
    // Tag HTML na interface
    </div>
  );
}
