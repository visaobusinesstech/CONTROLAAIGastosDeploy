/**
 * Logs de chamadas OpenAI — tokens, custo e operação (admin).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @tanstack/react-query
import { useQuery } from "@tanstack/react-query"; // Polling de logs a cada 15s
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth"; // Token JWT do admin
// Importa funções/componentes de @/lib/api
import { apiGetAiLogs } from "@/lib/api"; // GET /api/admin/ai/logs
// Importa funções/componentes de @/components/ui/card
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Importa funções/componentes de @/components/ui/badge
import { Badge } from "@/components/ui/badge";
// Importa funções/componentes de @/components/ui/table
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Exporta como padrão do módulo (import default)
export default function AiLogsPage() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();

  // Busca últimos 100 logs com resumo de tokens e custo
  const logsQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["ai-logs"],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetAiLogs(token!, 100),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 15000,
  });

  // Constante local
  const summary = logsQuery.data?.summary;

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        // Tag HTML na interface
        <h1 className="text-2xl font-bold">Logs IA</h1>
        // Tag HTML na interface
        <p className="text-sm text-muted-foreground mt-1">Tokens, custos e histórico de processamento</p>
      // Tag HTML na interface
      </div>

      {/* KPIs de resumo — chamadas, tokens e custo estimado */}
      <div className="grid gap-4 md:grid-cols-4">
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Chamadas (30d)</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">{summary?.count ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tokens entrada</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">{summary?.inputTokens?.toLocaleString("pt-BR") ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tokens saída</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">{summary?.outputTokens?.toLocaleString("pt-BR") ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
        // Elemento/componente React na tela
        <Card>
          // Elemento/componente React na tela
          <CardHeader className="pb-2"><CardTitle className="text-sm">Custo estimado</CardTitle></CardHeader>
          // Elemento/componente React na tela
          <CardContent className="text-2xl font-bold">${summary?.totalCostUsd?.toFixed(4) ?? "—"}</CardContent>
        // Elemento/componente React na tela
        </Card>
      // Tag HTML na interface
      </div>

      {/* Tabela detalhada de cada chamada OpenAI */}
      <Card>
        // Elemento/componente React na tela
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        // Elemento/componente React na tela
        <CardContent className="overflow-x-auto">
          // Elemento/componente React na tela
          <Table>
            // Elemento/componente React na tela
            <TableHeader>
              // Elemento/componente React na tela
              <TableRow>
                // Elemento/componente React na tela
                <TableHead>Data</TableHead>
                // Elemento/componente React na tela
                <TableHead>Origem</TableHead>
                // Elemento/componente React na tela
                <TableHead>Operação</TableHead>
                // Elemento/componente React na tela
                <TableHead>Modelo</TableHead>
                // Elemento/componente React na tela
                <TableHead>Tokens</TableHead>
                // Elemento/componente React na tela
                <TableHead>Tempo</TableHead>
                // Elemento/componente React na tela
                <TableHead>Status</TableHead>
              // Elemento/componente React na tela
              </TableRow>
            // Elemento/componente React na tela
            </TableHeader>
            // Elemento/componente React na tela
            <TableBody>
              // Percorre lista e renderiza um item para cada elemento
              {(logsQuery.data?.logs ?? []).map((log) => (
                // Elemento/componente React na tela
                <TableRow key={log.id}>
                  // Elemento/componente React na tela
                  <TableCell className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString("pt-BR")}</TableCell>
                  // Elemento/componente React na tela
                  <TableCell>{log.source}</TableCell>
                  // Elemento/componente React na tela
                  <TableCell>{log.operation}</TableCell>
                  // Elemento/componente React na tela
                  <TableCell className="text-xs">{log.model ?? "—"}</TableCell>
                  // Elemento/componente React na tela
                  <TableCell className="text-xs">{(log.inputTokens ?? 0) + (log.outputTokens ?? 0)}</TableCell>
                  // Elemento/componente React na tela
                  <TableCell className="text-xs">{log.processingMs ? `${log.processingMs}ms` : "—"}</TableCell>
                  // Elemento/componente React na tela
                  <TableCell>
                    // Elemento/componente React na tela
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
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
        // Elemento/componente React na tela
        </CardContent>
      // Elemento/componente React na tela
      </Card>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
