/**
 * Logs de chamadas OpenAI — tokens, custo e operação (admin).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useQuery } from "@tanstack/react-query"; // Polling de logs a cada 15s
import { useAuth } from "@/lib/auth"; // Token JWT do admin
import { apiGetAiLogs } from "@/lib/api"; // GET /api/admin/ai/logs
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AiLogsPage() {
  const { token } = useAuth();

  // Busca últimos 100 logs com resumo de tokens e custo
  const logsQuery = useQuery({
    queryKey: ["ai-logs"],
    queryFn: () => apiGetAiLogs(token!, 100),
    enabled: Boolean(token),
    refetchInterval: 15000,
  });

  const summary = logsQuery.data?.summary;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div>
        <h1 className="text-2xl font-bold">Logs IA</h1>
        <p className="text-sm text-muted-foreground mt-1">Tokens, custos e histórico de processamento</p>
      </div>

      {/* KPIs de resumo — chamadas, tokens e custo estimado */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Chamadas (30d)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary?.count ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tokens entrada</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary?.inputTokens?.toLocaleString("pt-BR") ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Tokens saída</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary?.outputTokens?.toLocaleString("pt-BR") ?? "—"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Custo estimado</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">${summary?.totalCostUsd?.toFixed(4) ?? "—"}</CardContent>
        </Card>
      </div>

      {/* Tabela detalhada de cada chamada OpenAI */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(logsQuery.data?.logs ?? []).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{log.source}</TableCell>
                  <TableCell>{log.operation}</TableCell>
                  <TableCell className="text-xs">{log.model ?? "—"}</TableCell>
                  <TableCell className="text-xs">{(log.inputTokens ?? 0) + (log.outputTokens ?? 0)}</TableCell>
                  <TableCell className="text-xs">{log.processingMs ? `${log.processingMs}ms` : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
