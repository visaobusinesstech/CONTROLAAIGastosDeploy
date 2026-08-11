/**
 * Ponto de entrada React — monta App com ThemeProvider e AuthProvider.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// React DOM — cria a raiz e renderiza a árvore de componentes
import { createRoot } from "react-dom/client";
// next-themes — tema claro/escuro via classe CSS no documento
import { ThemeProvider } from "next-themes";
// Componente raiz com rotas e providers internos
import App from "./App.tsx";
// Contexto de autenticação JWT (envolve toda a aplicação)
import { AuthProvider } from "./lib/auth.tsx";
// Estilos globais Tailwind e tokens de design
import "./index.css";

// Monta a aplicação no elemento #root do index.html
createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>,
);
