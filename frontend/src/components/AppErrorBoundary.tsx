/**
 * Error boundary global — captura erros de renderização e exibe fallback amigável.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
// Importa funções/componentes de react-router-dom
import { useLocation } from "react-router-dom";

// Define formato de dados (TypeScript)
type Props = { children: ReactNode; resetKey?: string };
// Define formato de dados (TypeScript)
type State = { error: Error | null };

/** Envolve rotas em App.tsx para evitar tela branca em falhas de render. */
// Exporta constante/tipo/classe pública
export class AppErrorBoundary extends Component<Props, State> {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  state: State = { error: null };

  // Instrução do fluxo — parte da lógica de negócio ou interface
  static getDerivedStateFromError(error: Error): State {
    // Retorna valor ou JSX para quem chamou
    return { error };
  }

  // Instrução do fluxo — parte da lógica de negócio ou interface
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[app] render error:", error, info.componentStack);
  }

  // Instrução do fluxo — parte da lógica de negócio ou interface
  componentDidUpdate(prevProps: Props): void {
    // Nova rota limpa o erro — evita tela “Algo deu errado” presa após login
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      this.setState({ error: null });
    }
  }

  // Instrução do fluxo — parte da lógica de negócio ou interface
  render() {
    // Condição — executa bloco só se verdadeira
    if (this.state.error) {
      // Retorna valor ou JSX para quem chamou
      return (
        // Tag HTML na interface
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          // Tag HTML na interface
          <h1 className="text-lg font-semibold text-foreground">Algo deu errado ao carregar a página</h1>
          // Tag HTML na interface
          <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          // Tag HTML na interface
          <button
            // Botão comum (não envia formulário)
            type="button"
            // Classes CSS Tailwind — controla aparência visual
            className="rounded-xl bg-cgreen-500 px-4 py-2 text-sm font-medium text-white"
            // Executa ação quando o usuário clica
            onClick={() => {
              // Instrução do fluxo — parte da lógica de negócio ou interface
              this.setState({ error: null });
              // Instrução do fluxo — parte da lógica de negócio ou interface
              window.location.href = "/";
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          >
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Voltar ao início
          // Tag HTML na interface
          </button>
        // Tag HTML na interface
        </div>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      );
    }
    // Retorna valor ou JSX para quem chamou
    return this.props.children;
  }
}

/** Liga o boundary à URL atual para resetar ao navegar. */
// Exporta função usada por outros arquivos
export function AppErrorBoundaryWithRouter({ children }: { children: ReactNode }) {
  // Constante local
  const location = useLocation();
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    /* só para forçar re-render com resetKey via location.key */
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [location.key]);
  // Retorna valor ou JSX para quem chamou
  return <AppErrorBoundary resetKey={location.key}>{children}</AppErrorBoundary>;
}
