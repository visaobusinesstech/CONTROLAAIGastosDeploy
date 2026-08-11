/**
 * Painel admin WhatsApp — QR Baileys, modelo OpenAI, logs IA e logs Baileys.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // Polling de status e QR
import {
  Bot,
  Loader2,
  Phone,
  Plug,
  QrCode,
  RefreshCw,
  ScrollText,
  Shield,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import {
  apiConnectWhatsApp,
  apiDisconnectWhatsApp,
  apiGetAiLogs,
  apiGetBaileysLogs,
  apiGetOpenAIModel,
  apiGetWhatsAppMessages,
  apiGetWhatsAppStatus,
  apiGetWhatsAppStats,
  apiResetOpenAIModel,
  apiSetOpenAIModel,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    connected: { label: "Conectado", variant: "default" },
    qr: { label: "Aguardando QR", variant: "secondary" },
    connecting: { label: "Conectando", variant: "secondary" },
    disconnected: { label: "Desconectado", variant: "outline" },
    error: { label: "Erro", variant: "destructive" },
  };
  const s = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function levelBadge(level: string) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    info: "default",
    warn: "secondary",
    error: "destructive",
    debug: "outline",
  };
  return <Badge variant={map[level] ?? "outline"}>{level}</Badge>;
}

export default function WhatsAppPage() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = isAdminUser(user?.email);
  const autoConnectTried = useRef(false);
  const [selectedModel, setSelectedModel] = useState("");

  // GET /api/admin/whatsapp/status — QR, conexão e keep-alive
  const statusQuery = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: () => apiGetWhatsAppStatus(token!),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: (query) => {
      const status = query.state.data?.connection.status;
      if (status === "connected") return 10000;
      if (status === "qr" || status === "connecting") return 2000;
      return 5000;
    },
  });

  const statsQuery = useQuery({
    queryKey: ["whatsapp-stats"],
    queryFn: () => apiGetWhatsAppStats(token!),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 15000,
  });

  const modelQuery = useQuery({
    queryKey: ["openai-model"],
    queryFn: () => apiGetOpenAIModel(token!),
    enabled: Boolean(token) && isAdmin,
  });

  const aiLogsQuery = useQuery({
    queryKey: ["ai-logs-whatsapp"],
    queryFn: () => apiGetAiLogs(token!, 50, "whatsapp"),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 15000,
  });

  const baileysLogsQuery = useQuery({
    queryKey: ["baileys-logs"],
    queryFn: () => apiGetBaileysLogs(token!, 150),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 5000,
  });

  const messagesQuery = useQuery({
    queryKey: ["whatsapp-admin-messages"],
    queryFn: () => apiGetWhatsAppMessages(token!, 30),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 10000,
  });

  const connectMut = useMutation({
    mutationFn: () => apiConnectWhatsApp(token!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Não foi possível conectar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const disconnectMut = useMutation({
    mutationFn: () => apiDisconnectWhatsApp(token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-status"] }),
  });

  const saveModelMut = useMutation({
    mutationFn: (model: string) => apiSetOpenAIModel(token!, model),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["openai-model"] });
      void qc.invalidateQueries({ queryKey: ["whatsapp-stats"] });
      toast({ title: "Modelo atualizado", description: `Usando ${data.model}` });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar modelo", description: err.message, variant: "destructive" });
    },
  });

  const resetModelMut = useMutation({
    mutationFn: () => apiResetOpenAIModel(token!),
    onSuccess: (data) => {
      setSelectedModel(data.model);
      void qc.invalidateQueries({ queryKey: ["openai-model"] });
      toast({ title: "Modelo resetado", description: `Voltou para ${data.model} (.env)` });
    },
  });

  const conn = statusQuery.data?.connection;
  const isConnected = conn?.status === "connected";
  const isWaitingQr = Boolean(conn?.qrCode) || conn?.status === "qr";
  const isConnecting = conn?.status === "connecting" && !conn?.qrCode;

  useEffect(() => {
    if (modelQuery.data?.model) {
      setSelectedModel(modelQuery.data.model);
    }
  }, [modelQuery.data?.model]);

  useEffect(() => {
    if (!token || !isAdmin || autoConnectTried.current || statusQuery.isLoading) return;
    const status = conn?.status;
    if (status === "disconnected" || status === "error") {
      autoConnectTried.current = true;
      connectMut.mutate();
    }
  }, [token, isAdmin, conn?.status, statusQuery.isLoading]);

  const aiSummary = aiLogsQuery.data?.summary;
  const stats = statsQuery.data;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-900/15">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" size={20} />
          <div>
            <p className="text-sm font-semibold text-foreground">Área administrativa — /admin/whatsapp</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie conexão Baileys, modelo OpenAI, consumo de tokens e logs do sistema.
            </p>
          </div>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp & Inteligência Artificial</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conexão permanente, configuração do modelo GPT e monitoramento de logs.
        </p>
      </div>

      <Tabs defaultValue="conexao" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="conexao" className="gap-1.5">
            <Plug size={14} /> Conexão
          </TabsTrigger>
          <TabsTrigger value="ia" className="gap-1.5">
            <Sparkles size={14} /> IA & Consumo
          </TabsTrigger>
          <TabsTrigger value="baileys" className="gap-1.5">
            <ScrollText size={14} /> Logs Baileys
          </TabsTrigger>
        </TabsList>

        {/* ── ABA CONEXÃO ── */}
        <TabsContent value="conexao" className="space-y-6">
          {!isConnected && (
            <Card className="border-cgreen-200 dark:border-cgreen-900/40 bg-cgreen-50/50 dark:bg-cgreen-900/10">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cgreen-500 text-white">
                  <Plug size={32} />
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {isWaitingQr ? "QR Code pronto — escaneie abaixo" : isConnecting ? "Gerando QR Code…" : "Conectar número WhatsApp"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {isWaitingQr
                      ? "Abra WhatsApp → Dispositivos conectados → Conectar dispositivo."
                      : isConnecting
                        ? "Aguarde enquanto o Baileys prepara o pareamento."
                        : "Clique para iniciar a conexão e exibir o QR Code."}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="shrink-0 bg-cgreen-500 hover:bg-cgreen-700"
                  onClick={() => connectMut.mutate()}
                  disabled={connectMut.isPending || isConnecting}
                >
                  {connectMut.isPending || isConnecting ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Conectando…
                    </>
                  ) : isWaitingQr ? (
                    <>
                      <RefreshCw size={18} className="mr-2" />
                      Gerar novo QR
                    </>
                  ) : (
                    <>
                      <QrCode size={18} className="mr-2" />
                      Conectar WhatsApp
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {isConnected ? <Wifi size={16} className="text-cgreen-500" /> : <WifiOff size={16} />}
                  Status da conexão
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusQuery.isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <div className="space-y-2">
                    {statusBadge(conn?.status ?? "disconnected")}
                    {conn?.phoneNumber && (
                      <p className="text-sm flex items-center gap-1">
                        <Phone size={14} /> +{conn.phoneNumber.replace(/\D/g, "")}
                      </p>
                    )}
                    {conn?.connectedAt && (
                      <p className="text-xs text-muted-foreground">
                        Conectado desde {new Date(conn.connectedAt).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {conn?.errorMessage && <p className="text-xs text-destructive">{conn.errorMessage}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>Recebidas: {stats?.messagesInbound ?? "—"}</p>
                <p>Enviadas: {stats?.messagesOutbound ?? "—"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bot size={14} /> Agente IA
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium text-cgreen-600 dark:text-cgreen-400">
                  {stats?.openaiConfigured ? "OpenAI ativa" : "OpenAI não configurada"}
                </p>
                <p className="text-xs text-muted-foreground">Modelo: {stats?.openaiModel ?? "—"}</p>
              </CardContent>
            </Card>
          </div>

          {isConnected && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
                {connectMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw size={16} className="mr-2" />}
                Forçar reconexão
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={disconnectMut.isPending}>Desconectar sessão</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Encerra a sessão Baileys. Será necessário escanear o QR Code novamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disconnectMut.mutate()}>Desconectar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="ghost" onClick={() => statusQuery.refetch()}>Atualizar status</Button>
            </div>
          )}

          {conn?.qrCode && (
            <Card className="border-cgreen-300 dark:border-cgreen-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <QrCode size={18} className="text-cgreen-600" /> Escaneie o QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-6 bg-white rounded-xl shadow-inner">
                  <QRCodeSVG value={conn.qrCode} size={280} level="M" />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  WhatsApp → ⋮ → Dispositivos conectados → Conectar dispositivo
                </p>
              </CardContent>
            </Card>
          )}

          {isConnecting && !conn?.qrCode && (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
                <Loader2 className="animate-spin text-cgreen-500" size={24} />
                <span className="text-sm">Baileys gerando QR Code…</span>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagens recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {(messagesQuery.data?.messages ?? []).map((m) => (
                <div key={m.id} className="text-sm border-b border-border pb-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{m.direction === "inbound" ? "←" : "→"} {m.remotePhone}</span>
                    <span>{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="mt-1">{m.content ?? `[${m.messageType}]`}</p>
                </div>
              ))}
              {messagesQuery.data?.messages.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA IA & CONSUMO ── */}
        <TabsContent value="ia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles size={16} className="text-cgreen-500" />
                Modelo OpenAI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {modelQuery.isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium">Modelo ativo</label>
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {(modelQuery.data?.availableModels ?? []).map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => saveModelMut.mutate(selectedModel)}
                      disabled={saveModelMut.isPending || !selectedModel || selectedModel === modelQuery.data?.model}
                    >
                      {saveModelMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                      Salvar modelo
                    </Button>
                    {modelQuery.data?.runtimeOverride && (
                      <Button variant="outline" onClick={() => resetModelMut.mutate()} disabled={resetModelMut.isPending}>
                        Usar .env ({modelQuery.data.envDefault})
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">Atual: {modelQuery.data?.model}</Badge>
                    <Badge variant="outline">Padrão .env: {modelQuery.data?.envDefault}</Badge>
                    {!modelQuery.data?.openaiConfigured && (
                      <Badge variant="destructive">OPENAI_API_KEY não configurada</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A alteração vale imediatamente para novas mensagens WhatsApp, chat e parser. Persiste no servidor
                    entre reinícios.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Chamadas IA (WhatsApp)</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{stats?.aiLogs ?? aiSummary?.count ?? "—"}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tokens totais</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">
                {stats?.aiTokens?.toLocaleString("pt-BR") ?? "—"}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Custo estimado (USD)</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">
                ${(stats?.aiCostUsd ?? aiSummary?.totalCostUsd ?? 0).toFixed(4)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tempo médio</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">
                {aiSummary?.avgProcessingMs ? `${aiSummary.avgProcessingMs}ms` : "—"}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Logs IA — origem WhatsApp</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => aiLogsQuery.refetch()}>
                <RefreshCw size={14} className="mr-1" /> Atualizar
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Operação</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(aiLogsQuery.data?.logs ?? []).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs">{log.operation}</TableCell>
                      <TableCell className="text-xs">{log.model ?? "—"}</TableCell>
                      <TableCell className="text-xs">
                        {(log.inputTokens ?? 0) + (log.outputTokens ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.costUsd != null ? `$${log.costUsd.toFixed(5)}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.processingMs ? `${log.processingMs}ms` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(aiLogsQuery.data?.logs ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">
                        Nenhum log de IA via WhatsApp ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ABA LOGS BAILEYS ── */}
        <TabsContent value="baileys" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Eventos de conexão, keep-alive e erros do Baileys (atualiza a cada 5s).
            </p>
            <Button variant="outline" size="sm" onClick={() => baileysLogsQuery.refetch()}>
              <RefreshCw size={14} className="mr-1" /> Atualizar
            </Button>
          </div>

          {statusQuery.data?.keepAlive && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Keep-alive (fallback 30 min)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm grid gap-1 sm:grid-cols-3">
                <p>Última execução: {statusQuery.data.keepAlive.lastRunAt ? new Date(statusQuery.data.keepAlive.lastRunAt).toLocaleString("pt-BR") : "—"}</p>
                <p>Resultado: {statusQuery.data.keepAlive.lastResult ?? "—"}</p>
                <p>Ciclos: {statusQuery.data.keepAlive.runCount ?? 0}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="max-h-[32rem] overflow-y-auto divide-y divide-border">
                {(baileysLogsQuery.data?.logs ?? []).map((log) => (
                  <div key={log.id} className="px-4 py-3 text-sm hover:bg-muted/30">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        {levelBadge(log.level)}
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <p className="text-foreground">{log.message}</p>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {(baileysLogsQuery.data?.logs ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    Nenhum log Baileys ainda. Conecte o WhatsApp para ver eventos aqui.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
