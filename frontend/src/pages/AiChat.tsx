/**
 * Chat financeiro com IA — sincronizado com o agente WhatsApp.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useState, useRef, useEffect, useCallback } from "react"; // Estado do chat e scroll
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Send,
  Plus,
  MessageCircle,
  Trash2,
  Lightbulb,
  PenLine,
  PieChart,
  Sparkles,
  Target,
  PanelLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import {
  apiDeleteAiConversation,
  apiGetAiConversations,
  apiGetAiWelcome,
  apiPostAiChat,
} from "@/lib/api";
import { toast } from "sonner";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

const suggestions: { label: string; send: string }[] = [
  { label: "Registrar um gasto", send: "Gastei 45 no almoço" },
  { label: "Resumo do mês", send: "Quanto gastei esse mês?" },
  { label: "Dicas de economia", send: "Minha situação financeira está saudável?" },
  { label: "Menu do agente", send: "Oi" },
];

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
}

function formatTime(isoOrTime?: string): string {
  if (!isoOrTime) {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (isoOrTime.includes("T")) {
    return new Date(isoOrTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return isoOrTime;
}

function parseStoredMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is { role: string; content: string; timestamp?: string } => {
      return Boolean(m && typeof m === "object" && "role" in m && "content" in m);
    })
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: stripMarkdown(String(m.content)),
      timestamp: formatTime(m.timestamp),
    }));
}

function welcomeMessage(content: string): ChatMessage {
  return {
    role: "assistant",
    content: stripMarkdown(content),
    timestamp: formatTime(),
  };
}

const chatBgLight =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";
const chatBgDark =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

export default function AiChat() {
  const { resolvedTheme } = useTheme();
  const { token } = useAuth();
  const qc = useQueryClient();
  const isDark = resolvedTheme === "dark";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isTyping, setIsTyping] = useState(false);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bootstrapped = useRef(false);

  const welcomeQuery = useQuery({
    queryKey: ["ai-welcome", token],
    queryFn: () => apiGetAiWelcome(token!),
    enabled: Boolean(token),
  });

  const convQuery = useQuery({
    queryKey: ["ai-conversations", token],
    queryFn: () => apiGetAiConversations(token!),
    enabled: Boolean(token),
  });

  const startNewChat = useCallback(() => {
    setConversationId(undefined);
    if (welcomeQuery.data?.message) {
      setMessages([welcomeMessage(welcomeQuery.data.message)]);
    } else {
      setMessages([]);
    }
    setMobileListOpen(false);
  }, [welcomeQuery.data?.message]);

  const loadConversation = useCallback((id: string, rawMessages: unknown) => {
    const parsed = parseStoredMessages(rawMessages);
    setConversationId(id);
    setMessages(parsed.length ? parsed : welcomeQuery.data?.message ? [welcomeMessage(welcomeQuery.data.message)] : []);
    setMobileListOpen(false);
  }, [welcomeQuery.data?.message]);

  useEffect(() => {
    if (bootstrapped.current || !welcomeQuery.data?.message) return;
    if (convQuery.isLoading) return;

    bootstrapped.current = true;
    const convs = convQuery.data?.conversations ?? [];
    if (convs.length > 0) {
      loadConversation(convs[0].id, convs[0].messages);
    } else {
      startNewChat();
    }
  }, [convQuery.data, convQuery.isLoading, welcomeQuery.data, loadConversation, startNewChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || !token) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: msg,
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // POST /api/ai/chat — envia mensagem e recebe resposta do agente
      const resp = await apiPostAiChat(token, { message: msg, conversationId });
      setConversationId(resp.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: stripMarkdown(resp.response),
          timestamp: formatTime(),
        },
      ]);
      void qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      if (resp.transactionCreated) {
        void qc.invalidateQueries({ queryKey: ["transactions"] });
        void qc.invalidateQueries({ queryKey: ["kpis"] });
        toast.success("Transação registrada — dashboard atualizado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setIsTyping(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    if (conversationId) {
      try {
        await apiDeleteAiConversation(token, conversationId);
        void qc.invalidateQueries({ queryKey: ["ai-conversations"] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir");
        return;
      }
    }
    startNewChat();
  };

  const sidebarConversations = convQuery.data?.conversations ?? [];

  const conversationList = (
    <>
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-base font-medium text-foreground">Conversas</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={startNewChat}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-cgreen-50 text-cgreen-700 hover:bg-cgreen-100 dark:bg-cgreen-900/30 dark:text-cgreen-400"
            aria-label="Nova conversa"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMobileListOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Fechar lista"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sidebarConversations.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma conversa salva ainda.</p>
        )}
        {sidebarConversations.map((conv) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => loadConversation(conv.id, conv.messages)}
            className={cn(
              "w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60",
              conversationId === conv.id && "bg-cgreen-50 dark:bg-cgreen-900/20",
            )}
          >
            <div className="flex items-center gap-2">
              <MessageCircle size={14} className="shrink-0 text-muted-foreground" />
              <p className="truncate text-sm font-medium text-foreground">{conv.title ?? "Conversa"}</p>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(conv.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </p>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 lg:gap-4 lg:h-[calc(100vh-8rem)]">
      {/* Sidebar desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:flex lg:w-[280px] lg:flex-col">
        {conversationList}
      </div>

      {/* Sidebar mobile overlay */}
      {mobileListOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fechar"
            onClick={() => setMobileListOpen(false)}
          />
          <div className="relative z-50 flex h-full w-[min(100%,280px)] flex-col bg-card shadow-xl">
            {conversationList}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-border bg-card lg:rounded-xl lg:border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileListOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Abrir conversas"
            >
              <PanelLeft size={18} />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cgreen-500">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">Controla.ai — Agente IA</p>
              <p className="text-xs text-cgreen-500 dark:text-cgreen-400">Sincronizado com WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startNewChat}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
              aria-label="Nova conversa"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-cred-main"
              aria-label="Limpar conversa"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
          style={{
            backgroundColor: isDark ? "#0b141a" : "#ECE5DD",
            backgroundImage: isDark ? chatBgDark : chatBgLight,
          }}
        >
          {messages.map((msg, i) => (
            <motion.div
              key={`${msg.timestamp}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[92%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[80%]",
                  msg.role === "user"
                    ? "bg-[#DCF8C6] text-foreground dark:bg-[#005c4b] dark:text-white"
                    : "border border-transparent bg-white text-foreground dark:border-border/40 dark:bg-[#1f2c34] dark:text-white",
                )}
              >
                <div className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</div>
                <p className="mt-1 text-right text-[10px] text-muted-foreground sm:text-xs">{msg.timestamp}</p>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-transparent bg-white px-4 py-3 shadow-sm dark:border-border/40 dark:bg-[#1f2c34]">
                <div className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-card px-3 py-2 sm:px-4">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={14} className="text-camber-main shrink-0" />
            <span className="text-xs text-muted-foreground">Sugestões:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {suggestions.map((s) => {
              const Icon =
                s.label.includes("gasto") ? PenLine : s.label.includes("Resumo") ? PieChart : s.label.includes("Dicas") ? Sparkles : Target;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => handleSend(s.send)}
                  className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-cgreen-500/40 hover:bg-muted hover:text-cgreen-700 dark:hover:text-cgreen-400"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Digite um gasto ou pergunte algo..."
              className="h-10 min-w-0 flex-1 rounded-xl border border-transparent bg-muted/60 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-cgreen-500 focus:bg-card sm:h-11 sm:px-4"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isTyping}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cgreen-500 text-white transition-all hover:bg-cgreen-700 active:scale-[0.97] disabled:opacity-60 sm:h-11 sm:w-11"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
