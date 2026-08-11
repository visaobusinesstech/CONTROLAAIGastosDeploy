/**
 * Aviso de assinatura — trial expirado ou escolha de plano com checkout Stripe.
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

export function BillingPaywall({ className }: Props) {
  const { token } = useAuth();

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
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card shadow-sm", className)}>
      <div className="border-b border-border bg-gradient-to-r from-cgreen-500/10 to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cgreen-500 shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Controla.AI Pro</h2>
            <p className="text-sm text-muted-foreground">
              Seu teste gratuito terminou. Escolha um plano e continue com tudo liberado.
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {token && <BillingPlanCards billing={billing} token={token} />}
      </div>
    </div>
  );
}
