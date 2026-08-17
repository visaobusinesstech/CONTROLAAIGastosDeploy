/**
 * Página de nova senha — mesmo padrão visual do login.
 * O token vem do e-mail; a senha nova grava em users.password_hash.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { ApiError, resetPasswordRequest, translateApiError } from "@/lib/api";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await resetPasswordRequest({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível redefinir a senha.");
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
          <div className="text-center">
            <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Nova senha</h1>
            <p className="text-sm text-cgray-400 mt-1">Escolha uma senha de pelo menos 6 caracteres.</p>
          </div>

          {!token ? (
            <p className="text-sm text-cred-main text-center">
              Link inválido. Solicite um novo em{" "}
              <Link to="/forgot-password" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                esqueci a senha
              </Link>
              .
            </p>
          ) : done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-cgray-600 dark:text-muted-foreground">
                Senha salva no banco. Entre de novo com a nova senha.
              </p>
              <Link
                to="/login"
                className="block w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium leading-[44px] hover:bg-cgreen-700"
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="••••••"
                    required
                    minLength={6}
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
              <div>
                <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                  Confirmar senha
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError("");
                  }}
                  placeholder="••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                />
              </div>
              {error && <p className="text-xs text-cred-main">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium hover:bg-cgreen-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {submitting ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          )}

          {!done && (
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
