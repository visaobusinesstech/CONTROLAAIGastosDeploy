/**
 * Auditoria de cadastros — inclusão, alteração, inativação e reativação.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @tanstack/react-query
import { useQuery } from "@tanstack/react-query";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/api
import { apiGetAuditLogs } from "@/lib/api";
// Importa funções/componentes de @/components/ui/card
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Importa funções/componentes de @/components/ui/badge
import { Badge } from "@/components/ui/badge";
// Importa funções/componentes de @/components/ui/table
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Instrução do fluxo — parte da lógica de negócio ou interface
const ACTION_LABEL: Record<string, string> = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  insert: "Inclusão",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  update: "Alteração",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  inactivate: "Inativação",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  activate: "Ativação",
};

// Exporta como padrão do módulo (import default)
export default function AdminAuditLogsPage() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();

  // Consulta à API com cache (React Query)
  const query = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["audit-logs", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetAuditLogs(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 15_000,
  });

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="space-y-6">
      // Tag HTML na interface
      <div>
        // Tag HTML na interface
        <h1 className="text-2xl font-bold">Auditoria</h1>
        // Tag HTML na interface
        <p className="mt-1 text-sm text-muted-foreground">
          // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {query.isLoading ? (
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
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {ACTION_LABEL[log.action] ?? log.action}
                      // Elemento/componente React na tela
                      </Badge>
                    // Elemento/componente React na tela
                    </TableCell>
                    // Elemento/componente React na tela
                    <TableCell className="text-xs">
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      {log.entity}
                      // Recorta parte da lista (paginação ou limite)
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                    // Elemento/componente React na tela
                    </TableCell>
                  // Elemento/componente React na tela
                  </TableRow>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                ))}
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
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
