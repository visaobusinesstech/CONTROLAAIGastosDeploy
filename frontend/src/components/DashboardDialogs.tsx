/**
 * Modais do dashboard — registrar/editar transação e orçamento mensal.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect, useState } from "react"; // Estado local dos formulários
// Importa funções/componentes de lucide-react
import { Loader2 } from "lucide-react";
// Importa funções/componentes de sonner
import { toast } from "sonner";
// Importa funções/componentes de @/components/ui/button
import { Button } from "@/components/ui/button";
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  Dialog,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogContent,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogFooter,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogHeader,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  DialogTitle,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/components/ui/dialog";
// Importa funções/componentes de @/components/ui/input
import { Input } from "@/components/ui/input";
// Importa funções/componentes de @/components/ui/label
import { Label } from "@/components/ui/label";
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
// Importa funções/componentes de @/lib/api
import type { ApiCategory, ApiTransaction } from "@/lib/api"; // Tipos da API
// Importa funções/componentes de módulo
import {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  INCOME_FREQUENCIES,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  INCOME_FREQUENCY_LABELS,
  // Define formato de dados (TypeScript)
  type IncomeFrequency,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  validateFinancialEntry,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
} from "@/lib/financial-summary"; // Validações e frequências canônicas

/** Converte ISO para valor aceito pelo input datetime-local. */
// Declara função auxiliar interna
function toDatetimeLocalValue(iso: string) {
  // Constante local
  const d = new Date(iso);
  // Constante local
  const pad = (n: number) => String(n).padStart(2, "0");
  // Retorna valor ou JSX para quem chamou
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Exporta constante/tipo/classe pública
export type TransactionFormPayload = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  amount: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  description: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categoryId: string | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  occurredAt: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  incomeFrequency?: IncomeFrequency | null;
};

