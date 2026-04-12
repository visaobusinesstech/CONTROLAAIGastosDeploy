import { useState, useRef, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Send, Plus, MessageCircle, Trash2, BarChart3, Lightbulb, PenLine, PieChart, Sparkles, Target } from "lucide-react";
import { aiConversations } from "@/lib/mockData";
import { ChartPlotArea } from "@/components/ChartPlotArea";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  hasChart?: boolean;
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Olá! Sou seu assistente financeiro. Posso registrar seus gastos, analisar suas finanças e dar dicas personalizadas.\n\nExperimente enviar:\n• Gastei R$ 45 no almoço\n• Paguei R$ 150 de luz\n• Como estão meus gastos este mês?",
    timestamp: "10:00",
  },
];

const suggestions: { label: string; send: string }[] = [
  { label: "Registrar um gasto", send: "Registrar um gasto" },
  { label: "Resumo do mês", send: "Resumo do mês" },
  { label: "Dicas de economia", send: "Dicas de economia" },
  { label: "Ver minhas metas", send: "Ver minhas metas" },
];

function getAiResponse(input: string): { text: string; hasChart?: boolean } {
  const lower = input.toLowerCase();

  if (lower.includes("gastei") || lower.includes("paguei") || lower.includes("comprei")) {
    const match = input.match(/R?\$?\s*(\d+[.,]?\d*)/);
    const valor = match ? match[1].replace(",", ".") : "0";
    const cat = lower.includes("almoço") || lower.includes("comida") || lower.includes("restaurante")
      ? "Alimentação"
      : lower.includes("uber") || lower.includes("gasolina") || lower.includes("transporte")
        ? "Transporte"
        : lower.includes("luz") || lower.includes("água") || lower.includes("internet")
          ? "Moradia"
          : lower.includes("farmácia") || lower.includes("remédio")
            ? "Saúde"
            : "Outros";

    return {
      text: `**Gasto registrado com sucesso**\n\nValor: R$ ${parseFloat(valor).toFixed(2)}\nCategoria: ${cat}\nData: ${new Date().toLocaleDateString("pt-BR")}\n\nSeu gasto em ${cat} este mês está em 78% do limite.\n\n**Dica:** Você já gastou R$ 1.152 em Alimentação. Faltam apenas R$ 48 para o limite de R$ 1.200.`,
      hasChart: true,
    };
  }

  if (lower.includes("resumo") || lower.includes("como estão") || lower.includes("relatório")) {
    return {
      text: "**Resumo de Abril 2026**\n\nReceitas: R$ 8.500,00\nDespesas: R$ 5.252,50\nSaldo: R$ 3.247,50 (+12,3%)\n\n**Top categorias:**\n• Moradia: R$ 1.800 (34%)\n• Alimentação: R$ 1.152 (22%) — atenção\n• Transporte: R$ 546 (10%)\n\nTaxa de poupança: 38,2% — excelente.\nAlimentação está em 96% do limite.",
      hasChart: true,
    };
  }

  if (lower.includes("dica") || lower.includes("economia") || lower.includes("economizar")) {
    return {
      text: "**3 dicas baseadas no seu perfil**\n\n1. Alimentação — Reduzindo R$ 50/semana em delivery, você economiza R$ 200/mês\n\n2. Assinaturas — Você gasta R$ 155,80/mês. Revise serviços pouco usados (meta: R$ 120)\n\n3. Transporte — Nos dias que não precisa do carro, use transporte público. Potencial: -R$ 80/mês\n\nImpacto total: **R$ 330/mês** a mais para suas metas.",
    };
  }

  if (lower.includes("meta") || lower.includes("objetivo")) {
    return {
      text: "**Suas metas ativas**\n\n1. Fundo de emergência — R$ 12.600 / R$ 25.000 (50%)\n   Previsão: Ago 2026\n\n2. Viagem Europa — R$ 8.200 / R$ 15.000 (54%)\n   Previsão: Dez 2026\n\n3. Alimentação — R$ 1.152 / R$ 1.200 (96%)\n   Quase no limite.\n\n4. Assinaturas — R$ 155 / R$ 120 (130%)\n   Excedido em R$ 35,80",
      hasChart: true,
    };
  }

  return {
    text: "Analisando seus dados…\n\nSeu saldo atual é de R$ 3.247,50 — um crescimento de 12,3% em relação ao mês anterior.\n\n**Principais observações:**\n• Alimentação está em 96% do limite (atenção)\n• Transporte está controlado: 91% do orçamento\n• Sua taxa de poupança de 38,2% está excelente\n\n**Dica:** Reduzindo R$ 50/semana em alimentação, você economizaria R$ 200/mês.",
    hasChart: true,
  };
}

