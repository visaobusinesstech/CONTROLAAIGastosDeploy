/**
 * Login unificado — usuários comuns e admin na mesma rota (/login).
 * Ao digitar admin@admin.com, a UI muda para o modo administrativo.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
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
  const queryClient = useQueryClient();
  const location = useLocation();
  const { setSession, logout, token, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);

  const isAdminMode = isAdminUser(email.trim());
  const redirectFrom = (location.state as { from?: string } | null)?.from;

  if (!loading && token && user) {
    return <Navigate to={getPostLoginPath(user.email, redirectFrom)} replace />;
  }

  const inputFocusClass = isAdminMode
    ? "focus:border-amber-500"
    : "focus:border-cgreen-500";

  const header = useMemo(
    () =>
      isAdminMode ? (
        <motion.div
          key="admin-header"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/25">
            <Shield className="text-amber-700 dark:text-amber-400" size={22} />
          </div>
          <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Área administrativa</h1>
          <p className="text-sm text-cgray-400 mt-1">WhatsApp, logs IA e recursos premium</p>
        </motion.div>
      ) : (
        <motion.div
          key="user-header"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          className="text-center"
        >
          <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Entrar na sua conta</h1>
          <p className="text-sm text-cgray-400 mt-1">Acesse seu dashboard financeiro</p>
        </motion.div>
      ),
    [isAdminMode],
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
          setError(
            import.meta.env.PROD
              ? "Servidor da API offline. Configure VITE_API_URL no Vercel."
              : "API offline. Rode: cd backend && npm run dev (porta 3333).",
          );
        } else if (err.status === 503) {
          setError("Banco de dados indisponível. Verifique DATABASE_URL no Railway.");
        } else {
          setError(translateApiError(err.message));
        }
      } else {
        setError(
          import.meta.env.PROD
            ? "Não foi possível conectar ao servidor."
            : "API offline. Rode: cd backend && npm run dev (porta 3333).",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const finishSession = (t: string, loggedIn: ApiUser) => {
    const admin = isAdminUser(loggedIn.email);
    if (isAdminMode && !admin) {
      logout();
      setError("Acesso negado. Somente a conta administrativa pode usar este modo.");
      setChallenge(null);
      return;
    }
    setSession(t, loggedIn);
    queryClient.clear();
    window.location.assign(getPostLoginPath(loggedIn.email, redirectFrom));
  };

  const handleVerifyOtp = async (code: string) => {
    if (!challenge || code.length !== 6) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await verifyTwoFactorRequest({ challengeId: challenge.challengeId, code });
      if (!("token" in result)) {
        setError("Código confirmado, mas o login não foi concluído. Tente entrar de novo.");
        return;
      }
      finishSession(result.token, result.user);
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível verificar o código.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] min-h-screen bg-surface-page dark:bg-background flex flex-col items-center justify-center py-6 px-4 overflow-y-auto overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm min-w-0"
      >
        <div className="flex justify-center mb-6 sm:mb-8">
          <LogoFull />
        </div>

        <div
          className={`bg-surface-card dark:bg-card border rounded-2xl p-4 sm:p-6 space-y-5 min-w-0 transition-colors duration-300 ${
            isAdminMode
              ? "border-amber-200 dark:border-amber-800/60"
              : "border-cgray-200 dark:border-cgray-800"
          }`}
        >
          <AnimatePresence mode="wait">{challenge ? null : header}</AnimatePresence>

          {challenge ? (
            <EmailOtpStep
              challenge={challenge}
              submitting={submitting}
              error={error}
              onChangeChallenge={setChallenge}
              onCodeComplete={handleVerifyOtp}
              onBack={() => {
                setChallenge(null);
                setError("");
              }}
            />
          ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                {isAdminMode ? "E-mail admin" : "E-mail"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  try {
                    sessionStorage.setItem("controlaai.lastEmail", e.target.value.trim().toLowerCase());
                  } catch {
                    /* ignore */
                  }
                }}
                placeholder={isAdminMode ? "admin@admin.com" : "seu@email.com"}
                required
                autoComplete="email"
                className={`w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 ${inputFocusClass} focus:bg-white dark:focus:bg-card outline-none transition-colors`}
              />
            </div>
            <div>
              <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
                  className={`w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-11 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 ${inputFocusClass} focus:bg-white dark:focus:bg-card outline-none transition-colors`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cgray-400"
                  aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isAdminMode && (
                <div className="text-right">
                  <Link
                    to={
                      email.trim()
                        ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
                        : "/forgot-password"
                    }
                    className="text-xs text-cgreen-500 font-medium hover:text-cgreen-700"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-cred-main">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full h-11 rounded-xl text-white text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-60 ${
                isAdminMode
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-cgreen-500 hover:bg-cgreen-700"
              }`}
            >
              {submitting ? "Entrando…" : isAdminMode ? "Entrar como administrador" : "Entrar"}
            </button>
          </form>
          )}

          {!challenge && (
          <AnimatePresence mode="wait">
            {isAdminMode ? (
              <motion.p
                key="admin-foot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-xs text-cgray-400"
              >
                Usuário comum? Altere o e-mail acima para acessar sua conta.
              </motion.p>
            ) : (
              <motion.p
                key="user-foot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-cgray-400"
              >
                Não tem conta?{" "}
                <Link to="/register" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                  Criar conta
                </Link>
              </motion.p>
            )}
          </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}
