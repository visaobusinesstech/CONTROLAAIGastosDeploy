/**
 * Modais do dashboard — registrar/editar transação e orçamento mensal.
 *
 * Papel no sistema: Componente reutilizável do frontend — compõe páginas ou layout.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect, useState } from "react"; // Estado local dos formulários
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiCategory, ApiTransaction } from "@/lib/api"; // Tipos da API
import {
  INCOME_FREQUENCIES,
  INCOME_FREQUENCY_LABELS,
  type IncomeFrequency,
  validateFinancialEntry,
} from "@/lib/financial-summary"; // Validações e frequências canônicas

/** Converte ISO para valor aceito pelo input datetime-local. */
// Declara função auxiliar interna
function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Exporta constante/tipo/classe pública
export type TransactionFormPayload = {
  amount: string;
  description: string;
  categoryId: string | null;
  occurredAt: string;
  incomeFrequency?: IncomeFrequency | null;
};

/** Modal para registrar ou editar gasto/ganho no dashboard. */
// Exporta função usada por outros arquivos
export function TransactionDialog({
  open,
  onOpenChange,
  type,
  categories,
  onSubmit,
  loading,
  initial,
  mode = "create",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "expense" | "income";
  categories: ApiCategory[];
  onSubmit: (data: TransactionFormPayload) => Promise<void>;
  loading: boolean;
  initial?: ApiTransaction | null;
  mode?: "create" | "edit";
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  // Cria objeto de data/hora
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocalValue(new Date().toISOString()));
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>("monthly");
  const filtered = categories.filter((c) => c.type === type); // Categorias do tipo selecionado
  // Reseta ou preenche formulário ao abrir o modal
  useEffect(() => {
    if (!open) return;
    if (initial && mode === "edit") {
      setAmount(String(initial.amount));
      setDescription(initial.description ?? "");
      setCategoryId(initial.categoryId ?? "");
      setOccurredAt(toDatetimeLocalValue(initial.occurredAt));
      const freq = initial.incomeFrequency;
      setIncomeFrequency(
        freq && (INCOME_FREQUENCIES as readonly string[]).includes(freq)
          ? (freq as IncomeFrequency)
          : "monthly",
      );
      return;
    }
    setAmount("");
    setDescription("");
    setCategoryId("");
    // Cria objeto de data/hora
    setOccurredAt(toDatetimeLocalValue(new Date().toISOString()));
    setIncomeFrequency("monthly");
  }, [open, type, initial, mode]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateFinancialEntry({
      description,
      amount,
      // Cria objeto de data/hora
      occurredAt: new Date(occurredAt).toISOString(),
      type,
      incomeFrequency: type === "income" ? incomeFrequency : null,
    });
    if (!validation.ok) {
      // Exibe notificação temporária (toast) na tela
      toast.error(validation.error);
      return;
    }
    const normalized = amount.replace(",", ".").trim();
    // Aguarda resposta assíncrona (API, timer)
    await onSubmit({
      amount: normalized,
      // Remove espaços no início/fim do texto
      description: description.trim(),
      categoryId: categoryId && categoryId !== "_none" ? categoryId : null,
      // Cria objeto de data/hora
      occurredAt: new Date(occurredAt).toISOString(),
      incomeFrequency: type === "income" ? incomeFrequency : null,
    });
  };
  const title =
    mode === "edit"
      ? type === "expense"
        ? "Editar despesa"
        : "Editar ganho/faturamento"
      : type === "expense"
        ? "Adicionar despesa"
        : "Registrar ganho/faturamento";
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
                id="tx-desc"
                // Texto cinza de exemplo dentro do campo vazio
                placeholder={type === "expense" ? "Ex.: Servidor VPS, Aluguel…" : "Ex.: Contrato Cliente X…"}
                value={description}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div className="grid gap-2">
              // Elemento/componente React na tela
              <Label htmlFor="tx-amount">Valor (R$) *</Label>
              // Elemento/componente React na tela
              <Input
                id="tx-amount"
                inputMode="decimal"
                // Texto cinza de exemplo dentro do campo vazio
                placeholder="0,00"
                value={amount}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            // Tag HTML na interface
            </div>
            {type === "income" && (
              // Tag HTML na interface
              <div className="grid gap-2">
                // Elemento/componente React na tela
                <Label>Tipo / frequência *</Label>
                // Elemento/componente React na tela
                <Select
                  value={incomeFrequency}
                  onValueChange={(v) => setIncomeFrequency(v as IncomeFrequency)}
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
                        {INCOME_FREQUENCY_LABELS[f]}
                      // Elemento/componente React na tela
                      </SelectItem>
                    ))}
                  // Elemento/componente React na tela
                  </SelectContent>
                // Elemento/componente React na tela
                </Select>
              // Tag HTML na interface
              </div>
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
                      {c.name}
                    // Elemento/componente React na tela
                    </SelectItem>
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
                id="tx-when"
                type="datetime-local"
                value={occurredAt}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            // Tag HTML na interface
            </div>
          // Tag HTML na interface
          </div>
          // Elemento/componente React na tela
          <DialogFooter>
            // Elemento/componente React na tela
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}

/** Modal para definir renda esperada e teto de despesas do mês. */
// Exporta função usada por outros arquivos
export function MonthlyBudgetDialog({
  open,
  onOpenChange,
  month,
  initialIncome,
  initialLimit,
  onSave,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: string;
  initialIncome: string;
  initialLimit: string;
  onSave: (income: string, limit: string) => Promise<void>;
  loading: boolean;
}) {
  const [income, setIncome] = useState(initialIncome);
  const [limit, setLimit] = useState(initialLimit);
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    if (open) {
      setIncome(initialIncome);
      setLimit(initialLimit);
    }
  }, [open, initialIncome, initialLimit]);
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
            Isto é planejamento — não substitui ganhos/faturamentos registrados. Os indicadores usam
            lançamentos reais.
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <div className="grid gap-2">
            // Elemento/componente React na tela
            <Label htmlFor="bud-inc">Renda mensal esperada (R$)</Label>
            // Elemento/componente React na tela
            <Input
              id="bud-inc"
              inputMode="decimal"
              value={income}
              // Atualiza estado quando o usuário digita/seleciona
              onChange={(e) => setIncome(e.target.value)}
              // Texto cinza de exemplo dentro do campo vazio
              placeholder="8500"
            />
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div className="grid gap-2">
            // Elemento/componente React na tela
            <Label htmlFor="bud-lim">Teto de despesas (opcional)</Label>
            // Elemento/componente React na tela
            <Input
              id="bud-lim"
              inputMode="decimal"
              value={limit}
              // Atualiza estado quando o usuário digita/seleciona
              onChange={(e) => setLimit(e.target.value)}
              // Texto cinza de exemplo dentro do campo vazio
              placeholder="5000"
            />
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
        // Elemento/componente React na tela
        <DialogFooter>
          // Elemento/componente React na tela
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
