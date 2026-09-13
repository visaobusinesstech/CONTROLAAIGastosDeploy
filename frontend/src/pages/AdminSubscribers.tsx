/**
 * Central admin — Assinantes: listar, adicionar, editar (níveis/plano) e excluir.
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
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import {
  apiCreateAdminUser,
  apiDeleteAdminUser,
  apiGetAdminSubscribers,
  apiPatchAdminUser,
  type ApiAdminSubscriber,
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function accessBadge(reason: string, hasAccess: boolean) {
  if (!hasAccess) return <Badge variant="destructive">Expirado</Badge>;
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    admin: { label: "Admin", variant: "default" },
    staff: { label: "Equipe", variant: "secondary" },
    grandfathered: { label: "Legado", variant: "secondary" },
    trial: { label: "Trial", variant: "outline" },
    subscription: { label: "Assinante", variant: "default" },
  };
  const m = map[reason] ?? { label: reason, variant: "outline" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

const LEVEL_LABEL: Record<string, string> = {
  user: "Usuário",
  viewer: "Visualizador",
  operator: "Operador",
  admin: "Admin",
};

type FormState = {
  name: string;
  email: string;
  password: string;
  plan: "free" | "pro" | "premium";
  accessLevel: "user" | "viewer" | "operator" | "admin";
  isActive: boolean;
  trialEndsAt: string;
  billingGrandfathered: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  email: "",
  password: "",
  plan: "free",
  accessLevel: "user",
  isActive: true,
  trialEndsAt: "",
  billingGrandfathered: false,
});

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function fromDateInput(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(`${v.trim()}T23:59:59.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminSubscribersPage() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const canManage = isAdminUser(user?.email);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAdminSubscriber | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscribers", token],
    queryFn: () => apiGetAdminSubscribers(token!),
    enabled: Boolean(token) && canManage,
    refetchInterval: 30_000,
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-subscribers"] });
  const createMut = useMutation({
    mutationFn: () =>
      apiCreateAdminUser(token!, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        plan: form.plan,
        accessLevel: form.accessLevel,
        isActive: form.isActive,
        trialEndsAt: fromDateInput(form.trialEndsAt),
        billingGrandfathered: form.billingGrandfathered,
      }),
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success("Assinante criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const patchMut = useMutation({
    mutationFn: (payload: { id: string } & Partial<FormState> & { isActive?: boolean }) => {
      const body: Parameters<typeof apiPatchAdminUser>[2] = {};
      if (payload.name !== undefined) body.name = payload.name.trim();
      if (payload.email !== undefined) body.email = payload.email.trim().toLowerCase();
      if (payload.password) body.password = payload.password;
      if (payload.plan !== undefined) body.plan = payload.plan;
      if (payload.accessLevel !== undefined) body.accessLevel = payload.accessLevel;
      if (payload.isActive !== undefined) body.isActive = payload.isActive;
      if (payload.trialEndsAt !== undefined) body.trialEndsAt = fromDateInput(payload.trialEndsAt);
      if (payload.billingGrandfathered !== undefined) body.billingGrandfathered = payload.billingGrandfathered;
      return apiPatchAdminUser(token!, payload.id, body);
    },
    onSuccess: () => {
      invalidate();
      setDialogOpen(false);
      toast.success("Cadastro atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDeleteAdminUser(token!, id),
    onSuccess: () => {
      invalidate();
      toast.success("Assinante excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };
  const openEdit = (u: ApiAdminSubscriber) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      plan: (["free", "pro", "premium"].includes(u.plan) ? u.plan : "free") as FormState["plan"],
      accessLevel: (u.accessLevel ?? "user") as FormState["accessLevel"],
      isActive: u.isActive !== false,
      trialEndsAt: toDateInput(u.trialEndsAt),
      billingGrandfathered: Boolean(u.billingGrandfathered),
    });
    setDialogOpen(true);
  };
  const saveForm = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    if (!editing && form.password.length < 6) {
      toast.error("Senha mínima de 6 caracteres");
      return;
    }
    if (editing && form.password && form.password.length < 6) {
      toast.error("Senha mínima de 6 caracteres");
      return;
    }
    if (editing) {
      patchMut.mutate({ id: editing.id, ...form });
    } else {
      createMut.mutate();
    }
  };
  const pending = createMut.isPending || patchMut.isPending || deleteMut.isPending;
  const stats = data?.stats;
  const dialogTitle = useMemo(() => (editing ? "Editar assinante" : "Adicionar assinante"), [editing]);
  if (!canManage) {
    return (
      <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
        Somente a conta admin@admin.com acessa Assinantes.
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Assinantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adicionar, editar (plano, nível, trial) e excluir — exclusivo admin@admin.com
          </p>
        </div>
        <Button type="button" onClick={openCreate} className="gap-2">
          <Plus size={16} />
          Adicionar assinante
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats?.total ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Com acesso</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-cgreen-600">{stats?.withAccess ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Assinantes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats?.subscribed ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Em trial</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats?.onTrial ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Legados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{stats?.grandfathered ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Expirados</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">{stats?.expired ?? "—"}</CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Usuários</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Trial até</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.users ?? []).map((u) => {
                  const isSystemAdmin = isAdminUser(u.email);
                  return (
                    <TableRow key={u.id} className={u.isActive === false ? "opacity-60" : undefined}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>{accessBadge(u.access, u.hasAccess)}</TableCell>
                      <TableCell>{LEVEL_LABEL[u.accessLevel ?? "user"] ?? u.accessLevel}</TableCell>
                      <TableCell>
                        <Badge variant={u.isActive === false ? "destructive" : "outline"}>
                          {u.isActive === false ? "Inativo" : "Ativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">{u.subscription?.status ?? u.plan}</TableCell>
                      <TableCell>
                        {u.trialEndsAt
                          ? format(new Date(u.trialEndsAt), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(u.createdAt), "dd/MM/yy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => openEdit(u)}>
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={u.isActive === false ? "default" : "outline"}
                            disabled={pending || isSystemAdmin}
                            onClick={() => patchMut.mutate({ id: u.id, isActive: u.isActive === false })}
                          >
                            {u.isActive === false ? "Ativar" : "Inativar"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={pending || isSystemAdmin}
                            onClick={() => {
                              if (!window.confirm(`Excluir permanentemente ${u.email}?`)) return;
                              deleteMut.mutate(u.id);
                            }}
                          >
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <label className="grid gap-1 text-sm">
              Nome
              <input
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              E-mail
              <input
                type="email"
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.email}
                disabled={Boolean(editing && isAdminUser(editing.email))}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Senha {editing ? "(opcional)" : ""}
              <input
                type="password"
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.password}
                placeholder={editing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                Plano
                <select
                  className="h-10 rounded-md border border-border bg-background px-2"
                  value={form.plan}
                  onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as FormState["plan"] }))}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Nível / permissão
                <select
                  className="h-10 rounded-md border border-border bg-background px-2"
                  value={form.accessLevel}
                  disabled={Boolean(editing && isAdminUser(editing.email))}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accessLevel: e.target.value as FormState["accessLevel"] }))
                  }
                >
                  <option value="user">Usuário</option>
                  <option value="viewer">Visualizador</option>
                  <option value="operator">Operador</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-sm">
              Trial até
              <input
                type="date"
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.trialEndsAt}
                onChange={(e) => setForm((f) => ({ ...f, trialEndsAt: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Cadastro ativo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.billingGrandfathered}
                onChange={(e) => setForm((f) => ({ ...f, billingGrandfathered: e.target.checked }))}
              />
              Acesso legado (sem cobrança)
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pending} onClick={saveForm}>
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
