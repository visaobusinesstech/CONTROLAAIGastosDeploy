/**
 * Chat financeiro com IA — sincronizado com o agente WhatsApp.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useState, useRef, useEffect, useCallback } from "react"; // Estado do chat e scroll
// Importa funções/componentes de next-themes
import { useTheme } from "next-themes";
// Importa funções/componentes de framer-motion
import { motion } from "framer-motion";
// Importa funções/componentes de @tanstack/react-query
import { useQuery, useQueryClient } from "@tanstack/react-query";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Send,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Plus,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  MessageCircle,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Trash2,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Lightbulb,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  PenLine,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  PieChart,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Sparkles,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Target,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  PanelLeft,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  X,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "lucide-react";
// Importa funções/componentes de @/lib/utils
import { cn } from "@/lib/utils";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiDeleteAiConversation,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetAiConversations,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiGetAiWelcome,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  apiPostAiChat,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/api";
// Importa funções/componentes de sonner
import { toast } from "sonner";

// Define formato de dados (TypeScript)
type ChatMessage = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  role: "user" | "assistant";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  content: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  timestamp: string;
};

// Instrução do fluxo — parte da lógica de negócio ou interface
const suggestions: { label: string; send: string }[] = [
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { label: "Registrar um gasto", send: "Gastei 45 no almoço" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { label: "Resumo do mês", send: "Quanto gastei esse mês?" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { label: "Dicas de economia", send: "Minha situação financeira está saudável?" },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  { label: "Menu do agente", send: "Oi" },
// Instrução do fluxo — parte da lógica de negócio ou interface
];

// Declara função auxiliar interna
function stripMarkdown(text: string): string {
  // Retorna valor ou JSX para quem chamou
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
}

// Declara função auxiliar interna
function formatTime(isoOrTime?: string): string {
  // Condição — executa bloco só se verdadeira
  if (!isoOrTime) {
    // Retorna valor ou JSX para quem chamou
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  // Condição — executa bloco só se verdadeira
  if (isoOrTime.includes("T")) {
    // Retorna valor ou JSX para quem chamou
    return new Date(isoOrTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  // Retorna valor ou JSX para quem chamou
  return isoOrTime;
}

// Declara função auxiliar interna
function parseStoredMessages(raw: unknown): ChatMessage[] {
  // Condição — executa bloco só se verdadeira
  if (!Array.isArray(raw)) return [];
  // Retorna valor ou JSX para quem chamou
  return raw
    // Filtra lista — mantém só itens que passam no teste
    .filter((m): m is { role: string; content: string; timestamp?: string } => {
      // Retorna valor ou JSX para quem chamou
      return Boolean(m && typeof m === "object" && "role" in m && "content" in m);
    })
    // Percorre lista e renderiza um item para cada elemento
    .map((m) => ({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      role: m.role === "user" ? "user" : "assistant",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      content: stripMarkdown(String(m.content)),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      timestamp: formatTime(m.timestamp),
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }));
}

// Declara função auxiliar interna
function welcomeMessage(content: string): ChatMessage {
  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    role: "assistant",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    content: stripMarkdown(content),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    timestamp: formatTime(),
  };
}

// Constante local
const chatBgLight =
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";
// Constante local
const chatBgDark =
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

// Exporta como padrão do módulo (import default)
export default function AiChat() {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { resolvedTheme } = useTheme();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Consulta à API com cache (React Query)
  const qc = useQueryClient();
  // Constante local
  const isDark = resolvedTheme === "dark";

  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [input, setInput] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [conversationId, setConversationId] = useState<string | undefined>();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [isTyping, setIsTyping] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [mobileListOpen, setMobileListOpen] = useState(false);
  // Constante local
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Constante local
  const bootstrapped = useRef(false);

  // Consulta à API com cache (React Query)
  const welcomeQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["ai-welcome", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetAiWelcome(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
  });

  // Consulta à API com cache (React Query)
  const convQuery = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["ai-conversations", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetAiConversations(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
  });

  // Função memorizada — evita recriar a cada render
  const startNewChat = useCallback(() => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setConversationId(undefined);
    // Condição — executa bloco só se verdadeira
    if (welcomeQuery.data?.message) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setMessages([welcomeMessage(welcomeQuery.data.message)]);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } else {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setMessages([]);
    }
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setMobileListOpen(false);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [welcomeQuery.data?.message]);

  // Função memorizada — evita recriar a cada render
  const loadConversation = useCallback((id: string, rawMessages: unknown) => {
    // Constante local
    const parsed = parseStoredMessages(rawMessages);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setConversationId(id);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setMessages(parsed.length ? parsed : welcomeQuery.data?.message ? [welcomeMessage(welcomeQuery.data.message)] : []);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setMobileListOpen(false);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [welcomeQuery.data?.message]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (bootstrapped.current || !welcomeQuery.data?.message) return;
    // Condição — executa bloco só se verdadeira
    if (convQuery.isLoading) return;

    // Instrução do fluxo — parte da lógica de negócio ou interface
    bootstrapped.current = true;
    // Constante local
    const convs = convQuery.data?.conversations ?? [];
    // Condição — executa bloco só se verdadeira
    if (convs.length > 0) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      loadConversation(convs[0].id, convs[0].messages);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } else {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      startNewChat();
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [convQuery.data, convQuery.isLoading, welcomeQuery.data, loadConversation, startNewChat]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [messages, isTyping]);

  // Constante local
  const handleSend = async (text?: string) => {
    // Constante local
    const msg = text || input;
    // Condição — executa bloco só se verdadeira
    if (!msg.trim() || !token) return;

    // Instrução do fluxo — parte da lógica de negócio ou interface
    const userMsg: ChatMessage = {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      role: "user",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      content: msg,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      timestamp: formatTime(),
    };
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setMessages((prev) => [...prev, userMsg]);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setInput("");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setIsTyping(true);

    // Tenta executar — erros vão para catch
    try {
      // POST /api/ai/chat — envia mensagem e recebe resposta do agente
      const resp = await apiPostAiChat(token, { message: msg, conversationId });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setConversationId(resp.conversationId);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setMessages((prev) => [
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ...prev,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {
          // Instrução do fluxo — parte da lógica de negócio ou interface
          role: "assistant",
          // Instrução do fluxo — parte da lógica de negócio ou interface
          content: stripMarkdown(resp.response),
          // Instrução do fluxo — parte da lógica de negócio ou interface
          timestamp: formatTime(),
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ]);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      void qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      // Condição — executa bloco só se verdadeira
      if (resp.transactionCreated) {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        void qc.invalidateQueries({ queryKey: ["transactions"] });
        // Instrução do fluxo — parte da lógica de negócio ou interface
        void qc.invalidateQueries({ queryKey: ["kpis"] });
        // Exibe notificação temporária (toast) na tela
        toast.success("Transação registrada — dashboard atualizado.");
      }
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (err) {
      // Exibe notificação temporária (toast) na tela
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setIsTyping(false);
    }
  };

  // Constante local
  const handleDelete = async () => {
    // Condição — executa bloco só se verdadeira
    if (!token) return;
    // Condição — executa bloco só se verdadeira
    if (conversationId) {
      // Tenta executar — erros vão para catch
      try {
        // Aguarda resposta assíncrona (API, timer)
        await apiDeleteAiConversation(token, conversationId);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        void qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch (err) {
        // Exibe notificação temporária (toast) na tela
        toast.error(err instanceof Error ? err.message : "Erro ao inativar");
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
    }
    // Instrução do fluxo — parte da lógica de negócio ou interface
    startNewChat();
  };

  // Constante local
  const sidebarConversations = convQuery.data?.conversations ?? [];

  // Constante local
  const conversationList = (
    // Instrução do fluxo — parte da lógica de negócio ou interface
    <>
      // Tag HTML na interface
      <div className="flex items-center justify-between border-b border-border p-4">
        // Tag HTML na interface
        <h2 className="text-base font-medium text-foreground">Conversas</h2>
        // Tag HTML na interface
        <div className="flex items-center gap-1">
          // Tag HTML na interface
          <button
            // Botão comum (não envia formulário)
            type="button"
            // Executa ação quando o usuário clica
            onClick={startNewChat}
            // Classes CSS Tailwind — controla aparência visual
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-cgreen-50 text-cgreen-700 hover:bg-cgreen-100 dark:bg-cgreen-900/30 dark:text-cgreen-400"
            // Texto acessível para leitores de tela
            aria-label="Nova conversa"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Elemento/componente React na tela
            <Plus size={16} />
          // Tag HTML na interface
          </button>
          // Tag HTML na interface
          <button
            // Botão comum (não envia formulário)
            type="button"
            // Executa ação quando o usuário clica
            onClick={() => setMobileListOpen(false)}
            // Classes CSS Tailwind — controla aparência visual
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
            // Texto acessível para leitores de tela
            aria-label="Fechar lista"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Elemento/componente React na tela
            <X size={16} />
          // Tag HTML na interface
          </button>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="flex-1 overflow-y-auto">
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {sidebarConversations.length === 0 && (
          // Tag HTML na interface
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma conversa salva ainda.</p>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
        // Percorre lista e renderiza um item para cada elemento
        {sidebarConversations.map((conv) => (
          // Tag HTML na interface
          <button
            // Instrução do fluxo — parte da lógica de negócio ou interface
            key={conv.id}
            // Botão comum (não envia formulário)
            type="button"
            // Executa ação quando o usuário clica
            onClick={() => loadConversation(conv.id, conv.messages)}
            // Classes CSS Tailwind — controla aparência visual
            className={cn(
              // Instrução do fluxo — parte da lógica de negócio ou interface
              "w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60",
              // Instrução do fluxo — parte da lógica de negócio ou interface
              conversationId === conv.id && "bg-cgreen-50 dark:bg-cgreen-900/20",
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            )}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Tag HTML na interface
            <div className="flex items-center gap-2">
              // Elemento/componente React na tela
              <MessageCircle size={14} className="shrink-0 text-muted-foreground" />
              // Tag HTML na interface
              <p className="truncate text-sm font-medium text-foreground">{conv.title ?? "Conversa"}</p>
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <p className="mt-0.5 text-xs text-muted-foreground">
              // Cria objeto de data/hora
              {new Date(conv.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            // Tag HTML na interface
            </p>
          // Tag HTML na interface
          </button>
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        ))}
      // Tag HTML na interface
      </div>
    // Instrução do fluxo — parte da lógica de negócio ou interface
    </>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="flex min-h-0 flex-1 flex-col gap-0 lg:gap-4 lg:h-[calc(100vh-8rem)]">
      {/* Sidebar desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:flex lg:w-[280px] lg:flex-col">
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {conversationList}
      // Tag HTML na interface
      </div>

      {/* Sidebar mobile overlay */}
      {mobileListOpen && (
        // Tag HTML na interface
        <div className="fixed inset-0 z-40 flex lg:hidden">
          // Tag HTML na interface
          <button
            // Botão comum (não envia formulário)
            type="button"
            // Classes CSS Tailwind — controla aparência visual
            className="absolute inset-0 bg-black/50"
            // Texto acessível para leitores de tela
            aria-label="Fechar"
            // Executa ação quando o usuário clica
            onClick={() => setMobileListOpen(false)}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          />
          // Tag HTML na interface
          <div className="relative z-50 flex h-full w-[min(100%,280px)] flex-col bg-card shadow-xl">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {conversationList}
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}

      // Tag HTML na interface
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-border bg-card lg:rounded-xl lg:border">
        // Tag HTML na interface
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          // Tag HTML na interface
          <div className="flex items-center gap-2 sm:gap-3">
            // Tag HTML na interface
            <button
              // Botão comum (não envia formulário)
              type="button"
              // Executa ação quando o usuário clica
              onClick={() => setMobileListOpen(true)}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
              // Texto acessível para leitores de tela
              aria-label="Abrir conversas"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Elemento/componente React na tela
              <PanelLeft size={18} />
            // Tag HTML na interface
            </button>
            // Tag HTML na interface
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cgreen-500">
              // Elemento/componente React na tela
              <MessageCircle size={16} className="text-white" />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="min-w-0">
              // Tag HTML na interface
              <p className="truncate text-sm font-medium text-foreground">Controla.ai — Agente IA</p>
              // Tag HTML na interface
              <p className="text-xs text-cgreen-500 dark:text-cgreen-400">Sincronizado com WhatsApp</p>
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="flex items-center gap-1">
            // Tag HTML na interface
            <button
              // Botão comum (não envia formulário)
              type="button"
              // Executa ação quando o usuário clica
              onClick={startNewChat}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
              // Texto acessível para leitores de tela
              aria-label="Nova conversa"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Elemento/componente React na tela
              <Plus size={16} />
            // Tag HTML na interface
            </button>
            // Tag HTML na interface
            <button
              // Botão comum (não envia formulário)
              type="button"
              // Executa ação quando o usuário clica
              onClick={handleDelete}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-cred-main"
              // Texto acessível para leitores de tela
              aria-label="Inativar conversa"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Elemento/componente React na tela
              <Trash2 size={16} />
            // Tag HTML na interface
            </button>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>

        // Tag HTML na interface
        <div
          // Classes CSS Tailwind — controla aparência visual
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          style={{
            // Instrução do fluxo — parte da lógica de negócio ou interface
            backgroundColor: isDark ? "#0b141a" : "#ECE5DD",
            // Instrução do fluxo — parte da lógica de negócio ou interface
            backgroundImage: isDark ? chatBgDark : chatBgLight,
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          }}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Percorre lista e renderiza um item para cada elemento
          {messages.map((msg, i) => (
            // Tag HTML na interface
            <motion.div
              // Instrução do fluxo — parte da lógica de negócio ou interface
              key={`${msg.timestamp}-${i}`}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              initial={{ opacity: 0, y: 8 }}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              animate={{ opacity: 1, y: 0 }}
              // Classes CSS Tailwind — controla aparência visual
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Tag HTML na interface
              <div
                // Classes CSS Tailwind — controla aparência visual
                className={cn(
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  "max-w-[92%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[80%]",
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  msg.role === "user"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    ? "bg-[#DCF8C6] text-foreground dark:bg-[#005c4b] dark:text-white"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    : "border border-transparent bg-white text-foreground dark:border-border/40 dark:bg-[#1f2c34] dark:text-white",
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                )}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Tag HTML na interface
                <div className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</div>
                // Tag HTML na interface
                <p className="mt-1 text-right text-[10px] text-muted-foreground sm:text-xs">{msg.timestamp}</p>
              // Tag HTML na interface
              </div>
            // Tag HTML na interface
            </motion.div>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ))}

          // Instrução do fluxo — parte da lógica de negócio ou interface
          {isTyping && (
            // Tag HTML na interface
            <div className="flex justify-start">
              // Tag HTML na interface
              <div className="rounded-2xl border border-transparent bg-white px-4 py-3 shadow-sm dark:border-border/40 dark:bg-[#1f2c34]">
                // Tag HTML na interface
                <div className="flex gap-1">
                  // Percorre lista e renderiza um item para cada elemento
                  {[0, 150, 300].map((delay) => (
                    // Tag HTML na interface
                    <span
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      key={delay}
                      // Classes CSS Tailwind — controla aparência visual
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      style={{ animationDelay: `${delay}ms` }}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    />
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  ))}
                // Tag HTML na interface
                </div>
              // Tag HTML na interface
              </div>
            // Tag HTML na interface
            </div>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}

          // Tag HTML na interface
          <div ref={messagesEndRef} />
        // Tag HTML na interface
        </div>

        // Tag HTML na interface
        <div className="border-t border-border bg-card px-3 py-2 sm:px-4">
          // Tag HTML na interface
          <div className="mb-2 flex items-center gap-2">
            // Elemento/componente React na tela
            <Lightbulb size={14} className="text-camber-main shrink-0" />
            // Tag HTML na interface
            <span className="text-xs text-muted-foreground">Sugestões:</span>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            // Percorre lista e renderiza um item para cada elemento
            {suggestions.map((s) => {
              // Constante local
              const Icon =
                // Instrução do fluxo — parte da lógica de negócio ou interface
                s.label.includes("gasto") ? PenLine : s.label.includes("Resumo") ? PieChart : s.label.includes("Dicas") ? Sparkles : Target;
              // Retorna valor ou JSX para quem chamou
              return (
                // Tag HTML na interface
                <button
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  key={s.label}
                  // Botão comum (não envia formulário)
                  type="button"
                  // Executa ação quando o usuário clica
                  onClick={() => handleSend(s.send)}
                  // Classes CSS Tailwind — controla aparência visual
                  className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-cgreen-500/40 hover:bg-muted hover:text-cgreen-700 dark:hover:text-cgreen-400"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Elemento/componente React na tela
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  {s.label}
                // Tag HTML na interface
                </button>
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              );
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            })}
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>

        // Tag HTML na interface
        <div className="border-t border-border bg-card p-3 sm:p-4">
          // Tag HTML na interface
          <div className="flex items-center gap-2 sm:gap-3">
            // Tag HTML na interface
            <input
              // Instrução do fluxo — parte da lógica de negócio ou interface
              value={input}
              // Atualiza estado quando o usuário digita/seleciona
              onChange={(e) => setInput(e.target.value)}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              // Texto cinza de exemplo dentro do campo vazio
              placeholder="Digite um gasto ou pergunte algo..."
              // Classes CSS Tailwind — controla aparência visual
              className="h-10 min-w-0 flex-1 rounded-xl border border-transparent bg-muted/60 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-cgreen-500 focus:bg-card sm:h-11 sm:px-4"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            />
            // Tag HTML na interface
            <button
              // Botão comum (não envia formulário)
              type="button"
              // Executa ação quando o usuário clica
              onClick={() => handleSend()}
              // Desabilita botão/campo (ex.: durante envio)
              disabled={isTyping}
              // Classes CSS Tailwind — controla aparência visual
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cgreen-500 text-white transition-all hover:bg-cgreen-700 active:scale-[0.97] disabled:opacity-60 sm:h-11 sm:w-11"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Elemento/componente React na tela
              <Send size={18} />
            // Tag HTML na interface
            </button>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
