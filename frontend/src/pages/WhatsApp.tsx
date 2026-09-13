/**
 * Painel WhatsApp — conexão Baileys e mensagens admin
 *
 * O que faz: QR code/pareamento, status da sessão, envio de teste, logs recentes e
 * controles admin (reconectar, desconectar) para o número financeiro do sistema.
 *
 * Onde entra: rota /whatsapp (staff/admin); complementa o canal onde usuários
 * registram gastos por texto/áudio processados em backend/whatsapp/message-handler.
 *
 * Integrações: backend /api/admin/whatsapp/*, client.ts (Baileys), keep-alive,
 * polling ou refresh manual de status no frontend.
 *
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
import { userIsAdmin } from "@/lib/admin";
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

// Declara função auxiliar interna
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

// Declara função auxiliar interna
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
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { toast } = useToast();
  const isAdmin = userIsAdmin(user);
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
  // Consulta à API com cache (React Query)
  const statsQuery = useQuery({
    queryKey: ["whatsapp-stats"],
    queryFn: () => apiGetWhatsAppStats(token!),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 15000,
  });
  // Consulta à API com cache (React Query)
  const modelQuery = useQuery({
    queryKey: ["openai-model"],
    queryFn: () => apiGetOpenAIModel(token!),
    enabled: Boolean(token) && isAdmin,
  });
  // Consulta à API com cache (React Query)
  const aiLogsQuery = useQuery({
    queryKey: ["ai-logs-whatsapp"],
    queryFn: () => apiGetAiLogs(token!, 50, "whatsapp"),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 15000,
  });
  // Consulta à API com cache (React Query)
  const baileysLogsQuery = useQuery({
    queryKey: ["baileys-logs"],
    queryFn: () => apiGetBaileysLogs(token!, 150),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 5000,
  });
  // Consulta à API com cache (React Query)
  const messagesQuery = useQuery({
    queryKey: ["whatsapp-admin-messages"],
    queryFn: () => apiGetWhatsAppMessages(token!, 30),
    enabled: Boolean(token) && isAdmin,
    refetchInterval: 10000,
  });
  // Mutação na API (criar/editar/excluir)
  const connectMut = useMutation({
    mutationFn: () => apiConnectWhatsApp(token!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
    },
    onError: (err: Error) => {
      // Exibe notificação temporária (toast) na tela
      toast({
        title: "Não foi possível conectar",
        description: err.message,
        variant: "destructive",
      });
    },
  });
  // Mutação na API (criar/editar/excluir)
  const disconnectMut = useMutation({
    mutationFn: () => apiDisconnectWhatsApp(token!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-status"] }),
  });
  // Mutação na API (criar/editar/excluir)
  const saveModelMut = useMutation({
    mutationFn: (model: string) => apiSetOpenAIModel(token!, model),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["openai-model"] });
      void qc.invalidateQueries({ queryKey: ["whatsapp-stats"] });
      // Exibe notificação temporária (toast) na tela
      toast({ title: "Modelo atualizado", description: `Usando ${data.model}` });
    },
    onError: (err: Error) => {
      // Exibe notificação temporária (toast) na tela
      toast({ title: "Erro ao salvar modelo", description: err.message, variant: "destructive" });
    },
  });
  // Mutação na API (criar/editar/excluir)
  const resetModelMut = useMutation({
    mutationFn: () => apiResetOpenAIModel(token!),
    onSuccess: (data) => {
      setSelectedModel(data.model);
      void qc.invalidateQueries({ queryKey: ["openai-model"] });
      // Exibe notificação temporária (toast) na tela
      toast({ title: "Modelo resetado", description: `Voltou para ${data.model} (.env)` });
    },
  });
  const conn = statusQuery.data?.connection;
  const isConnected = conn?.status === "connected";
  const isWaitingQr = Boolean(conn?.qrCode) || conn?.status === "qr";
  const isConnecting = conn?.status === "connecting" && !conn?.qrCode;
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    if (modelQuery.data?.model) {
      setSelectedModel(modelQuery.data.model);
    }
  }, [modelQuery.data?.model]);
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
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
    // Tag HTML na interface
    <div className="space-y-6 max-w-6xl">
      // Tag HTML na interface
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-900/15">
        // Tag HTML na interface
        <div className="flex items-start gap-3">
          // Elemento/componente React na tela
          <Shield className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" size={20} />
          // Tag HTML na interface
          <div>
            // Tag HTML na interface
            <p className="text-sm font-semibold text-foreground">Área administrativa — /admin/whatsapp</p>
            // Tag HTML na interface
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie conexão Baileys, modelo OpenAI, consumo de tokens e logs do sistema.
            // Tag HTML na interface
            </p>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div>
        // Tag HTML na interface
        <h1 className="text-2xl font-bold text-foreground">WhatsApp & Inteligência Artificial</h1>
        // Tag HTML na interface
        <p className="text-sm text-muted-foreground mt-1">
          Conexão permanente, configuração do modelo GPT e monitoramento de logs.
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>
      // Elemento/componente React na tela
      <Tabs defaultValue="conexao" className="space-y-4">
        // Elemento/componente React na tela
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          // Elemento/componente React na tela
          <TabsTrigger value="conexao" className="gap-1.5">
            // Elemento/componente React na tela
            <Plug size={14} /> Conexão
          // Elemento/componente React na tela
          </TabsTrigger>
          // Elemento/componente React na tela
          <TabsTrigger value="ia" className="gap-1.5">
            // Elemento/componente React na tela
            <Sparkles size={14} /> IA & Consumo
          // Elemento/componente React na tela
          </TabsTrigger>
          // Elemento/componente React na tela
          <TabsTrigger value="baileys" className="gap-1.5">
            // Elemento/componente React na tela
            <ScrollText size={14} /> Logs Baileys
          // Elemento/componente React na tela
          </TabsTrigger>
        // Elemento/componente React na tela
        </TabsList>
        {/* ── ABA CONEXÃO ── */}
        <TabsContent value="conexao" className="space-y-6">
          {!isConnected && (
            // Elemento/componente React na tela
            <Card className="border-cgreen-200 dark:border-cgreen-900/40 bg-cgreen-50/50 dark:bg-cgreen-900/10">
              // Elemento/componente React na tela
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
                // Tag HTML na interface
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-cgreen-500 text-white">
                  // Elemento/componente React na tela
                  <Plug size={32} />
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <div className="flex-1 space-y-1">
                  // Tag HTML na interface
                  <h2 className="text-lg font-semibold text-foreground">
                    {isWaitingQr ? "QR Code pronto — escaneie abaixo" : isConnecting ? "Gerando QR Code…" : "Conectar número WhatsApp"}
                  // Tag HTML na interface
                  </h2>
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground">
                    {isWaitingQr
                      ? "Abra WhatsApp → Dispositivos conectados → Conectar dispositivo."
                      : isConnecting
                        ? "Aguarde enquanto o Baileys prepara o pareamento."
                        : "Clique para iniciar a conexão e exibir o QR Code."}
                  // Tag HTML na interface
                  </p>
                // Tag HTML na interface
                </div>
                // Elemento/componente React na tela
                <Button
                  size="lg"
                  // Classes CSS Tailwind — controla aparência visual
                  className="shrink-0 bg-cgreen-500 hover:bg-cgreen-700"
                  // Executa ação quando o usuário clica
                  onClick={() => connectMut.mutate()}
                  // Desabilita botão/campo (ex.: durante envio)
                  disabled={connectMut.isPending || isConnecting}
                >
                  {connectMut.isPending || isConnecting ? (
                    <>
                      // Elemento/componente React na tela
                      <Loader2 className="animate-spin mr-2" size={18} />
                      Conectando…
                    </>
                  ) : isWaitingQr ? (
                    <>
                      // Elemento/componente React na tela
                      <RefreshCw size={18} className="mr-2" />
                      Gerar novo QR
                    </>
                  ) : (
                    <>
                      // Elemento/componente React na tela
                      <QrCode size={18} className="mr-2" />
                      Conectar WhatsApp
                    </>
                  )}
                // Elemento/componente React na tela
                </Button>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          )}
          // Tag HTML na interface
          <div className="grid gap-4 md:grid-cols-3">
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2">
                // Elemento/componente React na tela
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  // Classes CSS Tailwind — controla aparência visual
                  {isConnected ? <Wifi size={16} className="text-cgreen-500" /> : <WifiOff size={16} />}
                  Status da conexão
                // Elemento/componente React na tela
                </CardTitle>
              // Elemento/componente React na tela
              </CardHeader>
              // Elemento/componente React na tela
              <CardContent>
                {statusQuery.isLoading ? (
                  // Elemento/componente React na tela
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  // Tag HTML na interface
                  <div className="space-y-2">
                    {statusBadge(conn?.status ?? "disconnected")}
                    {conn?.phoneNumber && (
                      // Tag HTML na interface
                      <p className="text-sm flex items-center gap-1">
                        // Elemento/componente React na tela
                        <Phone size={14} /> +{conn.phoneNumber.replace(/\D/g, "")}
                      // Tag HTML na interface
                      </p>
                    )}
                    {conn?.connectedAt && (
                      // Tag HTML na interface
                      <p className="text-xs text-muted-foreground">
                        // Formata número como moeda/texto local (pt-BR)
                        Conectado desde {new Date(conn.connectedAt).toLocaleString("pt-BR")}
                      // Tag HTML na interface
                      </p>
                    )}
                    // Classes CSS Tailwind — controla aparência visual
                    {conn?.errorMessage && <p className="text-xs text-destructive">{conn.errorMessage}</p>}
                  // Tag HTML na interface
                  </div>
                )}
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2">
                // Elemento/componente React na tela
                <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
              // Elemento/componente React na tela
              </CardHeader>
              // Elemento/componente React na tela
              <CardContent className="text-sm space-y-1">
                // Tag HTML na interface
                <p>Recebidas: {stats?.messagesInbound ?? "—"}</p>
                // Tag HTML na interface
                <p>Enviadas: {stats?.messagesOutbound ?? "—"}</p>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2">
                // Elemento/componente React na tela
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  // Elemento/componente React na tela
                  <Bot size={14} /> Agente IA
                // Elemento/componente React na tela
                </CardTitle>
              // Elemento/componente React na tela
              </CardHeader>
              // Elemento/componente React na tela
              <CardContent className="text-sm space-y-1">
                // Tag HTML na interface
                <p className="font-medium text-cgreen-600 dark:text-cgreen-400">
                  {stats?.openaiConfigured ? "OpenAI ativa" : "OpenAI não configurada"}
                // Tag HTML na interface
                </p>
                // Tag HTML na interface
                <p className="text-xs text-muted-foreground">Modelo: {stats?.openaiModel ?? "—"}</p>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          // Tag HTML na interface
          </div>
          {isConnected && (
            // Tag HTML na interface
            <div className="flex flex-wrap gap-3">
              // Elemento/componente React na tela
              <Button variant="outline" onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
                // Classes CSS Tailwind — controla aparência visual
                {connectMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw size={16} className="mr-2" />}
                Forçar reconexão
              // Elemento/componente React na tela
              </Button>
              // Elemento/componente React na tela
              <AlertDialog>
                // Elemento/componente React na tela
                <AlertDialogTrigger asChild>
                  // Elemento/componente React na tela
                  <Button variant="outline" disabled={disconnectMut.isPending}>Desconectar sessão</Button>
                // Elemento/componente React na tela
                </AlertDialogTrigger>
                // Elemento/componente React na tela
                <AlertDialogContent>
                  // Elemento/componente React na tela
                  <AlertDialogHeader>
                    // Elemento/componente React na tela
                    <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                    // Elemento/componente React na tela
                    <AlertDialogDescription>
                      Encerra a sessão Baileys. Será necessário escanear o QR Code novamente.
                    // Elemento/componente React na tela
                    </AlertDialogDescription>
                  // Elemento/componente React na tela
                  </AlertDialogHeader>
                  // Elemento/componente React na tela
                  <AlertDialogFooter>
                    // Elemento/componente React na tela
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    // Elemento/componente React na tela
                    <AlertDialogAction onClick={() => disconnectMut.mutate()}>Desconectar</AlertDialogAction>
                  // Elemento/componente React na tela
                  </AlertDialogFooter>
                // Elemento/componente React na tela
                </AlertDialogContent>
              // Elemento/componente React na tela
              </AlertDialog>
              // Elemento/componente React na tela
              <Button variant="ghost" onClick={() => statusQuery.refetch()}>Atualizar status</Button>
            // Tag HTML na interface
            </div>
          )}
          {conn?.qrCode && (
            // Elemento/componente React na tela
            <Card className="border-cgreen-300 dark:border-cgreen-800">
              // Elemento/componente React na tela
              <CardHeader>
                // Elemento/componente React na tela
                <CardTitle className="flex items-center gap-2 text-base">
                  // Elemento/componente React na tela
                  <QrCode size={18} className="text-cgreen-600" /> Escaneie o QR Code
                // Elemento/componente React na tela
                </CardTitle>
              // Elemento/componente React na tela
              </CardHeader>
              // Elemento/componente React na tela
              <CardContent className="space-y-4">
                // Tag HTML na interface
                <div className="flex justify-center p-6 bg-white rounded-xl shadow-inner">
                  // Elemento/componente React na tela
                  <QRCodeSVG value={conn.qrCode} size={280} level="M" />
                // Tag HTML na interface
                </div>
                // Tag HTML na interface
                <p className="text-center text-xs text-muted-foreground">
                  WhatsApp → ⋮ → Dispositivos conectados → Conectar dispositivo
                // Tag HTML na interface
                </p>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          )}
          {isConnecting && !conn?.qrCode && (
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
                // Elemento/componente React na tela
                <Loader2 className="animate-spin text-cgreen-500" size={24} />
                // Tag HTML na interface
                <span className="text-sm">Baileys gerando QR Code…</span>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          )}
          // Elemento/componente React na tela
          <Card>
            // Elemento/componente React na tela
            <CardHeader>
              // Elemento/componente React na tela
              <CardTitle className="text-base">Mensagens recentes</CardTitle>
            // Elemento/componente React na tela
            </CardHeader>
            // Elemento/componente React na tela
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              // Percorre lista e renderiza um item para cada elemento
              {(messagesQuery.data?.messages ?? []).map((m) => (
                // Tag HTML na interface
                <div key={m.id} className="text-sm border-b border-border pb-2">
                  // Tag HTML na interface
                  <div className="flex justify-between text-xs text-muted-foreground">
                    // Tag HTML na interface
                    <span>{m.direction === "inbound" ? "←" : "→"} {m.remotePhone}</span>
                    // Tag HTML na interface
                    <span>{new Date(m.createdAt).toLocaleString("pt-BR")}</span>
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <p className="mt-1">{m.content ?? `[${m.messageType}]`}</p>
                // Tag HTML na interface
                </div>
              ))}
              {messagesQuery.data?.messages.length === 0 && (
                // Tag HTML na interface
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
              )}
            // Elemento/componente React na tela
            </CardContent>
          // Elemento/componente React na tela
          </Card>
        // Elemento/componente React na tela
        </TabsContent>
        {/* ── ABA IA & CONSUMO ── */}
        <TabsContent value="ia" className="space-y-6">
          // Elemento/componente React na tela
          <Card>
            // Elemento/componente React na tela
            <CardHeader>
              // Elemento/componente React na tela
              <CardTitle className="text-base flex items-center gap-2">
                // Elemento/componente React na tela
                <Sparkles size={16} className="text-cgreen-500" />
                Modelo OpenAI
              // Elemento/componente React na tela
              </CardTitle>
            // Elemento/componente React na tela
            </CardHeader>
            // Elemento/componente React na tela
            <CardContent className="space-y-4">
              {modelQuery.isLoading ? (
                // Elemento/componente React na tela
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  // Tag HTML na interface
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    // Tag HTML na interface
                    <div className="flex-1 space-y-2">
                      // Tag HTML na interface
                      <label className="text-sm font-medium">Modelo ativo</label>
                      // Elemento/componente React na tela
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        // Elemento/componente React na tela
                        <SelectTrigger>
                          // Elemento/componente React na tela
                          <SelectValue placeholder="Selecione o modelo" />
                        // Elemento/componente React na tela
                        </SelectTrigger>
                        // Elemento/componente React na tela
                        <SelectContent>
                          // Percorre lista e renderiza um item para cada elemento
                          {(modelQuery.data?.availableModels ?? []).map((m) => (
                            // Elemento/componente React na tela
                            <SelectItem key={m.id} value={m.id}>
                              {m.label}
                            // Elemento/componente React na tela
                            </SelectItem>
                          ))}
                        // Elemento/componente React na tela
                        </SelectContent>
                      // Elemento/componente React na tela
                      </Select>
                    // Tag HTML na interface
                    </div>
                    // Elemento/componente React na tela
                    <Button
                      // Executa ação quando o usuário clica
                      onClick={() => saveModelMut.mutate(selectedModel)}
                      // Desabilita botão/campo (ex.: durante envio)
                      disabled={saveModelMut.isPending || !selectedModel || selectedModel === modelQuery.data?.model}
                    >
                      // Classes CSS Tailwind — controla aparência visual
                      {saveModelMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                      Salvar modelo
                    // Elemento/componente React na tela
                    </Button>
                    {modelQuery.data?.runtimeOverride && (
                      // Elemento/componente React na tela
                      <Button variant="outline" onClick={() => resetModelMut.mutate()} disabled={resetModelMut.isPending}>
                        Usar .env ({modelQuery.data.envDefault})
                      // Elemento/componente React na tela
                      </Button>
                    )}
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    // Elemento/componente React na tela
                    <Badge variant="outline">Atual: {modelQuery.data?.model}</Badge>
                    // Elemento/componente React na tela
                    <Badge variant="outline">Padrão .env: {modelQuery.data?.envDefault}</Badge>
                    {!modelQuery.data?.openaiConfigured && (
                      // Elemento/componente React na tela
                      <Badge variant="destructive">OPENAI_API_KEY não configurada</Badge>
                    )}
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <p className="text-xs text-muted-foreground">
                    A alteração vale imediatamente para novas mensagens WhatsApp, chat e parser. Persiste no servidor
                    entre reinícios.
                  // Tag HTML na interface
                  </p>
                </>
              )}
            // Elemento/componente React na tela
            </CardContent>
          // Elemento/componente React na tela
          </Card>
          // Tag HTML na interface
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2"><CardTitle className="text-sm">Chamadas IA (WhatsApp)</CardTitle></CardHeader>
              // Elemento/componente React na tela
              <CardContent className="text-2xl font-bold">{stats?.aiLogs ?? aiSummary?.count ?? "—"}</CardContent>
            // Elemento/componente React na tela
            </Card>
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tokens totais</CardTitle></CardHeader>
              // Elemento/componente React na tela
              <CardContent className="text-2xl font-bold">
                // Formata número como moeda/texto local (pt-BR)
                {stats?.aiTokens?.toLocaleString("pt-BR") ?? "—"}
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2"><CardTitle className="text-sm">Custo estimado (USD)</CardTitle></CardHeader>
              // Elemento/componente React na tela
              <CardContent className="text-2xl font-bold">
                ${(stats?.aiCostUsd ?? aiSummary?.totalCostUsd ?? 0).toFixed(4)}
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tempo médio</CardTitle></CardHeader>
              // Elemento/componente React na tela
              <CardContent className="text-2xl font-bold">
                {aiSummary?.avgProcessingMs ? `${aiSummary.avgProcessingMs}ms` : "—"}
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <Card>
            // Elemento/componente React na tela
            <CardHeader className="flex flex-row items-center justify-between">
              // Elemento/componente React na tela
              <CardTitle className="text-base">Logs IA — origem WhatsApp</CardTitle>
              // Elemento/componente React na tela
              <Button variant="ghost" size="sm" onClick={() => aiLogsQuery.refetch()}>
                // Elemento/componente React na tela
                <RefreshCw size={14} className="mr-1" /> Atualizar
              // Elemento/componente React na tela
              </Button>
            // Elemento/componente React na tela
            </CardHeader>
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
                    <TableHead>Operação</TableHead>
                    // Elemento/componente React na tela
                    <TableHead>Modelo</TableHead>
                    // Elemento/componente React na tela
                    <TableHead>Tokens</TableHead>
                    // Elemento/componente React na tela
                    <TableHead>Custo</TableHead>
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
                  {(aiLogsQuery.data?.logs ?? []).map((log) => (
                    // Elemento/componente React na tela
                    <TableRow key={log.id}>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs whitespace-nowrap">
                        // Formata número como moeda/texto local (pt-BR)
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs">{log.operation}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs">{log.model ?? "—"}</TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs">
                        {(log.inputTokens ?? 0) + (log.outputTokens ?? 0)}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs">
                        {log.costUsd != null ? `$${log.costUsd.toFixed(5)}` : "—"}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs">
                        {log.processingMs ? `${log.processingMs}ms` : "—"}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell>
                        // Elemento/componente React na tela
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                      // Elemento/componente React na tela
                      </TableCell>
                    // Elemento/componente React na tela
                    </TableRow>
                  ))}
                  {(aiLogsQuery.data?.logs ?? []).length === 0 && (
                    // Elemento/componente React na tela
                    <TableRow>
                      // Elemento/componente React na tela
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">
                        Nenhum log de IA via WhatsApp ainda.
                      // Elemento/componente React na tela
                      </TableCell>
                    // Elemento/componente React na tela
                    </TableRow>
                  )}
                // Elemento/componente React na tela
                </TableBody>
              // Elemento/componente React na tela
              </Table>
            // Elemento/componente React na tela
            </CardContent>
          // Elemento/componente React na tela
          </Card>
        // Elemento/componente React na tela
        </TabsContent>
        {/* ── ABA LOGS BAILEYS ── */}
        <TabsContent value="baileys" className="space-y-4">
          // Tag HTML na interface
          <div className="flex items-center justify-between">
            // Tag HTML na interface
            <p className="text-sm text-muted-foreground">
              Eventos de conexão, keep-alive e erros do Baileys (atualiza a cada 5s).
            // Tag HTML na interface
            </p>
            // Elemento/componente React na tela
            <Button variant="outline" size="sm" onClick={() => baileysLogsQuery.refetch()}>
              // Elemento/componente React na tela
              <RefreshCw size={14} className="mr-1" /> Atualizar
            // Elemento/componente React na tela
            </Button>
          // Tag HTML na interface
          </div>
          {statusQuery.data?.keepAlive && (
            // Elemento/componente React na tela
            <Card>
              // Elemento/componente React na tela
              <CardHeader className="pb-2">
                // Elemento/componente React na tela
                <CardTitle className="text-sm">Keep-alive (fallback 30 min)</CardTitle>
              // Elemento/componente React na tela
              </CardHeader>
              // Elemento/componente React na tela
              <CardContent className="text-sm grid gap-1 sm:grid-cols-3">
                // Tag HTML na interface
                <p>Última execução: {statusQuery.data.keepAlive.lastRunAt ? new Date(statusQuery.data.keepAlive.lastRunAt).toLocaleString("pt-BR") : "—"}</p>
                // Tag HTML na interface
                <p>Resultado: {statusQuery.data.keepAlive.lastResult ?? "—"}</p>
                // Tag HTML na interface
                <p>Ciclos: {statusQuery.data.keepAlive.runCount ?? 0}</p>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          )}
          // Elemento/componente React na tela
          <Card>
            // Elemento/componente React na tela
            <CardContent className="p-0">
              // Tag HTML na interface
              <div className="max-h-[32rem] overflow-y-auto divide-y divide-border">
                // Percorre lista e renderiza um item para cada elemento
                {(baileysLogsQuery.data?.logs ?? []).map((log) => (
                  // Tag HTML na interface
                  <div key={log.id} className="px-4 py-3 text-sm hover:bg-muted/30">
                    // Tag HTML na interface
                    <div className="flex items-center justify-between gap-2 mb-1">
                      // Tag HTML na interface
                      <div className="flex items-center gap-2">
                        {levelBadge(log.level)}
                        // Tag HTML na interface
                        <span className="text-xs text-muted-foreground">
                          // Formata número como moeda/texto local (pt-BR)
                          {new Date(log.createdAt).toLocaleString("pt-BR")}
                        // Tag HTML na interface
                        </span>
                      // Tag HTML na interface
                      </div>
                    // Tag HTML na interface
                    </div>
                    // Tag HTML na interface
                    <p className="text-foreground">{log.message}</p>
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      // Tag HTML na interface
                      <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                        // Transforma objeto em texto JSON para enviar à API
                        {JSON.stringify(log.meta, null, 2)}
                      // Tag HTML na interface
                      </pre>
                    )}
                  // Tag HTML na interface
                  </div>
                ))}
                {(baileysLogsQuery.data?.logs ?? []).length === 0 && (
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground text-center py-10">
                    Nenhum log Baileys ainda. Conecte o WhatsApp para ver eventos aqui.
                  // Tag HTML na interface
                  </p>
                )}
              // Tag HTML na interface
              </div>
            // Elemento/componente React na tela
            </CardContent>
          // Elemento/componente React na tela
          </Card>
        // Elemento/componente React na tela
        </TabsContent>
      // Elemento/componente React na tela
      </Tabs>
    // Tag HTML na interface
    </div>
  );
}
