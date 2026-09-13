/**
 * Aviso de assinatura — trial expirado ou escolha de plano com checkout Stripe.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @tanstack/react-query
import { useQuery } from "@tanstack/react-query";
// Importa funções/componentes de lucide-react
import { Sparkles } from "lucide-react";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/api
import { apiGetBillingStatus } from "@/lib/api";
// Importa funções/componentes de @/components/BillingPlanCards
import { BillingPlanCards } from "@/components/BillingPlanCards";
// Importa funções/componentes de @/lib/utils
import { cn } from "@/lib/utils";

// Define formato de dados (TypeScript)
type Props = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  className?: string;
};

// Exporta função usada por outros arquivos
export function BillingPaywall({ className }: Props) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: billing, isLoading } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["billing", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetBillingStatus(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    staleTime: 30_000,
  });

  // Condição — executa bloco só se verdadeira
  if (isLoading || !billing) return null;
  // Condição — executa bloco só se verdadeira
  if (billing.hasAccess && billing.reason !== "expired") return null;
  // Condição — executa bloco só se verdadeira
  if (!billing.requiresPayment) return null;

  // Retorna valor ou JSX para quem chamou
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
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
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {token && <BillingPlanCards billing={billing} token={token} />}
      // Tag HTML na interface
      </div>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
