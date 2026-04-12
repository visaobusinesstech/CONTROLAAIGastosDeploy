import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import type { ApiCategory } from "@/lib/api";

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TransactionDialog({
  open,
  onOpenChange,
  type,
  categories,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  type: "expense" | "income";
  categories: ApiCategory[];
  onSubmit: (data: {
    amount: string;
    description: string;
    categoryId: string | null;
    occurredAt: string;
  }) => Promise<void>;
  loading: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [occurredAt, setOccurredAt] = useState(() => toDatetimeLocalValue(new Date().toISOString()));

  const filtered = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setDescription("");
    setCategoryId("");
    setOccurredAt(toDatetimeLocalValue(new Date().toISOString()));
  }, [open, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = amount.replace(",", ".").trim();
    if (!normalized || Number.isNaN(Number(normalized))) return;
    await onSubmit({
      amount: normalized,
      description: description.trim(),
      categoryId: categoryId && categoryId !== "_none" ? categoryId : null,
      occurredAt: new Date(occurredAt).toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{type === "expense" ? "Registrar gasto" : "Registrar receita"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tx-amount">Valor (R$)</Label>
              <Input
                id="tx-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-desc">Descrição</Label>
              <Input
                id="tx-desc"
                placeholder="Ex.: Almoço, salário…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sem categoria</SelectItem>
                  {filtered.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tx-when">Data e hora</Label>
              <Input
                id="tx-when"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-cgreen-500 hover:bg-cgreen-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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

  useEffect(() => {
    if (open) {
      setIncome(initialIncome);
      setLimit(initialLimit);
    }
  }, [open, initialIncome, initialLimit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renda e orçamento — {month}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="bud-inc">Renda mensal esperada (R$)</Label>
            <Input
              id="bud-inc"
              inputMode="decimal"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="8500"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bud-lim">Teto de despesas (opcional)</Label>
            <Input
              id="bud-lim"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="7000"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Os valores são salvos no banco e usados nas análises do período.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            type="button"
            disabled={loading}
            className="bg-cgreen-500 hover:bg-cgreen-700"
            onClick={async () => {
              await onSave(income.replace(",", ".").trim(), limit.replace(",", ".").trim());
              onOpenChange(false);
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
