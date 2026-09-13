/**
 * Ponto de entrada React — monta a aplicação no DOM com tema e autenticação.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// createRoot: API moderna do React 18 para renderizar componentes na página
import { createRoot } from "react-dom/client";
// ThemeProvider: alterna tema claro/escuro adicionando classe "dark" no <html>
import { ThemeProvider } from "next-themes";
// Componente raiz com todas as rotas (Dashboard, Login, etc.)
import App from "./App.tsx";
// Provider que guarda token JWT e dados do usuário logado
import { AuthProvider } from "./lib/auth.tsx";
// Folha de estilos global (Tailwind CSS + variáveis de cores do design system)
import "./index.css";

// Procura o elemento <div id="root"> no index.html e monta a árvore React dentro dele
// O "!" informa ao TypeScript que o elemento existe (garantido pelo index.html)
createRoot(document.getElementById("root")!).render(
  // ThemeProvider envolve tudo — defaultTheme="dark" inicia no modo escuro
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
    {/* AuthProvider disponibiliza login/logout/token para qualquer componente filho */}
    <AuthProvider>
      {/* App contém rotas, toasts, tooltips e layout principal */}
      <App />
    </AuthProvider>
  </ThemeProvider>,
);
