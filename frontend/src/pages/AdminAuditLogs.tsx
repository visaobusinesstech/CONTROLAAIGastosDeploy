/**
 * Auditoria de cadastros — inclusão, alteração, inativação e reativação.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiGetAuditLogs } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ACTION_LABEL: Record<string, string> = {
  insert: "Inclusão",
  update: "Alteração",
  inactivate: "Inativação",
  activate: "Ativação",
};

export default function AdminAuditLogsPage() {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ["audit-logs", token],
    queryFn: () => apiGetAuditLogs(token!),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inclusão, alteração e inativação por rotina, data, hora e usuário
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs recentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {query.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Rotina</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.logs ?? []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(log.occurredAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{log.actorName ?? "Sistema"}</p>
                      <p className="text-xs text-muted-foreground">{log.actorEmail ?? "—"}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.routine}</TableCell>
                    <TableCell>
                      <Badge variant={log.action === "inactivate" ? "destructive" : "secondary"}>
                        {ACTION_LABEL[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.entity}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    </TableCell>
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
