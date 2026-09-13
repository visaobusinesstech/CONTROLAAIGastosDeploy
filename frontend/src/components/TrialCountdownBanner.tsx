/**
 * Banner minimalista estilo Apple — trial gratuito de 30 dias com contagem regressiva.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect, useState } from "react";
// Importa funções/componentes de @tanstack/react-query
import { useQuery } from "@tanstack/react-query";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/api
import { apiGetBillingStatus } from "@/lib/api";
// Importa funções/componentes de @/components/BillingPlanCards
import { BillingPlanCards } from "@/components/BillingPlanCards";
// Importa funções/componentes de @/lib/utils
import { cn } from "@/lib/utils";

/** Converte ms restantes em D:HH:MM:SS (ex.: 30:00:00:00 → 29:23:59:59). */
// Declara função auxiliar interna
function formatCountdown(ms: number): string {
  // Constante local
  const total = Math.max(0, Math.floor(ms / 1000));
  // Constante local
  const days = Math.floor(total / 86400);
  // Constante local
  const hours = Math.floor((total % 86400) / 3600);
  // Constante local
  const minutes = Math.floor((total % 3600) / 60);
  // Constante local
  const seconds = total % 60;
  // Constante local
  const pad = (n: number) => String(n).padStart(2, "0");
  // Condição — executa bloco só se verdadeira
  if (days > 0) {
    // Retorna valor ou JSX para quem chamou
    return `${days}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  // Retorna valor ou JSX para quem chamou
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Define formato de dados (TypeScript)
type Props = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  className?: string;
};

// Exporta função usada por outros arquivos
export function TrialCountdownBanner({ className }: Props) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token } = useAuth();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [now, setNow] = useState(() => Date.now());

  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: billing } = useQuery({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryKey: ["billing", token],
    // Instrução do fluxo — parte da lógica de negócio ou interface
    queryFn: () => apiGetBillingStatus(token!),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enabled: Boolean(token),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    staleTime: 60_000,
  });

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Constante local
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    // Retorna valor ou JSX para quem chamou
    return () => window.clearInterval(id);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, []);

  // Condição — executa bloco só se verdadeira
  if (!billing) return null;

  // Trial ativo — banner laranja com contagem
  if (billing.reason === "trial" && billing.trialEndsAt) {
    // Constante local
    const remaining = new Date(billing.trialEndsAt).getTime() - now;
    // Condição — executa bloco só se verdadeira
    if (remaining <= 0) return null;

    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div
        // Classes CSS Tailwind — controla aparência visual
        className={cn(
          // Instrução do fluxo — parte da lógica de negócio ou interface
          "relative z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-orange-500/20",
          // Instrução do fluxo — parte da lógica de negócio ou interface
          "bg-gradient-to-b from-orange-500/95 to-orange-600/95 px-3 py-2 text-center text-white",
          // Instrução do fluxo — parte da lógica de negócio ou interface
          "backdrop-blur-md supports-[backdrop-filter]:bg-orange-500/90",
          // Instrução do fluxo — parte da lógica de negócio ou interface
          className,
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        role="status"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        aria-live="polite"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Tag HTML na interface
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/90 sm:text-xs">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Teste gratuito
        // Tag HTML na interface
        </span>
        // Tag HTML na interface
        <span
          // Classes CSS Tailwind — controla aparência visual
          className="font-mono text-sm font-semibold tabular-nums tracking-tight sm:text-[15px]"
          // Texto acessível para leitores de tela
          aria-label="Tempo restante do trial"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {formatCountdown(remaining)}
        // Tag HTML na interface
        </span>
        // Tag HTML na interface
        <span className="hidden text-xs text-white/85 sm:inline">· 30 dias de acesso completo</span>
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Executa ação quando o usuário clica
          onClick={() => navigateToPlans()}
          // Classes CSS Tailwind — controla aparência visual
          className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/30 sm:text-xs"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Ver planos
        // Tag HTML na interface
        </button>
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }

  // Trial expirado — CTA direto para checkout Stripe
  if (billing.requiresPayment && billing.reason === "expired" && token) {
    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div
        // Classes CSS Tailwind — controla aparência visual
        className={cn(
          // Instrução do fluxo — parte da lógica de negócio ou interface
          "relative z-40 border-b border-orange-500/25 bg-gradient-to-b from-orange-600 to-orange-700 px-3 py-2.5 text-center text-white",
          // Instrução do fluxo — parte da lógica de negócio ou interface
          className,
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        )}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Tag HTML na interface
        <p className="text-xs font-medium text-white/95 sm:text-sm">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Seu teste gratuito terminou. Assine para continuar usando o Controla.ai.
        // Tag HTML na interface
        </p>
        // Tag HTML na interface
        <div className="mt-2">
          // Elemento/componente React na tela
          <BillingPlanCards billing={billing} token={token} variant="compact" />
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }

  // Retorna valor ou JSX para quem chamou
  return null;
}

// Declara função auxiliar interna
function navigateToPlans() {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  window.location.href = "/settings#assinatura";
}
