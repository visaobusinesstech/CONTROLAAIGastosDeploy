/**
 * Error boundary global — captura erros de renderização e exibe fallback amigável.
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
import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type Props = { children: ReactNode; resetKey?: string };
type State = { error: Error | null };

/** Envolve rotas em App.tsx para evitar tela branca em falhas de render. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[app] render error:", error, info.componentStack);
  }
  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
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

/** Liga o boundary à URL atual para resetar ao navegar. */
export function AppErrorBoundaryWithRouter({ children }: { children: ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    /* só para forçar re-render com resetKey via location.key */
  }, [location.key]);
  return <AppErrorBoundary resetKey={location.key}>{children}</AppErrorBoundary>;
}
