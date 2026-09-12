/**
 * Pedido de recuperação de senha — verificação em 2 etapas (OTP) e depois nova senha.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoFull } from "@/components/Logo";
import { EmailOtpStep } from "@/components/EmailOtpStep";
import {
  ApiError,
  forgotPasswordRequest,
  isAuthChallenge,
  translateApiError,
  verifyTwoFactorRequest,
  type AuthChallengeResponse,
} from "@/lib/api";

/** E-mail já digitado no login/cadastro (query ou sessionStorage). */
function initialEmail(query: string | null): string {
  const fromQuery = query?.trim() ?? "";
  if (fromQuery) return fromQuery;
  try {
    return sessionStorage.getItem("controlaai.lastEmail")?.trim() ?? "";
  } catch {
    return "";
  }
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(() => initialEmail(params.get("email")));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const normalized = email.trim().toLowerCase();
      try {
        sessionStorage.setItem("controlaai.lastEmail", normalized);
      } catch {
        /* ignore */
      }
      const res = await forgotPasswordRequest(normalized);
      if (isAuthChallenge(res)) {
        setChallenge(res);
        return;
      }
      // Conta inexistente: resposta genérica sem revelar
      setError("");
      setChallenge(null);
      alertFallbackOk();
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível enviar o código.");
    } finally {
      setSubmitting(false);
    }
  };

  const [genericSent, setGenericSent] = useState(false);
  function alertFallbackOk() {
    setGenericSent(true);
  }

  const handleVerifyOtp = async (code: string) => {
    if (!challenge || code.length !== 6) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await verifyTwoFactorRequest({ challengeId: challenge.challengeId, code });
      if ("resetToken" in result && typeof result.resetToken === "string") {
        navigate(`/reset-password?token=${encodeURIComponent(result.resetToken)}`, { replace: true });
        return;
      }
      setError("Código ok, mas não foi possível liberar a nova senha. Tente de novo.");
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(err.message) : "Código inválido.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] min-h-screen bg-surface-page dark:bg-background flex flex-col items-center justify-center py-6 px-4 overflow-y-auto overflow-x-hidden">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm min-w-0">
        <div className="flex justify-center mb-6 sm:mb-8">
          <LogoFull />
        </div>
        <div className="bg-surface-card dark:bg-card border border-cgray-200 dark:border-cgray-800 rounded-2xl p-4 sm:p-6 space-y-5 min-w-0">
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
          ) : genericSent ? (
            <div className="space-y-4">
              <div className="text-center">
                <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Verifique seu e-mail</h1>
                <p className="text-sm text-cgray-400 mt-1">
                  Se existir uma conta com esse e-mail, enviamos um código de verificação.
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium text-center leading-[44px] hover:bg-cgreen-700"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Esqueceu a senha?</h1>
                <p className="text-sm text-cgray-400 mt-1">
                  Enviaremos um código de 6 dígitos por e-mail (verificação em 2 etapas) antes de liberar a nova senha.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                  />
                </div>
                {error && <p className="text-xs text-cred-main">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium hover:bg-cgreen-700 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {submitting ? "Enviando…" : "Enviar código"}
                </button>
              </form>
            </>
          )}

          {!challenge && (
            <p className="text-center text-sm text-cgray-400">
              Lembrou a senha?{" "}
              <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                Entrar
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
