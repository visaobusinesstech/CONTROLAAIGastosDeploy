/**
 * Guard de rota — exige admin (e-mail sistema, accessLevel ou capabilities).
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
import { Loader2, ShieldAlert } from "lucide-react";
import { useCapabilities } from "@/hooks/use-capabilities";
import { useAuth } from "@/lib/auth";
import { userIsAdmin } from "@/lib/admin";

/** Envolve rotas /admin/* — libera se sessão for admin, senão consulta capabilities. */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { user, loading: authLoading } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: caps, isLoading, isError } = useCapabilities();
  // Sessão já identifica admin — não depende do Railway
  const sessionAdmin = userIsAdmin(user);
  if (sessionAdmin || caps?.isAdmin) {
    return <>{children}</>;
  }
  if (authLoading || isLoading) {
    return (
      // Tag HTML na interface
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        // Elemento/componente React na tela
        <Loader2 className="animate-spin" size={24} />
        // Tag HTML na interface
        <p className="text-sm">Verificando permissões…</p>
      // Tag HTML na interface
      </div>
    );
  }
  // Só bloqueia usuários comuns (erro de API ≠ negar admin já tratado acima)
  if (isError || !caps?.isAdmin) {
    return (
      // Tag HTML na interface
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        // Elemento/componente React na tela
        <ShieldAlert className="text-destructive" size={40} />
        // Tag HTML na interface
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        // Tag HTML na interface
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva para administradores. Clientes e usuários comuns não têm acesso à conexão WhatsApp.
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>
    );
  }
  return <>{children}</>;
}
