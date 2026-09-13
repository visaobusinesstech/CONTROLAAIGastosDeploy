/**
 * Guard de rota — exige admin (e-mail sistema, accessLevel ou capabilities).
 * Nunca bloqueia admin@admin.com por falha do Railway (/me/capabilities).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de lucide-react
import { Loader2, ShieldAlert } from "lucide-react";
// Importa funções/componentes de @/hooks/use-capabilities
import { useCapabilities } from "@/hooks/use-capabilities";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/admin
import { userIsAdmin } from "@/lib/admin";

/** Envolve rotas /admin/* — libera se sessão for admin, senão consulta capabilities. */
// Exporta como padrão do módulo (import default)
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { user, loading: authLoading } = useAuth();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { data: caps, isLoading, isError } = useCapabilities();

  // Sessão já identifica admin — não depende do Railway
  const sessionAdmin = userIsAdmin(user);
  // Condição — executa bloco só se verdadeira
  if (sessionAdmin || caps?.isAdmin) {
    // Retorna valor ou JSX para quem chamou
    return <>{children}</>;
  }

  // Condição — executa bloco só se verdadeira
  if (authLoading || isLoading) {
    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        // Elemento/componente React na tela
        <Loader2 className="animate-spin" size={24} />
        // Tag HTML na interface
        <p className="text-sm">Verificando permissões…</p>
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }

  // Só bloqueia usuários comuns (erro de API ≠ negar admin já tratado acima)
  if (isError || !caps?.isAdmin) {
    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        // Elemento/componente React na tela
        <ShieldAlert className="text-destructive" size={40} />
        // Tag HTML na interface
        <h1 className="text-xl font-semibold text-foreground">Acesso restrito</h1>
        // Tag HTML na interface
        <p className="text-sm text-muted-foreground">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Esta área é exclusiva para administradores. Clientes e usuários comuns não têm acesso à conexão WhatsApp.
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }

  // Retorna valor ou JSX para quem chamou
  return <>{children}</>;
}