const chatBgLight =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";
const chatBgDark =
  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")";

export default function AiChat() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [activeConv, setActiveConv] = useState("1");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (text?: string) => {
    const msg = text || input;
    if (!msg.trim()) return;
    const userMsg: Message = {
      role: "user",
      content: msg,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const resp = getAiResponse(msg);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: resp.text,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          hasChart: resp.hasChart,
        },
      ]);
    }, 1200);
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 pb-20 lg:pb-0">
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card lg:flex lg:w-[280px] lg:flex-col">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-medium text-foreground">Conversas</h2>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-cgreen-50 text-cgreen-700 hover:bg-cgreen-100 dark:bg-cgreen-900/30 dark:text-cgreen-400 dark:hover:bg-cgreen-900/50"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {aiConversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => setActiveConv(conv.id)}
              className={cn(
                "w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60",
                activeConv === conv.id && "bg-cgreen-50 dark:bg-cgreen-900/20",
              )}
            >
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="shrink-0 text-muted-foreground" />
                <p className="truncate text-sm font-medium text-foreground">{conv.title}</p>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.preview}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(conv.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cgreen-500">
              <MessageCircle size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Consultor Financeiro IA</p>
              <p className="text-xs text-cgreen-500 dark:text-cgreen-400">Online</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div
          className="flex-1 space-y-3 overflow-y-auto p-5"
          style={{
            backgroundColor: isDark ? "#0b141a" : "#ECE5DD",
            backgroundImage: isDark ? chatBgDark : chatBgLight,
          }}
        >
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                  msg.role === "user"
                    ? "bg-[#DCF8C6] text-foreground dark:bg-[#005c4b] dark:text-white"
                    : "border border-transparent bg-white text-foreground dark:border-border/40 dark:bg-[#1f2c34] dark:text-white",
                )}
              >
                <div className="whitespace-pre-line text-sm leading-relaxed">{msg.content}</div>
                {msg.hasChart && (
                  <ChartPlotArea className="mt-3 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <BarChart3 size={12} className="shrink-0" />
                      <span>Comparação com metas</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: "Alimentação", pct: 96, color: "#EF5350" },
                        { name: "Transporte", pct: 91, color: "#FFB300" },
                        { name: "Poupança", pct: 50, color: "#4CAF50" },
                      ].map((item) => (
                        <div key={item.name}>
                          <div className="mb-0.5 flex justify-between text-xs">
                            <span className="text-muted-foreground">{item.name}</span>
                            <span className="font-medium tabular text-foreground">{item.pct}%</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartPlotArea>
                )}
                <p className="mt-1 text-right text-xs text-muted-foreground">{msg.timestamp}</p>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-transparent bg-white px-4 py-3 shadow-sm dark:border-border/40 dark:bg-[#1f2c34]">
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-card px-4 py-2">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb size={14} className="text-camber-main" />
            <span className="text-xs text-muted-foreground">Sugestões:</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
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

        <div className="border-t border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite um gasto ou pergunte algo..."
              className="h-11 flex-1 rounded-xl border border-transparent bg-muted/60 px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-cgreen-500 focus:bg-card dark:focus:bg-card"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-cgreen-500 text-white transition-all hover:bg-cgreen-700 active:scale-[0.97]"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
