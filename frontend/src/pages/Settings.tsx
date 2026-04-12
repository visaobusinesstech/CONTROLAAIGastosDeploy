import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Smartphone,
  LogOut,
  HelpCircle,
  Download,
  Tags,
} from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import {
  apiExportTransactionsCsv,
  apiGetCategories,
  apiGetSettings,
  apiPatchProfile,
  apiPatchSettings,
} from "@/lib/api";
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
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5 text-left transition-colors hover:bg-muted/60"
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]", iconBg)}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action ?? <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative flex h-[26px] w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-cgreen-500" : "bg-muted",
      )}
    >
      <div
        className={cn(
          "absolute top-[2px] h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function planLabel(plan: string) {
  const m: Record<string, string> = { free: "Free", pro: "Pro", premium: "Premium" };
  return m[plan] ?? plan;
}

function formatBrPhone(d: string) {
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return d;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [nameEdit, setNameEdit] = useState("");
  const [phoneEdit, setPhoneEdit] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings", token],
    queryFn: () => apiGetSettings(token!),
    enabled: !!token,
  });

  const { data: catData } = useQuery({
    queryKey: ["categories", token],
    queryFn: () => apiGetCategories(token!),
    enabled: !!token,
  });

  const patchSettingsMut = useMutation({
    mutationFn: (body: Parameters<typeof apiPatchSettings>[1]) => apiPatchSettings(token!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings", token] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const pref = settingsData?.settings?.themePreference;
    if (pref === "light" || pref === "dark" || pref === "system") {
      setTheme(pref);
    }
  }, [settingsData?.settings?.themePreference, setTheme]);

  const s = settingsData?.settings;

  const themeSubtitle = theme === "dark" ? "Escuro" : theme === "light" ? "Claro" : "Sistema";

  const cycleTheme = () => {
    let next: "light" | "dark" | "system";
    if (theme === "light") next = "dark";
    else if (theme === "dark") next = "system";
    else next = "light";
    setTheme(next);
    if (token) {
      patchSettingsMut.mutate({ themePreference: next });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const name = user?.name ?? "—";
  const email = user?.email ?? "—";
  const phone = user?.phone ? formatBrPhone(user.phone) : "Não informado";

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
      await apiPatchProfile(token, {
        name: nameEdit.trim() || undefined,
        phone: phoneEdit.trim() === "" ? null : digits.length >= 10 ? digits : undefined,
      });
      toast.success("Perfil atualizado.");
      setProfileOpen(false);
      await refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingProfile(false);
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
      toast.success("Exportação concluída.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na exportação");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-20 lg:pb-0">
      <h1 className="text-xl font-medium text-foreground">Configurações</h1>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-4 border-b border-border px-5 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cgreen-50 text-lg font-medium text-cgreen-700 dark:bg-cgreen-900/40 dark:text-cgreen-400">
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-foreground">{name}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Plano {user ? planLabel(user.plan) : "—"}</p>
          </div>
        </div>
        <SettingRow icon={User} iconBg="bg-cgreen-500" title="Editar perfil" subtitle="Nome e telefone" onClick={openProfile} />
        <SettingRow
          icon={Smartphone}
          iconBg="bg-[#AB47BC]"
          title="WhatsApp"
          subtitle={phone === "Não informado" ? "Cadastrado no registro" : `+55 ${phone}`}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notificações</p>
        </div>
        {settingsLoading ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <>
            <div className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-camber-main">
                <Bell size={16} className="text-white" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-base font-medium text-foreground">Alerta ao atingir 80%</p>
                <p className="text-sm text-muted-foreground">WhatsApp / e-mail (em breve)</p>
              </div>
              <Toggle
                checked={s?.alertAt80 ?? true}
                onChange={(v) => patchSettingsMut.mutate({ alertAt80: v })}
              />
            </div>
            <div className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-cred-main">
                <Bell size={16} className="text-white" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-base font-medium text-foreground">Alerta ao atingir 100%</p>
                <p className="text-sm text-muted-foreground">WhatsApp / e-mail (em breve)</p>
              </div>
              <Toggle
                checked={s?.alertAt100 ?? true}
                onChange={(v) => patchSettingsMut.mutate({ alertAt100: v })}
              />
            </div>
            <div className="flex w-full items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#42A5F5]">
                <Bell size={16} className="text-white" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-base font-medium text-foreground">Relatório semanal</p>
                <p className="text-sm text-muted-foreground">Resumo automático</p>
              </div>
              <Toggle
                checked={s?.weeklyReport ?? false}
                onChange={(v) => patchSettingsMut.mutate({ weeklyReport: v })}
              />
            </div>
          </>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Personalização</p>
        </div>
        <SettingRow
          icon={Palette}
          iconBg="bg-[#AB47BC]"
          title="Aparência"
          subtitle={themeSubtitle}
          onClick={cycleTheme}
        />
        <SettingRow
          icon={Tags}
          iconBg="bg-[#6366f1]"
          title="Categorias padrão"
          subtitle="Nomes e ícones do sistema"
          onClick={() => setCatOpen(true)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Privacidade e dados</p>
        </div>
        <SettingRow
          icon={Shield}
          iconBg="bg-zinc-800 dark:bg-zinc-700"
          title="Exportar transações"
          subtitle="CSV compatível com Excel"
          onClick={exportCsv}
          action={<Download size={16} className="text-muted-foreground" />}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <SettingRow
          icon={HelpCircle}
          iconBg="bg-muted-foreground/80"
          title="Ajuda e suporte"
          subtitle="suporte@controla.ai"
          onClick={() => window.open("mailto:suporte@controla.ai", "_blank")}
        />
        <SettingRow icon={LogOut} iconBg="bg-cred-main" title="Sair da conta" onClick={handleLogout} />
      </div>

      <div className="flex items-center justify-center py-4">
        <LogoFull />
      </div>
      <p className="text-center text-xs text-muted-foreground">Versão 1.0.0 · Controla.AI © 2026</p>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="p-name">Nome</Label>
              <Input id="p-name" value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-phone">Telefone (apenas números)</Label>
              <Input id="p-phone" value={phoneEdit} onChange={(e) => setPhoneEdit(e.target.value)} placeholder="11999990000" />
            </div>
            <p className="text-xs text-muted-foreground">E-mail: {email} (não editável nesta versão)</p>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setProfileOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="bg-cgreen-500 hover:bg-cgreen-700" disabled={savingProfile} onClick={saveProfile}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Categorias</DialogTitle>
          </DialogHeader>
          <ul className="space-y-2 py-2">
            {(catData?.categories ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                <CategoryIcon name={c.icon} size={18} className="text-foreground" />
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="ml-auto text-xs capitalize text-muted-foreground">{c.type}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" onClick={() => setCatOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
