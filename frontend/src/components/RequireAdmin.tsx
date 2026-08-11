/**
 * Guard de rota — exige permissão admin (capabilities); bloqueia usuários comuns.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { Loader2, ShieldAlert } from "lucide-react";
import { useCapabilities } from "@/hooks/use-capabilities"; // GET /api/me/capabilities

/** Envolve rotas /admin/* — renderiza children só se caps.isAdmin for true. */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { data: caps, isLoading, isError } = useCapabilities();

  // Estado de carregamento enquanto verifica permissões na API
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" size={24} />
        <p className="text-sm">Verificando permissões…</p>
      </div>
    );
  }

  // Bloqueio visual para usuários sem flag isAdmin
  if (isError || !caps?.isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <ShieldAlert className="text-destructive" size={40} />
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva para administradores. Clientes e usuários comuns não têm acesso à conexão WhatsApp.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
