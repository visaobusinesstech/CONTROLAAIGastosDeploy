/**
 * Página 404 — exibida quando o usuário acessa uma URL que não existe no app.
 *
 * Papel no sistema: Página React Router — UI autenticada consumindo api.ts e auth.tsx.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

/** Tela amigável de "página não encontrada" — rota catch-all "*" em App.tsx. */
const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]); // Reexecuta se o usuário navegar para outra rota inválida
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        {/* Número grande "404" — código HTTP padrão de "não encontrado" */}
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        {/* Mensagem explicativa para o usuário leigo */}
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        {/* Link simples de volta ao dashboard (href="/" recarrega a raiz do app) */}
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
