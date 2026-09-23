/**
 * Guard de rota — exige login como admin; redireciona demais usuários ao dashboard.
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
import { Navigate, useLocation } from "react-router-dom"; // Redirecionamento condicional
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth"; // Sessão JWT do usuário
import { isAdminUser } from "@/lib/admin"; // Verifica e-mail admin@admin.com

/** Protege rotas administrativas antes do Layout (login dedicado). */
export default function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const { token, user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} />
        Carregando…
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdminUser(user?.email)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
