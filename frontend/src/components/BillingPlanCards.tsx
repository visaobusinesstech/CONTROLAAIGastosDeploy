/**
 * Cards de planos Controla.AI Pro — checkout Stripe em nova guia.
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
import { useState } from "react";
import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiPostBillingCheckout, type ApiBillingStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

type PlanInterval = "monthly" | "yearly";

type Props = {
  billing: ApiBillingStatus;
  token: string;
  className?: string;
  /** Texto compacto (banner) ou cards completos (settings). */
  variant?: "cards" | "compact";
};

// Declara função auxiliar interna
function formatBrl(value: number, decimals = 2): string {
  return value.toFixed(decimals).replace(".", ",");
}

/** Abre Payment Link ou checkout Stripe em nova guia. */
// Declara função auxiliar interna
async function openPlanCheckout(
  interval: PlanInterval,
  billing: ApiBillingStatus,
  token: string,
): Promise<void> {
  const paymentLink = billing.paymentLinks?.[interval];
  if (paymentLink) {
    window.open(paymentLink, "_blank", "noopener,noreferrer");
    return;
  }
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { url } = await apiPostBillingCheckout(token, interval);
  window.open(url, "_blank", "noopener,noreferrer");
}

const MONTHLY_FEATURES = ["Painel e gráficos", "Metas e orçamentos", "Assistente IA no WhatsApp"];
const YEARLY_FEATURES = ["Tudo do plano mensal", "33% de economia", "Cobrança única anual"];

