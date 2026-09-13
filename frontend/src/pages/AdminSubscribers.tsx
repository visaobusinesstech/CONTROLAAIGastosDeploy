/**
 * Central admin — Assinantes: listar, adicionar, editar (níveis/plano) e excluir.
 * Visível somente para admin@admin.com.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useMemo, useState } from "react";
// Importa funções/componentes de @tanstack/react-query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Importa funções/componentes de sonner
import { toast } from "sonner";
// Importa funções/componentes de lucide-react
import { Plus } from "lucide-react";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/admin
import { isAdminUser } from "@/lib/admin";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiCreateAdminUser,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiDeleteAdminUser,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetAdminSubscribers,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPatchAdminUser,
  // Define formato de dados (TypeScript)
  type ApiAdminSubscriber,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/api";
// Importa funções/componentes de @/components/ui/card
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Importa funções/componentes de @/components/ui/badge
import { Badge } from "@/components/ui/badge";
// Importa funções/componentes de @/components/ui/button
import { Button } from "@/components/ui/button";
// Importa funções/componentes de @/components/ui/table
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
// Importa funções/componentes de date-fns
import { format } from "date-fns";
// Importa funções/componentes de date-fns/locale
import { ptBR } from "date-fns/locale";

// Declara função auxiliar interna
function accessBadge(reason: string, hasAccess: boolean) {
  // Condição — executa bloco só se verdadeira
  if (!hasAccess) return <Badge variant="destructive">Expirado</Badge>;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    admin: { label: "Admin", variant: "default" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    staff: { label: "Equipe", variant: "secondary" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    grandfathered: { label: "Legado", variant: "secondary" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    trial: { label: "Trial", variant: "outline" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    subscription: { label: "Assinante", variant: "default" },
  };
  // Constante local
  const m = map[reason] ?? { label: reason, variant: "outline" as const };
  // Retorna valor ou JSX para quem chamou
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

// Instrução do fluxo — parte da lógica de negócio ou interface
const LEVEL_LABEL: Record<string, string> = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  user: "Usuário",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  viewer: "Visualizador",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  operator: "Operador",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  admin: "Admin",
};

// Define formato de dados (TypeScript)
type FormState = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  password: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  plan: "free" | "pro" | "premium";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  accessLevel: "user" | "viewer" | "operator" | "admin";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isActive: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  trialEndsAt: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  billingGrandfathered: boolean;
};

// Constante local
const emptyForm = (): FormState => ({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  name: "",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: "",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  password: "",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  plan: "free",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  accessLevel: "user",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  isActive: true,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  trialEndsAt: "",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  billingGrandfathered: false,
});

// Declara função auxiliar interna
function toDateInput(iso: string | null | undefined): string {
  // Condição — executa bloco só se verdadeira
  if (!iso) return "";
  // Tenta executar — erros vão para catch
  try {
    // Retorna valor ou JSX para quem chamou
    return format(new Date(iso), "yyyy-MM-dd");
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch {
    // Retorna valor ou JSX para quem chamou
    return "";
  }
}

// Declara função auxiliar interna
function fromDateInput(v: string): string | null {
  // Condição — executa bloco só se verdadeira
  if (!v.trim()) return null;
  // Constante local
  const d = new Date(`${v.trim()}T23:59:59.000Z`);
  // Retorna valor ou JSX para quem chamou
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Exporta como padrão do módulo (import default)
export default function AdminSubscribersPage() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Constante local
  const canManage = isAdminUser(user?.email);

  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [dialogOpen, setDialogOpen] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [editing, setEditing] = useState<ApiAdminSubscriber | null>(null);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [form, setForm] = useState<FormState>(emptyForm());

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data, isLoading } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["admin-subscribers", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetAdminSubscribers(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token) && canManage,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 30_000,
  });

  // Constante local
  const invalidate = () => void qc.invalidateQueries({ queryKey: ["admin-subscribers"] });

  // Mutação na API (criar/editar/excluir)
  const createMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: () =>
      // Instrução do fluxo — parte da lógica de negócio ou interface
      apiCreateAdminUser(token!, {
        // Remove espaços no início/fim do texto
        name: form.name.trim(),
        // Remove espaços no início/fim do texto
        email: form.email.trim().toLowerCase(),
        // Instrução do fluxo — parte da lógica de negócio ou interface
        password: form.password,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        plan: form.plan,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        accessLevel: form.accessLevel,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        isActive: form.isActive,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        trialEndsAt: fromDateInput(form.trialEndsAt),
        // Instrução do fluxo — parte da lógica de negócio ou interface
        billingGrandfathered: form.billingGrandfathered,
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      }),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      invalidate();
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setDialogOpen(false);
      // Exibe notificação temporária (toast) na tela
      toast.success("Assinante criado");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutação na API (criar/editar/excluir)
  const patchMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (payload: { id: string } & Partial<FormState> & { isActive?: boolean }) => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      const body: Parameters<typeof apiPatchAdminUser>[2] = {};
      // Condição — executa bloco só se verdadeira
      if (payload.name !== undefined) body.name = payload.name.trim();
      // Condição — executa bloco só se verdadeira
      if (payload.email !== undefined) body.email = payload.email.trim().toLowerCase();
      // Condição — executa bloco só se verdadeira
      if (payload.password) body.password = payload.password;
      // Condição — executa bloco só se verdadeira
      if (payload.plan !== undefined) body.plan = payload.plan;
      // Condição — executa bloco só se verdadeira
      if (payload.accessLevel !== undefined) body.accessLevel = payload.accessLevel;
      // Condição — executa bloco só se verdadeira
      if (payload.isActive !== undefined) body.isActive = payload.isActive;
      // Condição — executa bloco só se verdadeira
      if (payload.trialEndsAt !== undefined) body.trialEndsAt = fromDateInput(payload.trialEndsAt);
      // Condição — executa bloco só se verdadeira
      if (payload.billingGrandfathered !== undefined) body.billingGrandfathered = payload.billingGrandfathered;
      // Retorna valor ou JSX para quem chamou
      return apiPatchAdminUser(token!, payload.id, body);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      invalidate();
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setDialogOpen(false);
      // Exibe notificação temporária (toast) na tela
      toast.success("Cadastro atualizado");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Mutação na API (criar/editar/excluir)
  const deleteMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (id: string) => apiDeleteAdminUser(token!, id),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      invalidate();
      // Exibe notificação temporária (toast) na tela
      toast.success("Assinante excluído");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Exibe notificação temporária (toast) na tela
    onError: (e: Error) => toast.error(e.message),
  });

  // Constante local
  const openCreate = () => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setEditing(null);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setForm(emptyForm());
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setDialogOpen(true);
  };

  // Constante local
  const openEdit = (u: ApiAdminSubscriber) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setEditing(u);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setForm({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      name: u.name,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      email: u.email,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      password: "",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      plan: (["free", "pro", "premium"].includes(u.plan) ? u.plan : "free") as FormState["plan"],
      // Instrução do fluxo — parte da lógica de negócio ou interface
      accessLevel: (u.accessLevel ?? "user") as FormState["accessLevel"],
      // Instrução do fluxo — parte da lógica de negócio ou interface
      isActive: u.isActive !== false,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      trialEndsAt: toDateInput(u.trialEndsAt),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      billingGrandfathered: Boolean(u.billingGrandfathered),
    });
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setDialogOpen(true);
  };

  // Constante local
  const saveForm = () => {
    // Condição — executa bloco só se verdadeira
    if (!form.name.trim() || !form.email.trim()) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Nome e e-mail são obrigatórios");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (!editing && form.password.length < 6) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Senha mínima de 6 caracteres");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (editing && form.password && form.password.length < 6) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Senha mínima de 6 caracteres");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (editing) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      patchMut.mutate({ id: editing.id, ...form });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } else {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      createMut.mutate();
    }
  };

  // Constante local
  const pending = createMut.isPending || patchMut.isPending || deleteMut.isPending;
  // Constante local
  const stats = data?.stats;
  // Valor memorizado — recalcula só quando dependências mudam
  const dialogTitle = useMemo(() => (editing ? "Editar assinante" : "Adicionar assinante"), [editing]);

  // Condição — executa bloco só se verdadeira
  if (!canManage) {
    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
        // Instrução do fluxo — parte da lógica de negócio ou interface
        Somente a conta admin@admin.com acessa Assinantes.
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }

  // Retorna valor ou JSX para quem chamou
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
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Adicionar, editar (plano, nível, trial) e excluir — exclusivo admin@admin.com
          // Tag HTML na interface
          </p>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <Button type="button" onClick={openCreate} className="gap-2">
          // Elemento/componente React na tela
          <Plus size={16} />
          // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {isLoading ? (
            // Tag HTML na interface
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                  // Constante local
                  const isSystemAdmin = isAdminUser(u.email);
                  // Retorna valor ou JSX para quem chamou
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
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          {u.isActive === false ? "Inativo" : "Ativo"}
                        // Elemento/componente React na tela
                        </Badge>
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="capitalize">{u.subscription?.status ?? u.plan}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell>
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {u.trialEndsAt
                          // Formata data em texto legível (pt-BR)
                          ? format(new Date(u.trialEndsAt), "dd/MM/yyyy", { locale: ptBR })
                          // Instrução do fluxo — parte da lógica de negócio ou interface
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
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            Editar
                          // Elemento/componente React na tela
                          </Button>
                          // Elemento/componente React na tela
                          <Button
                            // Botão comum (não envia formulário)
                            type="button"
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            size="sm"
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            variant={u.isActive === false ? "default" : "outline"}
                            // Desabilita botão/campo (ex.: durante envio)
                            disabled={pending || isSystemAdmin}
                            // Executa ação quando o usuário clica
                            onClick={() => patchMut.mutate({ id: u.id, isActive: u.isActive === false })}
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          >
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            {u.isActive === false ? "Ativar" : "Inativar"}
                          // Elemento/componente React na tela
                          </Button>
                          // Elemento/componente React na tela
                          <Button
                            // Botão comum (não envia formulário)
                            type="button"
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            size="sm"
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            variant="destructive"
                            // Desabilita botão/campo (ex.: durante envio)
                            disabled={pending || isSystemAdmin}
                            // Executa ação quando o usuário clica
                            onClick={() => {
                              // Condição — executa bloco só se verdadeira
                              if (!window.confirm(`Excluir permanentemente ${u.email}?`)) return;
                              // Instrução do fluxo — parte da lógica de negócio ou interface
                              deleteMut.mutate(u.id);
                            // Passo do algoritmo — executa parte da regra de negócio ou da interface
                            }}
                          // Instrução do fluxo — parte da lógica de negócio ou interface
                          >
                            // Instrução do fluxo — parte da lógica de negócio ou interface
                            Excluir
                          // Elemento/componente React na tela
                          </Button>
                        // Tag HTML na interface
                        </div>
                      // Elemento/componente React na tela
                      </TableCell>
                    // Elemento/componente React na tela
                    </TableRow>
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  );
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                })}
              // Elemento/componente React na tela
              </TableBody>
            // Elemento/componente React na tela
            </Table>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Nome
              // Tag HTML na interface
              <input
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={form.name}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="grid gap-1 text-sm">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              E-mail
              // Tag HTML na interface
              <input
                // Campo de e-mail com validação do navegador
                type="email"
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={form.email}
                // Desabilita botão/campo (ex.: durante envio)
                disabled={Boolean(editing && isAdminUser(editing.email))}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="grid gap-1 text-sm">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Senha {editing ? "(opcional)" : ""}
              // Tag HTML na interface
              <input
                // Campo de senha (caracteres ocultos)
                type="password"
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={form.password}
                // Texto cinza de exemplo dentro do campo vazio
                placeholder={editing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <div className="grid grid-cols-2 gap-3">
              // Tag HTML na interface
              <label className="grid gap-1 text-sm">
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Plano
                // Tag HTML na interface
                <select
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-10 rounded-md border border-border bg-background px-2"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  value={form.plan}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as FormState["plan"] }))}
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Nível / permissão
                // Tag HTML na interface
                <select
                  // Classes CSS Tailwind — controla aparência visual
                  className="h-10 rounded-md border border-border bg-background px-2"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  value={form.accessLevel}
                  // Desabilita botão/campo (ex.: durante envio)
                  disabled={Boolean(editing && isAdminUser(editing.email))}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) =>
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    setForm((f) => ({ ...f, accessLevel: e.target.value as FormState["accessLevel"] }))
                  }
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Trial até
              // Tag HTML na interface
              <input
                // Instrução do fluxo — parte da lógica de negócio ou interface
                type="date"
                // Classes CSS Tailwind — controla aparência visual
                className="h-10 rounded-md border border-border bg-background px-3"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={form.trialEndsAt}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, trialEndsAt: e.target.value }))}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="flex items-center gap-2 text-sm">
              // Tag HTML na interface
              <input
                // Instrução do fluxo — parte da lógica de negócio ou interface
                type="checkbox"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                checked={form.isActive}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Cadastro ativo
            // Tag HTML na interface
            </label>
            // Tag HTML na interface
            <label className="flex items-center gap-2 text-sm">
              // Tag HTML na interface
              <input
                // Instrução do fluxo — parte da lógica de negócio ou interface
                type="checkbox"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                checked={form.billingGrandfathered}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setForm((f) => ({ ...f, billingGrandfathered: e.target.checked }))}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Acesso legado (sem cobrança)
            // Tag HTML na interface
            </label>
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <DialogFooter>
            // Elemento/componente React na tela
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Cancelar
            // Elemento/componente React na tela
            </Button>
            // Elemento/componente React na tela
            <Button type="button" disabled={pending} onClick={saveForm}>
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