/** Modal para registrar ou editar gasto/ganho no dashboard. */
// Exporta função usada por outros arquivos
export function TransactionDialog({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  open,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onOpenChange,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categories,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onSubmit,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  loading,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initial,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mode = "create",
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  open: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onOpenChange: (v: boolean) => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  type: "expense" | "income";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  categories: ApiCategory[];
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onSubmit: (data: TransactionFormPayload) => Promise<void>;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  loading: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initial?: ApiTransaction | null;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  mode?: "create" | "edit";
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [amount, setAmount] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [description, setDescription] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [categoryId, setCategoryId] = useState<string>("");
  // Cria objeto de data/hora
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocalValue(new Date().toISOString()));
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>("monthly");

  // Constante local
  const filtered = categories.filter((c) => c.type === type); // Categorias do tipo selecionado

  // Reseta ou preenche formulário ao abrir o modal
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (!open) return;
    // Condição — executa bloco só se verdadeira
    if (initial && mode === "edit") {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setAmount(String(initial.amount));
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setDescription(initial.description ?? "");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setCategoryId(initial.categoryId ?? "");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setOccurredAt(toDatetimeLocalValue(initial.occurredAt));
      // Constante local
      const freq = initial.incomeFrequency;
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setIncomeFrequency(
        // Instrução do fluxo — parte da lógica de negócio ou interface
        freq && (INCOME_FREQUENCIES as readonly string[]).includes(freq)
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? (freq as IncomeFrequency)
          // Instrução do fluxo — parte da lógica de negócio ou interface
          : "monthly",
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      );
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setAmount("");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setDescription("");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setCategoryId("");
    // Cria objeto de data/hora
    setOccurredAt(toDatetimeLocalValue(new Date().toISOString()));
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setIncomeFrequency("monthly");
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [open, type, initial, mode]);

  // Constante local
  const handleSubmit = async (e: React.FormEvent) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    e.preventDefault();
    // Constante local
    const validation = validateFinancialEntry({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      description,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      amount,
      // Cria objeto de data/hora
      occurredAt: new Date(occurredAt).toISOString(),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      type,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      incomeFrequency: type === "income" ? incomeFrequency : null,
    });
    // Condição — executa bloco só se verdadeira
    if (!validation.ok) {
      // Exibe notificação temporária (toast) na tela
      toast.error(validation.error);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const normalized = amount.replace(",", ".").trim();
    // Aguarda resposta assíncrona (API, timer)
    await onSubmit({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      amount: normalized,
      // Remove espaços no início/fim do texto
      description: description.trim(),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      categoryId: categoryId && categoryId !== "_none" ? categoryId : null,
      // Cria objeto de data/hora
      occurredAt: new Date(occurredAt).toISOString(),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      incomeFrequency: type === "income" ? incomeFrequency : null,
    });
  };

  // Constante local
  const title =
    // Instrução do fluxo — parte da lógica de negócio ou interface
    mode === "edit"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ? type === "expense"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ? "Editar despesa"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        : "Editar ganho/faturamento"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      : type === "expense"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ? "Adicionar despesa"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        : "Registrar ganho/faturamento";

  // Retorna valor ou JSX para quem chamou
  return (
    // Elemento/componente React na tela
    <Dialog open={open} onOpenChange={onOpenChange}>
      // Elemento/componente React na tela
      <DialogContent className="sm:max-w-md">
        // Tag HTML na interface
        <form onSubmit={handleSubmit}>
          // Elemento/componente React na tela
          <DialogHeader>
            // Elemento/componente React na tela
            <DialogTitle>{title}</DialogTitle>
          // Elemento/componente React na tela
          </DialogHeader>
          // Tag HTML na interface
          <div className="grid gap-4 py-4">
            // Tag HTML na interface
            <div className="grid gap-2">
              // Elemento/componente React na tela
              <Label htmlFor="tx-desc">Nome / descrição *</Label>
              // Elemento/componente React na tela
              <Input
                // Instrução do fluxo — parte da lógica de negócio ou interface
                id="tx-desc"
                // Texto cinza de exemplo dentro do campo vazio
                placeholder={type === "expense" ? "Ex.: Servidor VPS, Aluguel…" : "Ex.: Contrato Cliente X…"}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={description}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setDescription(e.target.value)}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                required
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="grid gap-2">
              // Elemento/componente React na tela
              <Label htmlFor="tx-amount">Valor (R$) *</Label>
              // Elemento/componente React na tela
              <Input
                // Instrução do fluxo — parte da lógica de negócio ou interface
                id="tx-amount"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                inputMode="decimal"
                // Texto cinza de exemplo dentro do campo vazio
                placeholder="0,00"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={amount}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setAmount(e.target.value)}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                required
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </div>
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {type === "income" && (
              // Tag HTML na interface
              <div className="grid gap-2">
                // Elemento/componente React na tela
                <Label>Tipo / frequência *</Label>
                // Elemento/componente React na tela
                <Select
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  value={incomeFrequency}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  onValueChange={(v) => setIncomeFrequency(v as IncomeFrequency)}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Elemento/componente React na tela
                  <SelectTrigger>
                    // Elemento/componente React na tela
                    <SelectValue placeholder="Selecionar frequência" />
                  // Elemento/componente React na tela
                  </SelectTrigger>
                  // Elemento/componente React na tela
                  <SelectContent>
                    // Percorre lista e renderiza um item para cada elemento
                    {INCOME_FREQUENCIES.map((f) => (
                      // Elemento/componente React na tela
                      <SelectItem key={f} value={f}>
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {INCOME_FREQUENCY_LABELS[f]}
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
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            )}
            // Tag HTML na interface
            <div className="grid gap-2">
              // Elemento/componente React na tela
              <Label>Categoria{type === "expense" ? "" : " (opcional)"}</Label>
              // Elemento/componente React na tela
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                // Elemento/componente React na tela
                <SelectTrigger>
                  // Elemento/componente React na tela
                  <SelectValue placeholder="Selecionar" />
                // Elemento/componente React na tela
                </SelectTrigger>
                // Elemento/componente React na tela
                <SelectContent>
                  // Elemento/componente React na tela
                  <SelectItem value="_none">Sem categoria</SelectItem>
                  // Percorre lista e renderiza um item para cada elemento
                  {filtered.map((c) => (
                    // Elemento/componente React na tela
                    <SelectItem key={c.id} value={c.id}>
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      {c.name}
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
            // Tag HTML na interface
            <div className="grid gap-2">
              // Elemento/componente React na tela
              <Label htmlFor="tx-when">Data e hora *</Label>
              // Elemento/componente React na tela
              <Input
                // Instrução do fluxo — parte da lógica de negócio ou interface
                id="tx-when"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                type="datetime-local"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={occurredAt}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setOccurredAt(e.target.value)}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                required
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <DialogFooter>
            // Elemento/componente React na tela
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Cancelar
            // Elemento/componente React na tela
            </Button>
            // Elemento/componente React na tela
            <Button type="submit" disabled={loading} className="bg-cgreen-500 hover:bg-cgreen-700">
              // Classes CSS Tailwind — controla aparência visual
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "edit" ? "Salvar alterações" : "Salvar"}
            // Elemento/componente React na tela
            </Button>
          // Elemento/componente React na tela
          </DialogFooter>
        // Tag HTML na interface
        </form>
      // Elemento/componente React na tela
      </DialogContent>
    // Elemento/componente React na tela
    </Dialog>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}

/** Modal para definir renda esperada e teto de despesas do mês. */
// Exporta função usada por outros arquivos
export function MonthlyBudgetDialog({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  open,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onOpenChange,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  month,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initialIncome,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initialLimit,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onSave,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  loading,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  open: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onOpenChange: (v: boolean) => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  month: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initialIncome: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  initialLimit: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onSave: (income: string, limit: string) => Promise<void>;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  loading: boolean;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [income, setIncome] = useState(initialIncome);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [limit, setLimit] = useState(initialLimit);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (open) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setIncome(initialIncome);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setLimit(initialLimit);
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [open, initialIncome, initialLimit]);

  // Retorna valor ou JSX para quem chamou
  return (
    // Elemento/componente React na tela
    <Dialog open={open} onOpenChange={onOpenChange}>
      // Elemento/componente React na tela
      <DialogContent className="sm:max-w-md">
        // Elemento/componente React na tela
        <DialogHeader>
          // Elemento/componente React na tela
          <DialogTitle>Renda planejada — {month}</DialogTitle>
        // Elemento/componente React na tela
        </DialogHeader>
        // Tag HTML na interface
        <div className="grid gap-4 py-2">
          // Tag HTML na interface
          <p className="text-xs text-muted-foreground">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Isto é planejamento — não substitui ganhos/faturamentos registrados. Os indicadores usam
            // Instrução do fluxo — parte da lógica de negócio ou interface
            lançamentos reais.
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <div className="grid gap-2">
            // Elemento/componente React na tela
            <Label htmlFor="bud-inc">Renda mensal esperada (R$)</Label>
            // Elemento/componente React na tela
            <Input
              // Instrução do fluxo — parte da lógica de negócio ou interface
              id="bud-inc"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              inputMode="decimal"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              value={income}
              // Atualiza estado quando o usuário digita/seleciona
              onChange={(e) => setIncome(e.target.value)}
              // Texto cinza de exemplo dentro do campo vazio
              placeholder="8500"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            />
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="grid gap-2">
            // Elemento/componente React na tela
            <Label htmlFor="bud-lim">Teto de despesas (opcional)</Label>
            // Elemento/componente React na tela
            <Input
              // Instrução do fluxo — parte da lógica de negócio ou interface
              id="bud-lim"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              inputMode="decimal"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              value={limit}
              // Atualiza estado quando o usuário digita/seleciona
              onChange={(e) => setLimit(e.target.value)}
              // Texto cinza de exemplo dentro do campo vazio
              placeholder="5000"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            />
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <DialogFooter>
          // Elemento/componente React na tela
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Cancelar
          // Elemento/componente React na tela
          </Button>
          // Elemento/componente React na tela
          <Button
            // Botão comum (não envia formulário)
            type="button"
            // Desabilita botão/campo (ex.: durante envio)
            disabled={loading}
            // Classes CSS Tailwind — controla aparência visual
            className="bg-cgreen-500 hover:bg-cgreen-700"
            // Executa ação quando o usuário clica
            onClick={() => void onSave(income, limit)}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Classes CSS Tailwind — controla aparência visual
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          // Elemento/componente React na tela
          </Button>
        // Elemento/componente React na tela
        </DialogFooter>
      // Elemento/componente React na tela
      </DialogContent>
    // Elemento/componente React na tela
    </Dialog>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
