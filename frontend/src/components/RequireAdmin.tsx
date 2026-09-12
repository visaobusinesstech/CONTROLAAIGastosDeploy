/**
 * Guard de rota — exige admin (e-mail sistema, accessLevel ou capabilities).
 * Nunca bloqueia admin@admin.com por falha do Railway (/me/capabilities).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { Loader2, ShieldAlert } from "lucide-react";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useAuth } from "@/lib/auth";
import { userIsAdmin } from "@/lib/admin";

/** Envolve rotas /admin/* — libera se sessão for admin, senão consulta capabilities. */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { data: caps, isLoading, isError } = useCapabilities();

  // Sessão já identifica admin — não depende do Railway
  const sessionAdmin = userIsAdmin(user);
  if (sessionAdmin || caps?.isAdmin) {
    return <>{children}</>;
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="animate-spin" size={24} />
        <p className="text-sm">Verificando permissões…</p>
      </div>
    );
  }

  // Só bloqueia usuários comuns (erro de API ≠ negar admin já tratado acima)
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
