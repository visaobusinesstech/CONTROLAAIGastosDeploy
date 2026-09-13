/**
 * Cadastro de novos usuários — aceite legal (LGPD) e depois formulário.
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
import { Link, Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Check, ArrowLeft } from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { RegisterTermsAcceptance } from "@/components/RegisterTermsAcceptance";
import { useAuth } from "@/lib/auth";
import { registerRequest, ApiError, translateApiError, isAuthChallenge, type ConsentType } from "@/lib/api";
import { getHomePathForUser } from "@/lib/routes";

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
  // Consulta à API com cache (React Query)
  const queryClient = useQueryClient();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
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
      // Atualiza mensagem de erro exibida ao usuário
      setError("Aceite os termos antes de criar a conta.");
      setStep("terms");
      return;
    }
    if (!phoneValid && digitsOnly(phone).length > 0) {
      // Atualiza mensagem de erro exibida ao usuário
      setError("Informe um número de WhatsApp válido com DDD");
      return;
    }
    if (password.length < 6) {
      // Atualiza mensagem de erro exibida ao usuário
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    const payload = {
      // Remove espaços no início/fim do texto
      name: name.trim(),
      // Remove espaços no início/fim do texto
      email: email.trim().toLowerCase(),
      password,
      phone: digitsOnly(phone) || undefined,
      documentVersion: acceptedTerms.documentVersion,
      consents: acceptedTerms.consents,
    };
    try {
      let result;
      try {
        result = await registerRequest(payload);
      } catch (firstErr) {
        const phoneBlocked =
          firstErr instanceof ApiError &&
          (firstErr.message === "Phone already registered" || firstErr.message === "Phone already in use");
        if (!phoneBlocked || !payload.phone) throw firstErr;
        result = await registerRequest({ ...payload, phone: undefined });
      }
      if (isAuthChallenge(result)) {
        // Atualiza mensagem de erro exibida ao usuário
        setError("Resposta inesperada do servidor. Tente entrar com e-mail e senha.");
        return;
      }
      setSession(result.token, result.user);
      // Gerencia cache de dados da API (React Query)
      queryClient.clear();
      window.location.assign(getHomePathForUser(result.user.email));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 0) {
          // Atualiza mensagem de erro exibida ao usuário
          setError(
            import.meta.env.PROD
              ? "Servidor da API offline. Configure BACKEND_URL no Vercel (URL pública do Railway) e redeploy."
              : "API offline. Inicie o backend: cd backend && npm run dev",
          );
        } else {
          // Atualiza mensagem de erro exibida ao usuário
          setError(translateApiError(err.message));
        }
      } else {
        // Atualiza mensagem de erro exibida ao usuário
        setError(
          import.meta.env.PROD
            ? "Não foi possível conectar ao servidor. Verifique BACKEND_URL no Vercel."
            : "Não foi possível criar a conta. Inicie o backend e tente novamente.",
        );
      }
    } finally {
      // Liga/desliga indicador "carregando" no botão
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
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-5"
              >
                <button
                  // Botão comum (não envia formulário)
                  type="button"
                  // Executa ação quando o usuário clica
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
                      Nome
                    </label>
                    <input
                      type="text"
                      value={name}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setName(e.target.value)}
                      // Texto cinza de exemplo dentro do campo vazio
                      placeholder="Seu nome"
                      required
                      autoComplete="name"
                      className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      E-mail
                    </label>
                    <input
                      // Campo de e-mail com validação do navegador
                      type="email"
                      value={email}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setEmail(e.target.value)}
                      // Texto cinza de exemplo dentro do campo vazio
                      placeholder="seu@email.com"
                      required
                      autoComplete="email"
                      className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      WhatsApp <span className="normal-case text-cgray-400">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        // Atualiza estado quando o usuário digita/seleciona
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        // Texto cinza de exemplo dentro do campo vazio
                        placeholder="(11) 99999-9999"
                        autoComplete="tel"
                        className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-10 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                      />
                      {phoneValid && (
                        <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-cgreen-500" />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        // Atualiza estado quando o usuário digita/seleciona
                        onChange={(e) => setPassword(e.target.value)}
                        // Texto cinza de exemplo dentro do campo vazio
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-10 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                      />
                      <button
                        // Botão comum (não envia formulário)
                        type="button"
                        // Executa ação quando o usuário clica
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cgray-400 hover:text-cgray-600"
                        // Texto acessível para leitores de tela
                        aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {error && <p className="text-xs text-cred-main">{error}</p>}
                  <button
                    // Botão que envia o formulário
                    type="submit"
                    // Desabilita botão/campo (ex.: durante envio)
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
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
