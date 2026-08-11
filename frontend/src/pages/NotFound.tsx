/**
 * Página 404 — rota não encontrada.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useLocation } from "react-router-dom"; // Lê pathname atual para log
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  // Registra tentativa de acesso a rota inexistente no console
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
