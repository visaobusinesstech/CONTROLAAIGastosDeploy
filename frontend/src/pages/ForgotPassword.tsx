/**
 * Pedido de recuperação de senha — e-mail com link (sem OTP).
 *
 * Papel no sistema: Página React Router — UI autenticada consumindo api.ts e auth.tsx.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LogoFull } from "@/components/Logo";
import { ApiError, forgotPasswordRequest, translateApiError } from "@/lib/api";

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
  const [params] = useSearchParams();
  const [email, setEmail] = useState(() => initialEmail(params.get("email")));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailFailed(false);
    setSubmitting(true);
    try {
      const normalized = email.trim().toLowerCase();
      try {
        sessionStorage.setItem("controlaai.lastEmail", normalized);
      } catch {
        /* ignore */
      }
      const res = await forgotPasswordRequest(normalized);
      if ("emailSent" in res && res.emailSent === false) {
        setEmailFailed(true);
        setSent(true);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível enviar o e-mail.");
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
          {sent ? (
            <div className="space-y-4">
              <div
                role="status"
                className={`rounded-xl px-4 py-3 text-sm ${
                  emailFailed
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                    : "bg-cgreen-50 dark:bg-cgreen-950/30 text-cgreen-800 dark:text-cgreen-200 border border-cgreen-200 dark:border-cgreen-800"
                }`}
              >
                {emailFailed ? (
                  <>
                    Não conseguimos enviar o e-mail agora. Tente de novo em instantes ou confira se o endereço está
                    correto.
                  </>
                ) : (
                  <>
                    <strong className="font-semibold">Confira sua caixa de entrada</strong>
                    <span className="block mt-1">
                      O e-mail de redefinição de senha do Controla.ai chegou (ou chegará em poucos segundos). Abra o
                      botão do e-mail para escolher a nova senha. Verifique também o Spam.
                    </span>
                  </>
                )}
              </div>
              <div className="text-center">
                <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Verifique seu e-mail</h1>
                <p className="text-sm text-cgray-400 mt-1">
                  Se existir uma conta com <span className="text-cgray-600 dark:text-foreground">{email.trim()}</span>,
                  enviamos o link de redefinição.
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium text-center leading-[44px] hover:bg-cgreen-700"
              >
                Voltar ao login
              </Link>
              {emailFailed && (
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmailFailed(false);
                  }}
                  className="w-full text-sm text-cgreen-500 font-medium"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Esqueceu a senha?</h1>
                <p className="text-sm text-cgray-400 mt-1">
                  Enviaremos um e-mail com um botão para abrir a página de nova senha no Controla.ai.
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
                  {submitting ? "Enviando…" : "Enviar link de redefinição"}
                </button>
              </form>
            </>
          )}
          <p className="text-center text-sm text-cgray-400">
            Lembrou a senha?{" "}
            <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
              Entrar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
