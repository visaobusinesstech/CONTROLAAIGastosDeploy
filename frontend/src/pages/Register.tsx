/**
 * Cadastro de novos usuários — aceite legal (LGPD) e depois formulário.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Check, ArrowLeft } from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { RegisterTermsAcceptance } from "@/components/RegisterTermsAcceptance";
import { useAuth } from "@/lib/auth";
import { registerRequest, verifyTwoFactorRequest, ApiError, translateApiError, isAuthChallenge, type AuthChallengeResponse, type ConsentType } from "@/lib/api";
import { getHomePathForUser } from "@/lib/routes";
import { EmailOtpStep } from "@/components/EmailOtpStep";

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

type RegisterStep = "terms" | "form";

type AcceptedTerms = {
  documentVersion: string;
  consents: ConsentType[];
};

export default function Register() {
  const queryClient = useQueryClient();
  const { setSession, token, user, loading } = useAuth();
  const [step, setStep] = useState<RegisterStep>("terms");
  const [acceptedTerms, setAcceptedTerms] = useState<AcceptedTerms | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [challenge, setChallenge] = useState<AuthChallengeResponse | null>(null);

  if (!loading && token && user) {
    return <Navigate to={getHomePathForUser(user.email)} replace />;
  }

  const handlePhoneChange = (v: string) => {
    const formatted = formatPhone(v);
    setPhone(formatted);
    setPhoneValid(digitsOnly(formatted).length === 11);
  };

  const handleTermsAccepted = (payload: AcceptedTerms) => {
    setAcceptedTerms(payload);
    setStep("form");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("Aceite os termos antes de criar a conta.");
      setStep("terms");
      return;
    }
    if (!phoneValid) {
      setError("Informe um número de WhatsApp válido com DDD");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const result = await registerRequest({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: digitsOnly(phone),
        documentVersion: acceptedTerms.documentVersion,
        consents: acceptedTerms.consents,
      });
      if (isAuthChallenge(result)) {
        setChallenge(result);
        return;
      }
      setSession(result.token, result.user);
      queryClient.clear();
      window.location.assign(getHomePathForUser(result.user.email));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          setError(
            import.meta.env.PROD
              ? "Servidor da API offline. Configure VITE_API_URL no Vercel (URL do Railway) e redeploy."
              : "API offline. Inicie o backend: cd backend && npm run dev",
          );
        } else {
          setError(translateApiError(err.message));
        }
      } else {
        setError(
          import.meta.env.PROD
            ? "Não foi possível conectar ao servidor. Verifique VITE_API_URL no Vercel."
            : "Não foi possível criar a conta. Inicie o backend e tente novamente.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!challenge || code.length !== 6) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await verifyTwoFactorRequest({ challengeId: challenge.challengeId, code });
      if (!("token" in result)) {
        setError("Código confirmado, mas o cadastro não foi concluído. Tente entrar.");
        return;
      }
      setSession(result.token, result.user);
      queryClient.clear();
      window.location.assign(getHomePathForUser(result.user.email));
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível verificar o código.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-start bg-surface-page px-3 py-4 dark:bg-background sm:justify-center sm:px-4 sm:py-6 overflow-y-auto overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md min-w-0"
      >
        <div className="mb-4 flex justify-center sm:mb-6">
          <LogoFull />
        </div>

        <div className="space-y-4 rounded-2xl border border-cgray-200 bg-surface-card p-3 min-w-0 overflow-hidden dark:border-cgray-800 dark:bg-card sm:space-y-5 sm:p-5">
          <AnimatePresence mode="wait">
            {step === "terms" ? (
              <motion.div
                key="terms"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <RegisterTermsAcceptance onAccepted={handleTermsAccepted} />
                <p className="pt-3 text-center text-xs text-cgray-400 sm:pt-4 sm:text-sm">
                  Já tem conta?{" "}
                  <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                    Entrar
                  </Link>
                </p>
              </motion.div>
            ) : challenge ? (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
              >
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
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >
                <button
                  type="button"
                  onClick={() => setStep("terms")}
                  className="flex items-center gap-1.5 text-xs text-cgray-400 hover:text-cgreen-500 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Voltar aos termos
                </button>

                <div className="text-center">
                  <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Criar sua conta</h1>
                  <p className="text-sm text-cgray-400 mt-1">Termos aceitos — preencha seus dados</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="João da Silva"
                      required
                      autoComplete="name"
                      className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      WhatsApp
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(11) 99999-0000"
                        required
                        autoComplete="tel"
                        className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-11 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                      />
                      {phoneValid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-cgreen-500 flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    {phone && !phoneValid && (
                      <p className="text-xs text-camber-main mt-1">Informe o DDD + 9 dígitos</p>
                    )}
                  </div>

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

                  <div>
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        autoComplete="new-password"
                        className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-11 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
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
                  </div>

                  {error && <p className="text-xs text-cred-main">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium hover:bg-cgreen-700 active:scale-[0.98] transition-all disabled:opacity-60"
                  >
                    {submitting ? "Criando…" : "Criar conta"}
                  </button>
                </form>

                <p className="text-center text-sm text-cgray-400">
                  Já tem conta?{" "}
                  <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                    Entrar
                  </Link>
                  {" · "}
                  <Link to="/forgot-password" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                    Esqueceu a senha?
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
