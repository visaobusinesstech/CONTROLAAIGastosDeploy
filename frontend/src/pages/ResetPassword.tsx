/**
 * Página de nova senha — token do e-mail; após salvar redireciona ao login.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect, useMemo, useState } from "react";
// Importa funções/componentes de react-router-dom
import { Link, useNavigate, useSearchParams } from "react-router-dom";
// Importa funções/componentes de framer-motion
import { motion } from "framer-motion";
// Importa funções/componentes de lucide-react
import { Eye, EyeOff } from "lucide-react";
// Importa funções/componentes de @/components/Logo
import { LogoFull } from "@/components/Logo";
// Importa funções/componentes de @/lib/api
import { ApiError, resetPasswordRequest, translateApiError } from "@/lib/api";

// Exporta como padrão do módulo (import default)
export default function ResetPassword() {
  // Constante local
  const navigate = useNavigate();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [params] = useSearchParams();
  // Valor memorizado — recalcula só quando dependências mudam
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [password, setPassword] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [confirm, setConfirm] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [showPw, setShowPw] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [submitting, setSubmitting] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [error, setError] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [done, setDone] = useState(false);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (!done) return;
    // Constante local
    const t = window.setTimeout(() => {
      // Navega para outra página do app
      navigate("/login?reset=1", { replace: true });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    }, 1200);
    // Retorna valor ou JSX para quem chamou
    return () => window.clearTimeout(t);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [done, navigate]);

  // Constante local
  const handleSubmit = async (e: React.FormEvent) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    e.preventDefault();
    // Condição — executa bloco só se verdadeira
    if (password.length < 6) {
      // Atualiza mensagem de erro exibida ao usuário
      setError("A senha deve ter pelo menos 6 caracteres");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (password !== confirm) {
      // Atualiza mensagem de erro exibida ao usuário
      setError("As senhas não coincidem");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    // Tenta executar — erros vão para catch
    try {
      // Aguarda resposta assíncrona (API, timer)
      await resetPasswordRequest({ token, password });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setDone(true);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (err) {
      // Atualiza mensagem de erro exibida ao usuário
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível redefinir a senha.");
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Liga/desliga indicador "carregando" no botão
      setSubmitting(false);
    }
  };

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="min-h-[100dvh] min-h-screen bg-surface-page dark:bg-background flex flex-col items-center justify-center py-6 px-4 overflow-y-auto overflow-x-hidden">
      // Tag HTML na interface
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm min-w-0">
        // Tag HTML na interface
        <div className="flex justify-center mb-6 sm:mb-8">
          // Elemento/componente React na tela
          <LogoFull />
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="bg-surface-card dark:bg-card border border-cgray-200 dark:border-cgray-800 rounded-2xl p-4 sm:p-6 space-y-5 min-w-0">
          // Tag HTML na interface
          <div className="text-center">
            // Tag HTML na interface
            <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Nova senha</h1>
            // Tag HTML na interface
            <p className="text-sm text-cgray-400 mt-1">Escolha uma senha de pelo menos 6 caracteres.</p>
          // Tag HTML na interface
          </div>

          // Instrução do fluxo — parte da lógica de negócio ou interface
          {!token ? (
            // Tag HTML na interface
            <p className="text-sm text-cred-main text-center">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Link inválido. Solicite um novo em{" "}
              // Elemento/componente React na tela
              <Link to="/forgot-password" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                // Instrução do fluxo — parte da lógica de negócio ou interface
                esqueci a senha
              // Elemento/componente React na tela
              </Link>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              .
            // Tag HTML na interface
            </p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ) : done ? (
            // Tag HTML na interface
            <div className="space-y-4 text-center">
              // Tag HTML na interface
              <div
                // Instrução do fluxo — parte da lógica de negócio ou interface
                role="status"
                // Classes CSS Tailwind — controla aparência visual
                className="rounded-xl px-4 py-3 text-sm bg-cgreen-50 dark:bg-cgreen-950/30 text-cgreen-800 dark:text-cgreen-200 border border-cgreen-200 dark:border-cgreen-800"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Senha atualizada! Redirecionando para o login…
              // Tag HTML na interface
              </div>
              // Elemento/componente React na tela
              <Link
                // Instrução do fluxo — parte da lógica de negócio ou interface
                to="/login?reset=1"
                // Classes CSS Tailwind — controla aparência visual
                className="block w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium leading-[44px] hover:bg-cgreen-700"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Ir para o login
              // Elemento/componente React na tela
              </Link>
            // Tag HTML na interface
            </div>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ) : (
            // Tag HTML na interface
            <form onSubmit={handleSubmit} className="space-y-4">
              // Tag HTML na interface
              <div>
                // Tag HTML na interface
                <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Nova senha
                // Tag HTML na interface
                </label>
                // Tag HTML na interface
                <div className="relative">
                  // Tag HTML na interface
                  <input
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    type={showPw ? "text" : "password"}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    value={password}
                    // Atualiza estado quando o usuário digita/seleciona
                    onChange={(e) => {
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      setPassword(e.target.value);
                      // Atualiza mensagem de erro exibida ao usuário
                      setError("");
                    // Passo do algoritmo — executa parte da regra de negócio ou da interface
                    }}
                    // Texto cinza de exemplo dentro do campo vazio
                    placeholder="••••••"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    required
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    minLength={6}
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    autoComplete="new-password"
                    // Classes CSS Tailwind — controla aparência visual
                    className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-11 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  />
                  // Tag HTML na interface
                  <button
                    // Botão comum (não envia formulário)
                    type="button"
                    // Executa ação quando o usuário clica
                    onClick={() => setShowPw(!showPw)}
                    // Classes CSS Tailwind — controla aparência visual
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cgray-400"
                    // Texto acessível para leitores de tela
                    aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  >
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  // Tag HTML na interface
                  </button>
                // Tag HTML na interface
                </div>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div>
                // Tag HTML na interface
                <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Confirmar senha
                // Tag HTML na interface
                </label>
                // Tag HTML na interface
                <input
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  type={showPw ? "text" : "password"}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  value={confirm}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => {
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    setConfirm(e.target.value);
                    // Atualiza mensagem de erro exibida ao usuário
                    setError("");
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  }}
                  // Texto cinza de exemplo dentro do campo vazio
                  placeholder="••••••"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  required
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  minLength={6}
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  autoComplete="new-password"
                  // Classes CSS Tailwind — controla aparência visual
                  className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                />
              // Tag HTML na interface
              </div>
              // Classes CSS Tailwind — controla aparência visual
              {error && <p className="text-xs text-cred-main">{error}</p>}
              // Tag HTML na interface
              <button
                // Botão que envia o formulário
                type="submit"
                // Desabilita botão/campo (ex.: durante envio)
                disabled={submitting}
                // Classes CSS Tailwind — controla aparência visual
                className="w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium hover:bg-cgreen-700 active:scale-[0.98] transition-all disabled:opacity-60"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {submitting ? "Salvando…" : "Redefinir senha"}
              // Tag HTML na interface
              </button>
            // Tag HTML na interface
            </form>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}

          // Instrução do fluxo — parte da lógica de negócio ou interface
          {!done && (
            // Tag HTML na interface
            <p className="text-center text-sm text-cgray-400">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Lembrou a senha?{" "}
              // Elemento/componente React na tela
              <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Entrar
              // Elemento/componente React na tela
              </Link>
            // Tag HTML na interface
            </p>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </motion.div>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
