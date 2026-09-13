/**
 * Guard de rota — exige login como admin; redireciona demais usuários ao dashboard.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react-router-dom
import { Navigate, useLocation } from "react-router-dom"; // Redirecionamento condicional
// Importa funções/componentes de lucide-react
import { Loader2 } from "lucide-react";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth"; // Sessão JWT do usuário
// Importa funções/componentes de @/lib/admin
import { isAdminUser } from "@/lib/admin"; // Verifica e-mail admin@admin.com

/** Protege rotas administrativas antes do Layout (login dedicado). */
// Exporta como padrão do módulo (import default)
export default function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { token, user, loading } = useAuth();
  // Constante local
  const location = useLocation();

  // Condição — executa bloco só se verdadeira
  if (loading) {
    // Retorna valor ou JSX para quem chamou
    return (
      // Tag HTML na interface
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        // Elemento/componente React na tela
        <Loader2 className="animate-spin mr-2" size={18} />
        // Instrução do fluxo — parte da lógica de negócio ou interface
        Carregando…
      // Tag HTML na interface
      </div>
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }

  // Sem token → login administrativo
  if (!token) {
    // Retorna valor ou JSX para quem chamou
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Usuário comum autenticado → dashboard
  if (!isAdminUser(user?.email)) {
    // Retorna valor ou JSX para quem chamou
    return <Navigate to="/" replace />;
  }

  // Retorna valor ou JSX para quem chamou
  return <>{children}</>;
}
