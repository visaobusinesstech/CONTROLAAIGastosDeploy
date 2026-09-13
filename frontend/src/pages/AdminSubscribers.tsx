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

// Declara função auxiliar interna
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

// Declara função auxiliar interna
function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return format(new Date(iso), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

// Declara função auxiliar interna
function fromDateInput(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(`${v.trim()}T23:59:59.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminSubscribersPage() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  const canManage = isAdminUser(user?.email);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiAdminSubscriber | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscribers", token],
    queryFn: () => apiGetAdminSubscribers(token!),
    enabled: Boolean(token) && canManage,
    refetchInterval: 30_000,
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-subscribers"] });
  // Mutação na API (criar/editar/excluir)
  const createMut = useMutation({
    mutationFn: () =>
      apiCreateAdminUser(token!, {
        // Remove espaços no início/fim do texto
        name: form.name.trim(),
        // Remove espaços no início/fim do texto
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
      // Exibe notificação temporária (toast) na tela
      toast.success("Assinante criado");
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Mutação na API (criar/editar/excluir)
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
      // Exibe notificação temporária (toast) na tela
      toast.success("Cadastro atualizado");
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });
  // Mutação na API (criar/editar/excluir)
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiDeleteAdminUser(token!, id),
    onSuccess: () => {
      invalidate();
      // Exibe notificação temporária (toast) na tela
      toast.success("Assinante excluído");
    },
    // Exibe notificação temporária (toast) na tela
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
      // Exibe notificação temporária (toast) na tela
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }
    if (!editing && form.password.length < 6) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Senha mínima de 6 caracteres");
      return;
    }
    if (editing && form.password && form.password.length < 6) {
      // Exibe notificação temporária (toast) na tela
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
  // Valor memorizado — recalcula só quando dependências mudam
  const dialogTitle = useMemo(() => (editing ? "Editar assinante" : "Adicionar assinante"), [editing]);
  if (!canManage) {
    return (
      // Tag HTML na interface
      <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
        Somente a conta admin@admin.com acessa Assinantes.
      // Tag HTML na interface
      </div>
    );
  }
  return (
    // Tag HTML na interface
    <div className="space-y-6">
      // Tag HTML na interface
      <div className="flex flex-wrap items-start justify-between gap-3">
        // Tag HTML na interface
        <div>
          // Tag HTML na interface
          <h1 className="text-2xl font-bold">Assinantes</h1>
          // Tag HTML na interface
          <p className="mt-1 text-sm text-muted-foreground">
            Adicionar, editar (plano, nível, trial) e excluir — exclusivo admin@admin.com
          // Tag HTML na interface
          </p>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <Button type="button" onClick={openCreate} className="gap-2">
          // Elemento/componente React na tela
          <Plus size={16} />
          Adicionar assinante
        // Elemento/componente React na tela
        </Button>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">{stats?.total ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Com acesso</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold text-cgreen-600">{stats?.withAccess ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Assinantes</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">{stats?.subscribed ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Em trial</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">{stats?.onTrial ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Legados</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">{stats?.grandfathered ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Expirados</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold text-destructive">{stats?.expired ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
      // Tag HTML na interface
      </div>
      // Elemento/componente React na tela
      <Card>
        // Elemento/componente React na tela
        <CardHeader>
          // Elemento/componente React na tela
          <CardTitle>Usuários</CardTitle>
        // Elemento/componente React na tela
        </CardHeader>
        // Elemento/componente React na tela
        <CardContent className="overflow-x-auto p-0">
          {isLoading ? (
            // Tag HTML na interface
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            // Elemento/componente React na tela
            <Table>
              // Elemento/componente React na tela
              <TableHeader>
                // Elemento/componente React na tela
                <TableRow>
                  // Elemento/componente React na tela
                  <TableHead>Nome</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>E-mail</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Status</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Nível</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Cadastro</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Plano</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Trial até</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Desde</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Ações</TableHead>
                // Elemento/componente React na tela
                </TableRow>
              // Elemento/componente React na tela
              </TableHeader>
              // Elemento/componente React na tela
              <TableBody>
                // Percorre lista e renderiza um item para cada elemento
                {(data?.users ?? []).map((u) => {
                  const isSystemAdmin = isAdminUser(u.email);
                  return (
                    // Elemento/componente React na tela
                    <TableRow key={u.id} className={u.isActive === false ? "opacity-60" : undefined}>
                      // Elemento/componente React na tela
                      <TableCell className="font-medium">{u.name}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell>{accessBadge(u.access, u.hasAccess)}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell>{LEVEL_LABEL[u.accessLevel ?? "user"] ?? u.accessLevel}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell>
                        // Elemento/componente React na tela
                        <Badge variant={u.isActive === false ? "destructive" : "outline"}>
                          {u.isActive === false ? "Inativo" : "Ativo"}
                        // Elemento/componente React na tela
                        </Badge>
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="capitalize">{u.subscription?.status ?? u.plan}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell>
                        {u.trialEndsAt
                          // Formata data em texto legível (pt-BR)
                          ? format(new Date(u.trialEndsAt), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-muted-foreground">
                        // Formata data em texto legível (pt-BR)
                        {format(new Date(u.createdAt), "dd/MM/yy", { locale: ptBR })}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell>
                        // Tag HTML na interface
                        <div className="flex flex-wrap gap-2">
                          // Elemento/componente React na tela
                          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => openEdit(u)}>
                            Editar
                          // Elemento/componente React na tela
                          </Button>
                          // Elemento/componente React na tela
                          <Button
                            // Botão comum (não envia formulário)
                            type="button"
                            size="sm"
                            variant={u.isActive === false ? "default" : "outline"}
                            // Desabilita botão/campo (ex.: durante envio)
                            disabled={pending || isSystemAdmin}
                            // Executa ação quando o usuário clica
                            onClick={() => patchMut.mutate({ id: u.id, isActive: u.isActive === false })}
                          >
                            {u.isActive === false ? "Ativar" : "Inativar"}
                          // Elemento/componente React na tela
                          </Button>
                          // Elemento/componente React na tela
                          <Button
                            // Botão comum (não envia formulário)
                            type="button"
                            size="sm"
                            variant="destructive"
                            // Desabilita botão/campo (ex.: durante envio)
                            disabled={pending || isSystemAdmin}
                            // Executa ação quando o usuário clica
                            onClick={() => {
                              if (!window.confirm(`Excluir permanentemente ${u.email}?`)) return;
                              deleteMut.mutate(u.id);
                            }}
                          >
                            Excluir
                          // Elemento/componente React na tela
                          </Button>
                        // Tag HTML na interface
                        </div>
                      // Elemento/componente React na tela
                      </TableCell>
                    // Elemento/componente React na tela
                    </TableRow>
                  );
                })}
              // Elemento/componente React na tela
              </TableBody>
            // Elemento/componente React na tela
            </Table>
          )}
        // Elemento/componente React na tela
        </CardContent>
      // Elemento/componente React na tela
      </Card>
      // Elemento/componente React na tela
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        // Elemento/componente React na tela
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          // Elemento/componente React na tela
          <DialogHeader>
            // Elemento/componente React na tela
            <DialogTitle>{dialogTitle}</DialogTitle>
          // Elemento/componente React na tela
          </DialogHeader>
          // Tag HTML na interface
          <div className="grid gap-3 py-2">
            // Tag HTML na interface
            <label className="grid gap-1 text-sm">
              Nome
              // Tag HTML na interface
              <input
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.name}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="grid gap-1 text-sm">
              E-mail
              // Tag HTML na interface
              <input
                // Campo de e-mail com validação do navegador
                type="email"
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.email}
                // Desabilita botão/campo (ex.: durante envio)
                disabled={Boolean(editing && isAdminUser(editing.email))}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="grid gap-1 text-sm">
              Senha {editing ? "(opcional)" : ""}
              // Tag HTML na interface
              <input
                // Campo de senha (caracteres ocultos)
                type="password"
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.password}
                // Texto cinza de exemplo dentro do campo vazio
                placeholder={editing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <div className="grid grid-cols-2 gap-3">
              // Tag HTML na interface
              <label className="grid gap-1 text-sm">
                Plano
                // Tag HTML na interface
                <select
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-10 rounded-md border border-border bg-background px-2"
                  value={form.plan}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as FormState["plan"] }))}
                >
                  // Tag HTML na interface
                  <option value="free">Free</option>
                  // Tag HTML na interface
                  <option value="pro">Pro</option>
                  // Tag HTML na interface
                  <option value="premium">Premium</option>
                // Tag HTML na interface
                </select>
              // Tag HTML na interface
              </label>
              // Tag HTML na interface
              <label className="grid gap-1 text-sm">
                Nível / permissão
                // Tag HTML na interface
                <select
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-10 rounded-md border border-border bg-background px-2"
                  value={form.accessLevel}
                  // Desabilita botão/campo (ex.: durante envio)
                  disabled={Boolean(editing && isAdminUser(editing.email))}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accessLevel: e.target.value as FormState["accessLevel"] }))
                  }
                >
                  // Tag HTML na interface
                  <option value="user">Usuário</option>
                  // Tag HTML na interface
                  <option value="viewer">Visualizador</option>
                  // Tag HTML na interface
                  <option value="operator">Operador</option>
                  // Tag HTML na interface
                  <option value="admin">Admin</option>
                // Tag HTML na interface
                </select>
              // Tag HTML na interface
              </label>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <label className="grid gap-1 text-sm">
              Trial até
              // Tag HTML na interface
              <input
                type="date"
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                value={form.trialEndsAt}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, trialEndsAt: e.target.value }))}
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="flex items-center gap-2 text-sm">
              // Tag HTML na interface
              <input
                type="checkbox"
                checked={form.isActive}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Cadastro ativo
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="flex items-center gap-2 text-sm">
              // Tag HTML na interface
              <input
                type="checkbox"
                checked={form.billingGrandfathered}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, billingGrandfathered: e.target.checked }))}
              />
              Acesso legado (sem cobrança)
            // Tag HTML na interface
            </label>
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <DialogFooter>
            // Elemento/componente React na tela
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            // Elemento/componente React na tela
            </Button>
            // Elemento/componente React na tela
            <Button type="button" disabled={pending} onClick={saveForm}>
              {editing ? "Salvar" : "Criar"}
            // Elemento/componente React na tela
            </Button>
          // Elemento/componente React na tela
          </DialogFooter>
        // Elemento/componente React na tela
        </DialogContent>
      // Elemento/componente React na tela
      </Dialog>
    // Tag HTML na interface
    </div>
  );
}
