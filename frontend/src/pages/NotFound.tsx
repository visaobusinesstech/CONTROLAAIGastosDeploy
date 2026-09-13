/**
 * Página 404 — exibida quando o usuário acessa uma URL que não existe no app.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Hook que informa qual URL o usuário tentou abrir (para log de diagnóstico)
import { useLocation } from "react-router-dom";
// Hook para executar código quando a página carrega ou a URL muda
import { useEffect } from "react";

/** Tela amigável de "página não encontrada" — rota catch-all "*" em App.tsx. */
const NotFound = () => {
  // Objeto com pathname (caminho) e demais dados da rota atual
  const location = useLocation();

  // Registra no console do navegador qual URL inválida foi acessada (útil para debug)
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]); // Reexecuta se o usuário navegar para outra rota inválida

  return (
    // Fundo cinza claro, conteúdo centralizado na tela inteira
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
