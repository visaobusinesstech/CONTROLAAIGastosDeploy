/**
 * Guard de rota — exige staff (admin, operator ou viewer) para governança.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { Loader2, ShieldAlert } from "lucide-react";
import { useCapabilities } from "@/hooks/use-capabilities";

/** Envolve rotas de auditoria, LGPD e assinantes. */
export default function RequireStaff({ children }: { children: React.ReactNode }) {
  const { data: caps, isLoading, isError } = useCapabilities();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" size={24} />
        <p className="text-sm">Verificando permissões…</p>
      </div>
    );
  }

  if (isError || !caps?.isStaff) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <ShieldAlert className="text-destructive" size={40} />
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva para equipe interna (admin, operador ou visualizador).
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
