/**
 * Painel admin WhatsApp — QR Baileys, modelo OpenAI, logs IA e logs Baileys.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect, useRef, useState } from "react";
// Importa funções/componentes de @tanstack/react-query
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"; // Polling de status e QR
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Bot,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Loader2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Phone,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Plug,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  QrCode,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  RefreshCw,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ScrollText,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Shield,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Sparkles,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Wifi,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  WifiOff,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "lucide-react";
// Importa funções/componentes de qrcode.react
import { QRCodeSVG } from "qrcode.react";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/admin
import { userIsAdmin } from "@/lib/admin";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiConnectWhatsApp,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiDisconnectWhatsApp,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetAiLogs,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetBaileysLogs,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetOpenAIModel,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetWhatsAppMessages,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetWhatsAppStatus,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetWhatsAppStats,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiResetOpenAIModel,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiSetOpenAIModel,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/api";
// Importa funções/componentes de @/components/ui/button
import { Button } from "@/components/ui/button";
// Importa funções/componentes de @/components/ui/card
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Importa funções/componentes de @/components/ui/badge
import { Badge } from "@/components/ui/badge";
// Importa funções/componentes de @/components/ui/tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Select,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectContent,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectItem,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectTrigger,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  SelectValue,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/components/ui/select";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Table,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  TableBody,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  TableCell,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  TableHead,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  TableHeader,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  TableRow,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/components/ui/table";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialog,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogAction,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogCancel,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogContent,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogDescription,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogFooter,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogHeader,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogTitle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  AlertDialogTrigger,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/components/ui/alert-dialog";
// Importa funções/componentes de @/hooks/use-toast
import { useToast } from "@/hooks/use-toast";

// Declara função auxiliar interna
function statusBadge(status: string) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    connected: { label: "Conectado", variant: "default" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    qr: { label: "Aguardando QR", variant: "secondary" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    connecting: { label: "Conectando", variant: "secondary" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    disconnected: { label: "Desconectado", variant: "outline" },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    error: { label: "Erro", variant: "destructive" },
  };
  // Constante local
  const s = map[status] ?? { label: status, variant: "outline" as const };
  // Retorna valor ou JSX para quem chamou
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

// Declara função auxiliar interna
function levelBadge(level: string) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    info: "default",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    warn: "secondary",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    error: "destructive",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    debug: "outline",
  };
  // Retorna valor ou JSX para quem chamou
  return <Badge variant={map[level] ?? "outline"}>{level}</Badge>;
}

// Exporta como padrão do módulo (import default)
export default function WhatsAppPage() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user } = useAuth();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { toast } = useToast();
  // Constante local
  const isAdmin = userIsAdmin(user);
  // Constante local
  const autoConnectTried = useRef(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [selectedModel, setSelectedModel] = useState("");

  // GET /api/admin/whatsapp/status — QR, conexão e keep-alive
  const statusQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["whatsapp-status"],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetWhatsAppStatus(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token) && isAdmin,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: (query) => {
      // Constante local
      const status = query.state.data?.connection.status;
      // Condição — executa bloco só se verdadeira
      if (status === "connected") return 10000;
      // Condição — executa bloco só se verdadeira
      if (status === "qr" || status === "connecting") return 2000;
      // Retorna valor ou JSX para quem chamou
      return 5000;
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
  });

  // Consulta à API com cache (React Query)
  const statsQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["whatsapp-stats"],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetWhatsAppStats(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token) && isAdmin,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 15000,
  });

  // Consulta à API com cache (React Query)
  const modelQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["openai-model"],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetOpenAIModel(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token) && isAdmin,
  });

  // Consulta à API com cache (React Query)
  const aiLogsQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["ai-logs-whatsapp"],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetAiLogs(token!, 50, "whatsapp"),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token) && isAdmin,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 15000,
  });

  // Consulta à API com cache (React Query)
  const baileysLogsQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["baileys-logs"],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetBaileysLogs(token!, 150),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token) && isAdmin,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 5000,
  });

  // Consulta à API com cache (React Query)
  const messagesQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["whatsapp-admin-messages"],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetWhatsAppMessages(token!, 30),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token) && isAdmin,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    refetchInterval: 10000,
  });

  // Mutação na API (criar/editar/excluir)
  const connectMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: () => apiConnectWhatsApp(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onError: (err: Error) => {
      // Exibe notificação temporária (toast) na tela
      toast({
        // Instrução do fluxo — parte da lógica de negócio ou interface
        title: "Não foi possível conectar",
        // Instrução do fluxo — parte da lógica de negócio ou interface
        description: err.message,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        variant: "destructive",
      });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
  });

  // Mutação na API (criar/editar/excluir)
  const disconnectMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: () => apiDisconnectWhatsApp(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-status"] }),
  });

  // Mutação na API (criar/editar/excluir)
  const saveModelMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: (model: string) => apiSetOpenAIModel(token!, model),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: (data) => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["openai-model"] });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["whatsapp-stats"] });
      // Exibe notificação temporária (toast) na tela
      toast({ title: "Modelo atualizado", description: `Usando ${data.model}` });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onError: (err: Error) => {
      // Exibe notificação temporária (toast) na tela
      toast({ title: "Erro ao salvar modelo", description: err.message, variant: "destructive" });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
  });

  // Mutação na API (criar/editar/excluir)
  const resetModelMut = useMutation({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mutationFn: () => apiResetOpenAIModel(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    onSuccess: (data) => {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setSelectedModel(data.model);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["openai-model"] });
      // Exibe notificação temporária (toast) na tela
      toast({ title: "Modelo resetado", description: `Voltou para ${data.model} (.env)` });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    },
  });

  // Constante local
  const conn = statusQuery.data?.connection;
  // Constante local
  const isConnected = conn?.status === "connected";
  // Constante local
  const isWaitingQr = Boolean(conn?.qrCode) || conn?.status === "qr";
  // Constante local
  const isConnecting = conn?.status === "connecting" && !conn?.qrCode;

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (modelQuery.data?.model) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setSelectedModel(modelQuery.data.model);
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [modelQuery.data?.model]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (!token || !isAdmin || autoConnectTried.current || statusQuery.isLoading) return;
    // Constante local
    const status = conn?.status;
    // Condição — executa bloco só se verdadeira
    if (status === "disconnected" || status === "error") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      autoConnectTried.current = true;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      connectMut.mutate();
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [token, isAdmin, conn?.status, statusQuery.isLoading]);

  // Constante local
  const aiSummary = aiLogsQuery.data?.summary;
  // Constante local
  const stats = statsQuery.data;

  // Retorna valor ou JSX para quem chamou
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Instrução do fluxo — parte da lógica de negócio ou interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {isWaitingQr ? "QR Code pronto — escaneie abaixo" : isConnecting ? "Gerando QR Code…" : "Conectar número WhatsApp"}
                  // Tag HTML na interface
                  </h2>
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {isWaitingQr
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      ? "Abra WhatsApp → Dispositivos conectados → Conectar dispositivo."
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      : isConnecting
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        ? "Aguarde enquanto o Baileys prepara o pareamento."
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        : "Clique para iniciar a conexão e exibir o QR Code."}
                  // Tag HTML na interface
                  </p>
                // Tag HTML na interface
                </div>
                // Elemento/componente React na tela
                <Button
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  size="lg"
                  // Classes CSS Tailwind — controla aparência visual
                  className="shrink-0 bg-cgreen-500 hover:bg-cgreen-700"
                  // Executa ação quando o usuário clica
                  onClick={() => connectMut.mutate()}
                  // Desabilita botão/campo (ex.: durante envio)
                  disabled={connectMut.isPending || isConnecting}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  {connectMut.isPending || isConnecting ? (
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    <>
                      // Elemento/componente React na tela
                      <Loader2 className="animate-spin mr-2" size={18} />
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      Conectando…
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    </>
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  ) : isWaitingQr ? (
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    <>
                      // Elemento/componente React na tela
                      <RefreshCw size={18} className="mr-2" />
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      Gerar novo QR
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    </>
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  ) : (
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    <>
                      // Elemento/componente React na tela
                      <QrCode size={18} className="mr-2" />
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      Conectar WhatsApp
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    </>
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  )}
                // Elemento/componente React na tela
                </Button>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Status da conexão
                // Elemento/componente React na tela
                </CardTitle>
              // Elemento/componente React na tela
              </CardHeader>
              // Elemento/componente React na tela
              <CardContent>
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {statusQuery.isLoading ? (
                  // Elemento/componente React na tela
                  <Loader2 className="animate-spin" size={20} />
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                ) : (
                  // Tag HTML na interface
                  <div className="space-y-2">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {statusBadge(conn?.status ?? "disconnected")}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {conn?.phoneNumber && (
                      // Tag HTML na interface
                      <p className="text-sm flex items-center gap-1">
                        // Elemento/componente React na tela
                        <Phone size={14} /> +{conn.phoneNumber.replace(/\D/g, "")}
                      // Tag HTML na interface
                      </p>
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    )}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {conn?.connectedAt && (
                      // Tag HTML na interface
                      <p className="text-xs text-muted-foreground">
                        // Formata número como moeda/texto local (pt-BR)
                        Conectado desde {new Date(conn.connectedAt).toLocaleString("pt-BR")}
                      // Tag HTML na interface
                      </p>
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    )}
                    // Classes CSS Tailwind — controla aparência visual
                    {conn?.errorMessage && <p className="text-xs text-destructive">{conn.errorMessage}</p>}
                  // Tag HTML na interface
                  </div>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
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

          // Instrução do fluxo — parte da lógica de negócio ou interface
          {isConnected && (
            // Tag HTML na interface
            <div className="flex flex-wrap gap-3">
              // Elemento/componente React na tela
              <Button variant="outline" onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
                // Classes CSS Tailwind — controla aparência visual
                {connectMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <RefreshCw size={16} className="mr-2" />}
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                      // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}

          // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  WhatsApp → ⋮ → Dispositivos conectados → Conectar dispositivo
                // Tag HTML na interface
                </p>
              // Elemento/componente React na tela
              </CardContent>
            // Elemento/componente React na tela
            </Card>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}

          // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              ))}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {messagesQuery.data?.messages.length === 0 && (
                // Tag HTML na interface
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Modelo OpenAI
              // Elemento/componente React na tela
              </CardTitle>
            // Elemento/componente React na tela
            </CardHeader>
            // Elemento/componente React na tela
            <CardContent className="space-y-4">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {modelQuery.isLoading ? (
                // Elemento/componente React na tela
                <Loader2 className="animate-spin" size={20} />
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              ) : (
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                              // Instrução do fluxo — parte da lógica de negócio ou interface
                              {m.label}
                            // Elemento/componente React na tela
                            </SelectItem>
                          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    >
                      // Classes CSS Tailwind — controla aparência visual
                      {saveModelMut.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      Salvar modelo
                    // Elemento/componente React na tela
                    </Button>
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {modelQuery.data?.runtimeOverride && (
                      // Elemento/componente React na tela
                      <Button variant="outline" onClick={() => resetModelMut.mutate()} disabled={resetModelMut.isPending}>
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        Usar .env ({modelQuery.data.envDefault})
                      // Elemento/componente React na tela
                      </Button>
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    )}
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    // Elemento/componente React na tela
                    <Badge variant="outline">Atual: {modelQuery.data?.model}</Badge>
                    // Elemento/componente React na tela
                    <Badge variant="outline">Padrão .env: {modelQuery.data?.envDefault}</Badge>
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {!modelQuery.data?.openaiConfigured && (
                      // Elemento/componente React na tela
                      <Badge variant="destructive">OPENAI_API_KEY não configurada</Badge>
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    )}
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <p className="text-xs text-muted-foreground">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    A alteração vale imediatamente para novas mensagens WhatsApp, chat e parser. Persiste no servidor
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    entre reinícios.
                  // Tag HTML na interface
                  </p>
                // Instrução do fluxo — parte da lógica de negócio ou interface
                </>
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                // Instrução do fluxo — parte da lógica de negócio ou interface
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
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {(log.inputTokens ?? 0) + (log.outputTokens ?? 0)}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs">
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {log.costUsd != null ? `$${log.costUsd.toFixed(5)}` : "—"}
                      // Elemento/componente React na tela
                      </TableCell>
                      // Elemento/componente React na tela
                      <TableCell className="text-xs">
                        // Instrução do fluxo — parte da lógica de negócio ou interface
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
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  ))}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  {(aiLogsQuery.data?.logs ?? []).length === 0 && (
                    // Elemento/componente React na tela
                    <TableRow>
                      // Elemento/componente React na tela
                      <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        Nenhum log de IA via WhatsApp ainda.
                      // Elemento/componente React na tela
                      </TableCell>
                    // Elemento/componente React na tela
                    </TableRow>
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
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

          // Instrução do fluxo — parte da lógica de negócio ou interface
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
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
                        // Instrução do fluxo — parte da lógica de negócio ou interface
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
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {log.meta && Object.keys(log.meta).length > 0 && (
                      // Tag HTML na interface
                      <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                        // Transforma objeto em texto JSON para enviar à API
                        {JSON.stringify(log.meta, null, 2)}
                      // Tag HTML na interface
                      </pre>
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    )}
                  // Tag HTML na interface
                  </div>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                ))}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {(baileysLogsQuery.data?.logs ?? []).length === 0 && (
                  // Tag HTML na interface
                  <p className="text-sm text-muted-foreground text-center py-10">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Nenhum log Baileys ainda. Conecte o WhatsApp para ver eventos aqui.
                  // Tag HTML na interface
                  </p>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
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
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
