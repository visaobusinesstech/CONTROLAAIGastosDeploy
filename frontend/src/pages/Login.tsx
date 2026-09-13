/**
 * Login unificado — usuários comuns e admin na mesma rota (/login).
 * Ao digitar admin@admin.com, a UI muda para o modo administrativo.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useMemo, useState } from "react";
// Importa funções/componentes de react-router-dom
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
// Importa funções/componentes de @tanstack/react-query
import { useQueryClient } from "@tanstack/react-query";
// Importa funções/componentes de framer-motion
import { AnimatePresence, motion } from "framer-motion";
// Importa funções/componentes de lucide-react
import { Eye, EyeOff, Shield } from "lucide-react";
// Importa funções/componentes de @/components/Logo
import { LogoFull } from "@/components/Logo";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/api
import { loginRequest, verifyTwoFactorRequest, ApiError, translateApiError, isAuthChallenge, type AuthChallengeResponse, type ApiUser } from "@/lib/api";
// Importa funções/componentes de @/lib/admin
import { isAdminUser } from "@/lib/admin";
// Importa funções/componentes de @/lib/routes
import { getPostLoginPath } from "@/lib/routes";
// Importa funções/componentes de @/components/EmailOtpStep
import { EmailOtpStep } from "@/components/EmailOtpStep";

// Exporta como padrão do módulo (import default)
export default function Login() {
  // Consulta à API com cache (React Query)
  const queryClient = useQueryClient();
  // Constante local
  const location = useLocation();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [searchParams] = useSearchParams();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { setSession, logout, token, user, loading } = useAuth();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [email, setEmail] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [password, setPassword] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [showPw, setShowPw] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [error, setError] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [submitting, setSubmitting] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);
  // Constante local
  const justReset = searchParams.get("reset") === "1";

  // Constante local
  const isAdminMode = isAdminUser(email.trim());
  // Constante local
  const redirectFrom = (location.state as { from?: string } | null)?.from;

  // Constante local
  const inputFocusClass = isAdminMode
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ? "focus:border-amber-500"
    // Instrução do fluxo — parte da lógica de negócio ou interface
    : "focus:border-cgreen-500";

  // Hooks SEMPRE antes de qualquer return (evita "Rendered fewer hooks than expected" no login)
  const header = useMemo(
    // Instrução do fluxo — parte da lógica de negócio ou interface
    () =>
      // Instrução do fluxo — parte da lógica de negócio ou interface
      isAdminMode ? (
        // Tag HTML na interface
        <motion.div
          // Instrução do fluxo — parte da lógica de negócio ou interface
          key="admin-header"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          initial={{ opacity: 0, y: -6 }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          animate={{ opacity: 1, y: 0 }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          exit={{ opacity: 0, y: 6 }}
          // Classes CSS Tailwind — controla aparência visual
          className="text-center"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Tag HTML na interface
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/25">
            // Elemento/componente React na tela
            <Shield className="text-amber-700 dark:text-amber-400" size={22} />
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Área administrativa</h1>
          // Tag HTML na interface
          <p className="text-sm text-cgray-400 mt-1">WhatsApp, logs IA e recursos premium</p>
        // Tag HTML na interface
        </motion.div>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      ) : (
        // Tag HTML na interface
        <motion.div
          // Instrução do fluxo — parte da lógica de negócio ou interface
          key="user-header"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          initial={{ opacity: 0, y: -6 }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          animate={{ opacity: 1, y: 0 }}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          exit={{ opacity: 0, y: 6 }}
          // Classes CSS Tailwind — controla aparência visual
          className="text-center"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Tag HTML na interface
          <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Entrar na sua conta</h1>
          // Tag HTML na interface
          <p className="text-sm text-cgray-400 mt-1">Acesse seu dashboard financeiro</p>
        // Tag HTML na interface
        </motion.div>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      ),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    [isAdminMode],
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );

  // Condição — executa bloco só se verdadeira
  if (!loading && token && user) {
    // Retorna valor ou JSX para quem chamou
    return <Navigate to={getPostLoginPath(user.email, redirectFrom)} replace />;
  }

  // Constante local
  const handleLogin = async (e: React.FormEvent) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    e.preventDefault();
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const trimmedEmail = email.trim();
      // Constante local
      const result = await loginRequest({ email: trimmedEmail, password });
      // Condição — executa bloco só se verdadeira
      if (isAuthChallenge(result)) {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setChallenge(result);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
      // Instrução do fluxo — parte da lógica de negócio ou interface
      finishSession(result.token, result.user);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (err) {
      // Condição — executa bloco só se verdadeira
      if (err instanceof ApiError) {
        // Condição — executa bloco só se verdadeira
        if (err.status === 0) {
          // Atualiza mensagem de erro exibida ao usuário
          setError(
            // Instrução do fluxo — parte da lógica de negócio ou interface
            import.meta.env.PROD
              // Instrução do fluxo — parte da lógica de negócio ou interface
              ? "Servidor da API offline. Configure BACKEND_URL no Vercel (URL pública do Railway)."
              // Instrução do fluxo — parte da lógica de negócio ou interface
              : "API offline. Rode: cd backend && npm run dev (porta 3333).",
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          );
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        } else if (err.status === 503) {
          // Atualiza mensagem de erro exibida ao usuário
          setError("Banco de dados indisponível. Verifique DATABASE_URL no Railway.");
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        } else {
          // Atualiza mensagem de erro exibida ao usuário
          setError(translateApiError(err.message));
        }
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } else {
        // Atualiza mensagem de erro exibida ao usuário
        setError(
          // Instrução do fluxo — parte da lógica de negócio ou interface
          import.meta.env.PROD
            // Instrução do fluxo — parte da lógica de negócio ou interface
            ? "Não foi possível conectar ao servidor."
            // Instrução do fluxo — parte da lógica de negócio ou interface
            : "API offline. Rode: cd backend && npm run dev (porta 3333).",
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        );
      }
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Liga/desliga indicador "carregando" no botão
      setSubmitting(false);
    }
  };

  // Constante local
  const finishSession = (t: string, loggedIn: ApiUser) => {
    // Constante local
    const admin = isAdminUser(loggedIn.email);
    // Condição — executa bloco só se verdadeira
    if (isAdminMode && !admin) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      logout();
      // Atualiza mensagem de erro exibida ao usuário
      setError("Acesso negado. Somente a conta administrativa pode usar este modo.");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setChallenge(null);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setSession(t, loggedIn);
    // Gerencia cache de dados da API (React Query)
    queryClient.clear();
    // Instrução do fluxo — parte da lógica de negócio ou interface
    window.location.assign(getPostLoginPath(loggedIn.email, redirectFrom));
  };

  // Constante local
  const handleVerifyOtp = async (code: string) => {
    // Condição — executa bloco só se verdadeira
    if (!challenge || code.length !== 6) return;
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const result = await verifyTwoFactorRequest({ challengeId: challenge.challengeId, code });
      // Condição — executa bloco só se verdadeira
      if (!("token" in result)) {
        // Atualiza mensagem de erro exibida ao usuário
        setError("Código confirmado, mas o login não foi concluído. Tente entrar de novo.");
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
      // Instrução do fluxo — parte da lógica de negócio ou interface
      finishSession(result.token, result.user);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (err) {
      // Atualiza mensagem de erro exibida ao usuário
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível verificar o código.");
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
      <motion.div
        // Instrução do fluxo — parte da lógica de negócio ou interface
        initial={{ opacity: 0, y: 16 }}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        animate={{ opacity: 1, y: 0 }}
        // Classes CSS Tailwind — controla aparência visual
        className="w-full max-w-sm min-w-0"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Tag HTML na interface
        <div className="flex justify-center mb-6 sm:mb-8">
          // Elemento/componente React na tela
          <LogoFull />
        // Tag HTML na interface
        </div>

        // Tag HTML na interface
        <div
          // Classes CSS Tailwind — controla aparência visual
          className={`bg-surface-card dark:bg-card border rounded-2xl p-4 sm:p-6 space-y-5 min-w-0 transition-colors duration-300 ${
            // Instrução do fluxo — parte da lógica de negócio ou interface
            isAdminMode
              // Instrução do fluxo — parte da lógica de negócio ou interface
              ? "border-amber-200 dark:border-amber-800/60"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              : "border-cgray-200 dark:border-cgray-800"
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          }`}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Elemento/componente React na tela
          <AnimatePresence mode="wait">{challenge ? null : header}</AnimatePresence>

          // Instrução do fluxo — parte da lógica de negócio ou interface
          {justReset && !challenge && (
            // Tag HTML na interface
            <div
              // Instrução do fluxo — parte da lógica de negócio ou interface
              role="status"
              // Classes CSS Tailwind — controla aparência visual
              className="rounded-xl px-4 py-3 text-sm bg-cgreen-50 dark:bg-cgreen-950/30 text-cgreen-800 dark:text-cgreen-200 border border-cgreen-200 dark:border-cgreen-800"
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Senha redefinida com sucesso. Entre com a nova senha.
            // Tag HTML na interface
            </div>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}

          // Instrução do fluxo — parte da lógica de negócio ou interface
          {challenge ? (
            // Elemento/componente React na tela
            <EmailOtpStep
              // Instrução do fluxo — parte da lógica de negócio ou interface
              challenge={challenge}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              submitting={submitting}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              error={error}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              onChangeChallenge={setChallenge}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              onCodeComplete={handleVerifyOtp}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              onBack={() => {
                // Instrução do fluxo — parte da lógica de negócio ou interface
                setChallenge(null);
                // Atualiza mensagem de erro exibida ao usuário
                setError("");
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              }}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            />
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ) : (
          // Tag HTML na interface
          <form onSubmit={handleLogin} className="space-y-4">
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {isAdminMode ? "E-mail admin" : "E-mail"}
              // Tag HTML na interface
              </label>
              // Tag HTML na interface
              <input
                // Campo de e-mail com validação do navegador
                type="email"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                value={email}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => {
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  setEmail(e.target.value);
                  // Atualiza mensagem de erro exibida ao usuário
                  setError("");
                  // Tenta executar — erros vão para catch
                  try {
                    // Remove espaços no início/fim do texto
                    sessionStorage.setItem("controlaai.lastEmail", e.target.value.trim().toLowerCase());
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  } catch {
                    /* ignore */
                  }
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                }}
                // Texto cinza de exemplo dentro do campo vazio
                placeholder={isAdminMode ? "admin@admin.com" : "seu@email.com"}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                required
                // Instrução do fluxo — parte da lógica de negócio ou interface
                autoComplete="email"
                // Classes CSS Tailwind — controla aparência visual
                className={`w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 ${inputFocusClass} focus:bg-white dark:focus:bg-card outline-none transition-colors`}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Senha
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
                  onChange={(e) => setPassword(e.target.value)}
                  // Texto cinza de exemplo dentro do campo vazio
                  placeholder="••••••"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  required
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  autoComplete="current-password"
                  // Classes CSS Tailwind — controla aparência visual
                  className={`w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-11 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 ${inputFocusClass} focus:bg-white dark:focus:bg-card outline-none transition-colors`}
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
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {!isAdminMode && (
                // Tag HTML na interface
                <div className="text-right">
                  // Elemento/componente React na tela
                  <Link
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    to={
                      // Remove espaços no início/fim do texto
                      email.trim()
                        // Remove espaços no início/fim do texto
                        ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        : "/forgot-password"
                    }
                    // Classes CSS Tailwind — controla aparência visual
                    className="text-xs text-cgreen-500 font-medium hover:text-cgreen-700"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  >
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Esqueceu a senha?
                  // Elemento/componente React na tela
                  </Link>
                // Tag HTML na interface
                </div>
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              )}
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
              className={`w-full h-11 rounded-xl text-white text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-60 ${
                // Instrução do fluxo — parte da lógica de negócio ou interface
                isAdminMode
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  ? "bg-amber-600 hover:bg-amber-700"
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  : "bg-cgreen-500 hover:bg-cgreen-700"
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              }`}
            // Instrução do fluxo — parte da lógica de negócio ou interface
            >
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {submitting ? "Entrando…" : isAdminMode ? "Entrar como administrador" : "Entrar"}
            // Tag HTML na interface
            </button>
          // Tag HTML na interface
          </form>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}

          // Instrução do fluxo — parte da lógica de negócio ou interface
          {!challenge && (
          // Elemento/componente React na tela
          <AnimatePresence mode="wait">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {isAdminMode ? (
              // Tag HTML na interface
              <motion.p
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key="admin-foot"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                initial={{ opacity: 0 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                animate={{ opacity: 1 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                exit={{ opacity: 0 }}
                // Classes CSS Tailwind — controla aparência visual
                className="text-center text-xs text-cgray-400"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Usuário comum? Altere o e-mail acima para acessar sua conta.
              // Tag HTML na interface
              </motion.p>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ) : (
              // Tag HTML na interface
              <motion.p
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key="user-foot"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                initial={{ opacity: 0 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                animate={{ opacity: 1 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                exit={{ opacity: 0 }}
                // Classes CSS Tailwind — controla aparência visual
                className="text-center text-sm text-cgray-400"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Não tem conta?{" "}
                // Elemento/componente React na tela
                <Link to="/register" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Criar conta
                // Elemento/componente React na tela
                </Link>
              // Tag HTML na interface
              </motion.p>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            )}
          // Elemento/componente React na tela
          </AnimatePresence>
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
