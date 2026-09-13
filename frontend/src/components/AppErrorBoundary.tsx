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
// Exporta constante/tipo/classe pública
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[app] render error:", error, info.componentStack);
  }
  componentDidUpdate(prevProps: Props): void {
    // Nova rota limpa o erro — evita tela “Algo deu errado” presa após login
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }
  render() {
    if (this.state.error) {
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
              this.setState({ error: null });
              window.location.href = "/";
            }}
          >
            Voltar ao início
          // Tag HTML na interface
          </button>
        // Tag HTML na interface
        </div>
      );
    }
    return this.props.children;
  }
}

/** Liga o boundary à URL atual para resetar ao navegar. */
// Exporta função usada por outros arquivos
export function AppErrorBoundaryWithRouter({ children }: { children: ReactNode }) {
  const location = useLocation();
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    /* só para forçar re-render com resetKey via location.key */
  }, [location.key]);
  return <AppErrorBoundary resetKey={location.key}>{children}</AppErrorBoundary>;
}