// Exporta função usada por outros arquivos
export function BillingPlanCards({ billing, token, className, variant = "cards" }: Props) {
  const [loadingPlan, setLoadingPlan] = useState<PlanInterval | null>(null);
  const monthlyAmount = billing.prices.monthly.amount;
  const yearlyAmount = billing.prices.yearly.amount;
  const yearlyMonthly = yearlyAmount / 12;
  const savingsPct = Math.round((1 - yearlyMonthly / monthlyAmount) * 100);
  const choose = async (interval: PlanInterval) => {
    if (!billing.stripeConfigured) {
      // Exibe notificação temporária (toast) na tela
      toast.error("Pagamentos em configuração. Tente novamente em breve.");
      return;
    }
    setLoadingPlan(interval);
    try {
      // Aguarda resposta assíncrona (API, timer)
      await openPlanCheckout(interval, billing, token);
    } catch (e) {
      // Exibe notificação temporária (toast) na tela
      toast.error(e instanceof Error ? e.message : "Erro ao abrir checkout");
    } finally {
      setLoadingPlan(null);
    }
  };
  if (variant === "compact") {
    return (
      // Tag HTML na interface
      <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Desabilita botão/campo (ex.: durante envio)
          disabled={loadingPlan !== null || !billing.stripeConfigured}
          // Executa ação quando o usuário clica
          onClick={() => void choose("monthly")}
          // Classes CSS Tailwind — controla aparência visual
          className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-orange-700 shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 sm:text-sm"
        >
          {loadingPlan === "monthly" ? "Abrindo…" : `R$ ${formatBrl(monthlyAmount)}/mês`}
        // Tag HTML na interface
        </button>
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Desabilita botão/campo (ex.: durante envio)
          disabled={loadingPlan !== null || !billing.stripeConfigured}
          // Executa ação quando o usuário clica
          onClick={() => void choose("yearly")}
          // Classes CSS Tailwind — controla aparência visual
          className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/25 disabled:opacity-60 sm:text-sm"
        >
          {loadingPlan === "yearly" ? "Abrindo…" : `R$ ${formatBrl(yearlyMonthly)} × 12`}
        // Tag HTML na interface
        </button>
      // Tag HTML na interface
      </div>
    );
  }
  return (
    // Tag HTML na interface
    <div className={cn("space-y-4", className)}>
      // Tag HTML na interface
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Mensal */}
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Desabilita botão/campo (ex.: durante envio)
          disabled={loadingPlan !== null || !billing.stripeConfigured}
          // Executa ação quando o usuário clica
          onClick={() => void choose("monthly")}
          // Classes CSS Tailwind — controla aparência visual
          className="group relative flex flex-col rounded-2xl border border-border bg-background p-5 text-left shadow-sm transition-all hover:border-cgreen-500/60 hover:shadow-md disabled:opacity-60"
        >
          // Tag HTML na interface
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Mensal
          // Tag HTML na interface
          </span>
          // Tag HTML na interface
          <div className="mt-3 flex items-baseline gap-1">
            // Tag HTML na interface
            <span className="text-3xl font-bold tracking-tight text-foreground">
              R$ {formatBrl(monthlyAmount)}
            // Tag HTML na interface
            </span>
            // Tag HTML na interface
            <span className="text-sm font-medium text-muted-foreground">/mês</span>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <p className="mt-1 text-sm text-muted-foreground">Flexível, cancele quando quiser</p>
          // Tag HTML na interface
          <ul className="mt-4 space-y-2">
            // Percorre lista e renderiza um item para cada elemento
            {MONTHLY_FEATURES.map((f) => (
              // Tag HTML na interface
              <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                // Elemento/componente React na tela
                <Check className="h-3.5 w-3.5 shrink-0 text-cgreen-500" />
                {f}
              // Tag HTML na interface
              </li>
            ))}
          // Tag HTML na interface
          </ul>
          // Tag HTML na interface
          <span className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-sm font-semibold text-foreground transition-colors group-hover:bg-cgreen-500 group-hover:text-white">
            {loadingPlan === "monthly" ? "Abrindo checkout…" : "Assinar mensal"}
            // Elemento/componente React na tela
            <ArrowUpRight className="h-4 w-4 opacity-70" />
          // Tag HTML na interface
          </span>
        // Tag HTML na interface
        </button>
        {/* Anual */}
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Desabilita botão/campo (ex.: durante envio)
          disabled={loadingPlan !== null || !billing.stripeConfigured}
          // Executa ação quando o usuário clica
          onClick={() => void choose("yearly")}
          // Classes CSS Tailwind — controla aparência visual
          className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-cgreen-500 bg-gradient-to-b from-cgreen-500/10 to-cgreen-500/5 p-5 text-left shadow-sm transition-all hover:shadow-lg disabled:opacity-60"
        >
          // Tag HTML na interface
          <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-cgreen-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            // Elemento/componente React na tela
            <Sparkles className="h-3 w-3" />
            Economize {savingsPct}%
          // Tag HTML na interface
          </span>
          // Tag HTML na interface
          <span className="text-xs font-semibold uppercase tracking-widest text-cgreen-700 dark:text-cgreen-400">
            Anual
          // Tag HTML na interface
          </span>
          // Tag HTML na interface
          <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            // Tag HTML na interface
            <span className="text-3xl font-bold tracking-tight text-foreground">
              R$ {formatBrl(yearlyMonthly)}
            // Tag HTML na interface
            </span>
            // Tag HTML na interface
            <span className="text-lg font-semibold text-muted-foreground">× 12</span>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <p className="mt-1 text-sm text-muted-foreground">
            R$ {formatBrl(yearlyAmount, 0)} cobrados uma vez por ano
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <ul className="mt-4 space-y-2">
            // Percorre lista e renderiza um item para cada elemento
            {YEARLY_FEATURES.map((f) => (
              // Tag HTML na interface
              <li key={f} className="flex items-center gap-2 text-sm text-foreground/90">
                // Elemento/componente React na tela
                <Check className="h-3.5 w-3.5 shrink-0 text-cgreen-600" />
                {f}
              // Tag HTML na interface
              </li>
            ))}
          // Tag HTML na interface
          </ul>
          // Tag HTML na interface
          <span className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-cgreen-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform group-hover:bg-cgreen-600 group-active:scale-[0.99]">
            {loadingPlan === "yearly" ? "Abrindo checkout…" : "Assinar anual"}
            // Elemento/componente React na tela
            <ArrowUpRight className="h-4 w-4" />
          // Tag HTML na interface
          </span>
        // Tag HTML na interface
        </button>
      // Tag HTML na interface
      </div>
      {!billing.stripeConfigured && (
        // Tag HTML na interface
        <p className="text-center text-xs text-amber-600">
          Pagamentos em configuração. Tente novamente em breve.
        // Tag HTML na interface
        </p>
      )}
      // Tag HTML na interface
      <p className="text-center text-xs text-muted-foreground">
        Pagamento seguro via Stripe · abre em nova guia
      // Tag HTML na interface
      </p>
    // Tag HTML na interface
    </div>
  );
}
