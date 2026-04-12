import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { loginRequest, ApiError } from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const { setSession, token, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && token) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { token: t, user } = await loginRequest({ email: email.trim(), password });
      setSession(t, user);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Não foi possível conectar. Verifique se a API está no ar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page dark:bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex justify-center mb-8">
          <LogoFull />
        </div>

        <div className="bg-surface-card dark:bg-card border border-cgray-200 dark:border-cgray-800 rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Entrar na sua conta</h1>
            <p className="text-sm text-cgray-400 mt-1">Acesse seu dashboard financeiro</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="••••••"
                  required
                  autoComplete="current-password"
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
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <p className="text-center text-sm text-cgray-400">
            Não tem conta?{" "}
            <Link to="/register" className="text-cgreen-500 font-medium hover:text-cgreen-700">
              Criar conta
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
