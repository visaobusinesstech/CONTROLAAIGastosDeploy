/**
 * Ponto de entrada React — monta a aplicação no DOM com tema e autenticação.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import { AuthProvider } from "./lib/auth.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    {/* AuthProvider disponibiliza login/logout/token para qualquer componente filho */}
    <AuthProvider>
      {/* App contém rotas, toasts, tooltips e layout principal */}
      <App />
    </AuthProvider>
  </ThemeProvider>,
);
