/**
 * Error boundary global — captura erros de renderização e exibe fallback amigável.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Envolve BrowserRouter em App.tsx para evitar tela branca em falhas de render. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[app] render error:", error, info.componentStack);
  }

  render() {
    // UI de fallback quando um componente filho lança exceção
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">Algo deu errado ao carregar a página</h1>
          <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          <button
            type="button"
            className="rounded-xl bg-cgreen-500 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              this.setState({ error: null });
              window.location.href = "/";
            }}
          >
            Voltar ao início
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
