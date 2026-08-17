/**
 * Central admin — assinantes, níveis de acesso e ativar/inativar cadastro.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useCapabilities } from "@/hooks/use-capabilities";
import { apiGetAdminSubscribers, apiPatchAdminUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export default function AdminSubscribersPage() {
  const { token } = useAuth();
  const { data: caps } = useCapabilities();
  const qc = useQueryClient();
  const canEdit = Boolean(caps?.isAdmin);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscribers", token],
    queryFn: () => apiGetAdminSubscribers(token!),
    enabled: Boolean(token),
    refetchInterval: 30_000,
  });

  const patchMut = useMutation({
    mutationFn: (payload: { id: string; accessLevel?: "user" | "viewer" | "operator" | "admin"; isActive?: boolean }) =>
      apiPatchAdminUser(token!, payload.id, { accessLevel: payload.accessLevel, isActive: payload.isActive }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-subscribers"] });
      toast.success("Cadastro atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinantes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Usuários, trials, níveis de acesso e ativação (sem exclusão física)
        </p>
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
                  {canEdit ? <TableHead>Ações</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.users ?? []).map((u) => (
                  <TableRow key={u.id} className={u.isActive === false ? "opacity-60" : undefined}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{accessBadge(u.access, u.hasAccess)}</TableCell>
                    <TableCell>
                      {canEdit ? (
                        <select
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                          value={u.accessLevel ?? "user"}
                          disabled={patchMut.isPending}
                          onChange={(e) =>
                            patchMut.mutate({
                              id: u.id,
                              accessLevel: e.target.value as "user" | "viewer" | "operator" | "admin",
                            })
                          }
                        >
                          <option value="user">Usuário</option>
                          <option value="viewer">Visualizador</option>
                          <option value="operator">Operador</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        LEVEL_LABEL[u.accessLevel ?? "user"] ?? u.accessLevel
                      )}
                    </TableCell>
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
                    {canEdit ? (
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant={u.isActive === false ? "default" : "outline"}
                          disabled={patchMut.isPending}
                          onClick={() => patchMut.mutate({ id: u.id, isActive: u.isActive === false })}
                        >
                          {u.isActive === false ? "Ativar" : "Inativar"}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
