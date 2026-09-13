/**
 * Aviso de assinatura — trial expirado ou escolha de plano com checkout Stripe.
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
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiGetBillingStatus } from "@/lib/api";
import { BillingPlanCards } from "@/components/BillingPlanCards";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

// Exporta função usada por outros arquivos
export function BillingPaywall({ className }: Props) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: billing, isLoading } = useQuery({
    queryKey: ["billing", token],
    queryFn: () => apiGetBillingStatus(token!),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
  if (isLoading || !billing) return null;
  if (billing.hasAccess && billing.reason !== "expired") return null;
  if (!billing.requiresPayment) return null;
  return (
    // Tag HTML na interface
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}>
      // Tag HTML na interface
      <div className="border-b border-border bg-gradient-to-r from-cgreen-500/10 to-transparent px-6 py-4">
        // Tag HTML na interface
        <div className="flex items-center gap-3">
          // Tag HTML na interface
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cgreen-500 shadow-sm">
            // Elemento/componente React na tela
            <Sparkles className="h-5 w-5 text-white" />
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <div>
            // Tag HTML na interface
            <h2 className="text-lg font-semibold text-foreground">Controla.AI Pro</h2>
            // Tag HTML na interface
            <p className="text-sm text-muted-foreground">
              Seu teste gratuito terminou. Escolha um plano e continue com tudo liberado.
            // Tag HTML na interface
            </p>
          // Tag HTML na interface
          </div>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
      // Tag HTML na interface
      <div className="p-6">
        {token && <BillingPlanCards billing={billing} token={token} />}
      // Tag HTML na interface
      </div>
    // Tag HTML na interface
    </div>
  );
}
