/**
 * Banner minimalista estilo Apple — trial gratuito de 30 dias com contagem regressiva.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiGetBillingStatus } from "@/lib/api";
import { BillingPlanCards } from "@/components/BillingPlanCards";
import { cn } from "@/lib/utils";

/** Converte ms restantes em D:HH:MM:SS (ex.: 30:00:00:00 → 29:23:59:59). */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0) {
    return `${days}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

type Props = {
  className?: string;
};

export function TrialCountdownBanner({ className }: Props) {
  const { token } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  const { data: billing } = useQuery({
    queryKey: ["billing", token],
    queryFn: () => apiGetBillingStatus(token!),
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!billing) return null;

  // Trial ativo — banner laranja com contagem
  if (billing.reason === "trial" && billing.trialEndsAt) {
    const remaining = new Date(billing.trialEndsAt).getTime() - now;
    if (remaining <= 0) return null;

    return (
      <div
        className={cn(
          "relative z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-orange-500/20",
          "bg-gradient-to-b from-orange-500/95 to-orange-600/95 px-3 py-2 text-center text-white",
          "backdrop-blur-md supports-[backdrop-filter]:bg-orange-500/90",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/90 sm:text-xs">
          Teste gratuito
        </span>
        <span
          className="font-mono text-sm font-semibold tabular-nums tracking-tight sm:text-[15px]"
          aria-label="Tempo restante do trial"
        >
          {formatCountdown(remaining)}
        </span>
        <span className="hidden text-xs text-white/85 sm:inline">· 30 dias de acesso completo</span>
        <button
          type="button"
          onClick={() => navigateToPlans()}
          className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white transition-colors hover:bg-white/30 sm:text-xs"
        >
          Ver planos
        </button>
      </div>
    );
  }

  // Trial expirado — CTA direto para checkout Stripe
  if (billing.requiresPayment && billing.reason === "expired" && token) {
    return (
      <div
        className={cn(
          "relative z-40 border-b border-orange-500/25 bg-gradient-to-b from-orange-600 to-orange-700 px-3 py-2.5 text-center text-white",
          className,
        )}
      >
        <p className="text-xs font-medium text-white/95 sm:text-sm">
          Seu teste gratuito terminou. Assine para continuar usando o Controla.ai.
        </p>
        <div className="mt-2">
          <BillingPlanCards billing={billing} token={token} variant="compact" />
        </div>
      </div>
    );
  }

  return null;
}

function navigateToPlans() {
  window.location.href = "/settings#assinatura";
}
