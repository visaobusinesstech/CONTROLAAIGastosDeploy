/**
 * Auditoria de cadastros — inclusão, alteração, inativação e reativação.
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
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Consulta à API com cache (React Query)
  const query = useQuery({
    queryKey: ["audit-logs", token],
    queryFn: () => apiGetAuditLogs(token!),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  });
  return (
    // Tag HTML na interface
    <div className="space-y-6">
      // Tag HTML na interface
      <div>
        // Tag HTML na interface
        <h1 className="text-2xl font-bold">Auditoria</h1>
        // Tag HTML na interface
        <p className="mt-1 text-sm text-muted-foreground">
          Inclusão, alteração e inativação por rotina, data, hora e usuário
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>
      // Elemento/componente React na tela
      <Card>
        // Elemento/componente React na tela
        <CardHeader>
          // Elemento/componente React na tela
          <CardTitle>Logs recentes</CardTitle>
        // Elemento/componente React na tela
        </CardHeader>
        // Elemento/componente React na tela
        <CardContent className="overflow-x-auto p-0">
          {query.isLoading ? (
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
                  <TableHead>Data/hora</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Usuário</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Rotina</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Ação</TableHead>
                  // Elemento/componente React na tela
                  <TableHead>Cadastro</TableHead>
                // Elemento/componente React na tela
                </TableRow>
              // Elemento/componente React na tela
              </TableHeader>
              // Elemento/componente React na tela
              <TableBody>
                // Percorre lista e renderiza um item para cada elemento
                {(query.data?.logs ?? []).map((log) => (
                  // Elemento/componente React na tela
                  <TableRow key={log.id}>
                    // Elemento/componente React na tela
                    <TableCell className="whitespace-nowrap text-xs">
                      // Formata número como moeda/texto local (pt-BR)
                      {new Date(log.occurredAt).toLocaleString("pt-BR")}
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell>
                      // Tag HTML na interface
                      <p className="text-sm font-medium">{log.actorName ?? "Sistema"}</p>
                      // Tag HTML na interface
                      <p className="text-xs text-muted-foreground">{log.actorEmail ?? "—"}</p>
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell className="font-mono text-xs">{log.routine}</TableCell>
                    // Elemento/componente React na tela
                    <TableCell>
                      // Elemento/componente React na tela
                      <Badge variant={log.action === "inactivate" ? "destructive" : "secondary"}>
                        {ACTION_LABEL[log.action] ?? log.action}
                      // Elemento/componente React na tela
                      </Badge>
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell className="text-xs">
                      {log.entity}
                      // Recorta parte da lista (paginação ou limite)
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    // Elemento/componente React na tela
                    </TableCell>
                  // Elemento/componente React na tela
                  </TableRow>
                ))}
              // Elemento/componente React na tela
              </TableBody>
            // Elemento/componente React na tela
            </Table>
          )}
        // Elemento/componente React na tela
        </CardContent>
      // Elemento/componente React na tela
      </Card>
    // Tag HTML na interface
    </div>
  );
}
