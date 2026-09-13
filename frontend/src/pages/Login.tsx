/**
 * Tela de login — Controla.ai
 *
 * O que faz: formulário e-mail/senha, redirecionamento pós-auth, fluxo OTP quando
 * 2FA está habilitado (EmailOtpStep) e links para cadastro/esqueci senha.
 *
 * Onde entra: rota /login; usuários não autenticados são redirecionados aqui pelas
 * rotas protegidas (Layout, RequireAdmin).
 *
 * Integrações: auth.tsx (login), api/auth/login (Vercel) ou POST /auth/login;
 * toast/sonner para erros; navegação react-router-dom.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useMemo, useState } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Shield } from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { loginRequest, verifyTwoFactorRequest, ApiError, translateApiError, isAuthChallenge, type AuthChallengeResponse, type ApiUser } from "@/lib/api";
import { isAdminUser } from "@/lib/admin";
import { getPostLoginPath } from "@/lib/routes";
import { EmailOtpStep } from "@/components/EmailOtpStep";

export default function Login() {
  // Consulta à API com cache (React Query)
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { setSession, logout, token, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);
  const justReset = searchParams.get("reset") === "1";
  const isAdminMode = isAdminUser(email.trim());
  const redirectFrom = (location.state as { from?: string } | null)?.from;
  const inputFocusClass = isAdminMode
    ? "focus:border-amber-500"
    : "focus:border-cgreen-500";
  // Hooks SEMPRE antes de qualquer return (evita "Rendered fewer hooks than expected" no login)
  const header = useMemo(
    () =>
      isAdminMode ? (
        // Tag HTML na interface
        <motion.div
          key="admin-header"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          // Classes CSS Tailwind — controla aparência visual
          className="text-center"
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
      ) : (
        // Tag HTML na interface
        <motion.div
          key="user-header"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          // Classes CSS Tailwind — controla aparência visual
          className="text-center"
        >
          // Tag HTML na interface
          <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Entrar na sua conta</h1>
          // Tag HTML na interface
          <p className="text-sm text-cgray-400 mt-1">Acesse seu dashboard financeiro</p>
        // Tag HTML na interface
        </motion.div>
      ),
    [isAdminMode],
  );
  if (!loading && token && user) {
    return <Navigate to={getPostLoginPath(user.email, redirectFrom)} replace />;
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const result = await loginRequest({ email: trimmedEmail, password });
      if (isAuthChallenge(result)) {
        setChallenge(result);
        return;
      }
      finishSession(result.token, result.user);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          // Atualiza mensagem de erro exibida ao usuário
          setError(
            import.meta.env.PROD
              ? "Servidor da API offline. Configure BACKEND_URL no Vercel (URL pública do Railway)."
              : "API offline. Rode: cd backend && npm run dev (porta 3333).",
          );
        } else if (err.status === 503) {
          // Atualiza mensagem de erro exibida ao usuário
          setError("Banco de dados indisponível. Verifique DATABASE_URL no Railway.");
        } else {
          // Atualiza mensagem de erro exibida ao usuário
          setError(translateApiError(err.message));
        }
      } else {
        // Atualiza mensagem de erro exibida ao usuário
        setError(
          import.meta.env.PROD
            ? "Não foi possível conectar ao servidor."
            : "API offline. Rode: cd backend && npm run dev (porta 3333).",
        );
      }
    } finally {
      // Liga/desliga indicador "carregando" no botão
      setSubmitting(false);
    }
  };
  const finishSession = (t: string, loggedIn: ApiUser) => {
    const admin = isAdminUser(loggedIn.email);
    if (isAdminMode && !admin) {
      logout();
      // Atualiza mensagem de erro exibida ao usuário
      setError("Acesso negado. Somente a conta administrativa pode usar este modo.");
      setChallenge(null);
      return;
    }
    setSession(t, loggedIn);
    // Gerencia cache de dados da API (React Query)
    queryClient.clear();
    window.location.assign(getPostLoginPath(loggedIn.email, redirectFrom));
  };
  const handleVerifyOtp = async (code: string) => {
    if (!challenge || code.length !== 6) return;
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    try {
      const result = await verifyTwoFactorRequest({ challengeId: challenge.challengeId, code });
      if (!("token" in result)) {
        // Atualiza mensagem de erro exibida ao usuário
        setError("Código confirmado, mas o login não foi concluído. Tente entrar de novo.");
        return;
      }
      finishSession(result.token, result.user);
    } catch (err) {
      // Atualiza mensagem de erro exibida ao usuário
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível verificar o código.");
    } finally {
      // Liga/desliga indicador "carregando" no botão
      setSubmitting(false);
    }
  };
  return (
    // Tag HTML na interface
    <div className="min-h-[100dvh] min-h-screen bg-surface-page dark:bg-background flex flex-col items-center justify-center py-6 px-4 overflow-y-auto overflow-x-hidden">
      // Tag HTML na interface
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        // Classes CSS Tailwind — controla aparência visual
        className="w-full max-w-sm min-w-0"
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
            isAdminMode
              ? "border-amber-200 dark:border-amber-800/60"
              : "border-cgray-200 dark:border-cgray-800"
          }`}
        >
          // Elemento/componente React na tela
          <AnimatePresence mode="wait">{challenge ? null : header}</AnimatePresence>
          {justReset && !challenge && (
            // Tag HTML na interface
            <div
              role="status"
              // Classes CSS Tailwind — controla aparência visual
              className="rounded-xl px-4 py-3 text-sm bg-cgreen-50 dark:bg-cgreen-950/30 text-cgreen-800 dark:text-cgreen-200 border border-cgreen-200 dark:border-cgreen-800"
            >
              Senha redefinida com sucesso. Entre com a nova senha.
            // Tag HTML na interface
            </div>
          )}
          {challenge ? (
            // Elemento/componente React na tela
            <EmailOtpStep
              challenge={challenge}
              submitting={submitting}
              error={error}
              onChangeChallenge={setChallenge}
              onCodeComplete={handleVerifyOtp}
              onBack={() => {
                setChallenge(null);
                // Atualiza mensagem de erro exibida ao usuário
                setError("");
              }}
            />
          ) : (
          // Tag HTML na interface
          <form onSubmit={handleLogin} className="space-y-4">
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                {isAdminMode ? "E-mail admin" : "E-mail"}
              // Tag HTML na interface
              </label>
              // Tag HTML na interface
              <input
                // Campo de e-mail com validação do navegador
                type="email"
                value={email}
                // Atualiza estado quando o usuário digita/seleciona
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Atualiza mensagem de erro exibida ao usuário
                  setError("");
                  try {
                    // Remove espaços no início/fim do texto
                    sessionStorage.setItem("controlaai.lastEmail", e.target.value.trim().toLowerCase());
                  } catch {
                    /* ignore */
                  }
                }}
                // Texto cinza de exemplo dentro do campo vazio
                placeholder={isAdminMode ? "admin@admin.com" : "seu@email.com"}
                required
                autoComplete="email"
                // Classes CSS Tailwind — controla aparência visual
                className={`w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 ${inputFocusClass} focus:bg-white dark:focus:bg-card outline-none transition-colors`}
              />
            // Tag HTML na interface
            </div>
            // Tag HTML na interface
            <div>
              // Tag HTML na interface
              <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                Senha
              // Tag HTML na interface
              </label>
              // Tag HTML na interface
              <div className="relative">
                // Tag HTML na interface
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  // Atualiza estado quando o usuário digita/seleciona
                  onChange={(e) => setPassword(e.target.value)}
                  // Texto cinza de exemplo dentro do campo vazio
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
                  // Classes CSS Tailwind — controla aparência visual
                  className={`w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-11 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 ${inputFocusClass} focus:bg-white dark:focus:bg-card outline-none transition-colors`}
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
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                // Tag HTML na interface
                </button>
              // Tag HTML na interface
              </div>
              {!isAdminMode && (
                // Tag HTML na interface
                <div className="text-right">
                  // Elemento/componente React na tela
                  <Link
                    to={
                      // Remove espaços no início/fim do texto
                      email.trim()
                        // Remove espaços no início/fim do texto
                        ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                        : "/forgot-password"
                    }
                    // Classes CSS Tailwind — controla aparência visual
                    className="text-xs text-cgreen-500 font-medium hover:text-cgreen-700"
                  >
                    Esqueceu a senha?
                  // Elemento/componente React na tela
                  </Link>
                // Tag HTML na interface
                </div>
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
                isAdminMode
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-cgreen-500 hover:bg-cgreen-700"
              }`}
            >
              {submitting ? "Entrando…" : isAdminMode ? "Entrar como administrador" : "Entrar"}
            // Tag HTML na interface
            </button>
          // Tag HTML na interface
          </form>
          )}
          {!challenge && (
          // Elemento/componente React na tela
          <AnimatePresence mode="wait">
            {isAdminMode ? (
              // Tag HTML na interface
              <motion.p
                key="admin-foot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Classes CSS Tailwind — controla aparência visual
                className="text-center text-xs text-cgray-400"
              >
                Usuário comum? Altere o e-mail acima para acessar sua conta.
              // Tag HTML na interface
              </motion.p>
            ) : (
              // Tag HTML na interface
              <motion.p
                key="user-foot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Classes CSS Tailwind — controla aparência visual
                className="text-center text-sm text-cgray-400"
              >
                Não tem conta?{" "}
                // Elemento/componente React na tela
                <Link to="/register" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                  Criar conta
                // Elemento/componente React na tela
                </Link>
              // Tag HTML na interface
              </motion.p>
            )}
          // Elemento/componente React na tela
          </AnimatePresence>
          )}
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </motion.div>
    // Tag HTML na interface
    </div>
  );
}
