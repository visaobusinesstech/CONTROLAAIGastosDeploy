/**
 * Cadastro de novos usuários — aceite legal (LGPD) e depois formulário.
 * Sem e-mail/OTP no cadastro: grava no banco e emite JWT. OTP só em 2FA opt-in ou esqueci senha.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useState } from "react";
// Importa funções/componentes de react-router-dom
import { Link, Navigate } from "react-router-dom";
// Importa funções/componentes de @tanstack/react-query
import { useQueryClient } from "@tanstack/react-query";
// Importa funções/componentes de framer-motion
import { motion, AnimatePresence } from "framer-motion";
// Importa funções/componentes de lucide-react
import { Eye, EyeOff, Check, ArrowLeft } from "lucide-react";
// Importa funções/componentes de @/components/Logo
import { LogoFull } from "@/components/Logo";
// Importa funções/componentes de @/components/RegisterTermsAcceptance
import { RegisterTermsAcceptance } from "@/components/RegisterTermsAcceptance";
// Importa funções/componentes de @/lib/auth
import { useAuth } from "@/lib/auth";
// Importa funções/componentes de @/lib/api
import { registerRequest, ApiError, translateApiError, isAuthChallenge, type ConsentType } from "@/lib/api";
// Importa funções/componentes de @/lib/routes
import { getHomePathForUser } from "@/lib/routes";

// Declara função auxiliar interna
function formatPhone(v: string) {
  // Constante local
  const d = v.replace(/\D/g, "").slice(0, 11);
  // Condição — executa bloco só se verdadeira
  if (d.length <= 2) return d;
  // Condição — executa bloco só se verdadeira
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  // Retorna valor ou JSX para quem chamou
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Declara função auxiliar interna
function digitsOnly(v: string) {
  // Retorna valor ou JSX para quem chamou
  return v.replace(/\D/g, "");
}

// Define formato de dados (TypeScript)
type RegisterStep = "terms" | "form";

// Define formato de dados (TypeScript)
type AcceptedTerms = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  documentVersion: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  consents: ConsentType[];
};

// Exporta como padrão do módulo (import default)
export default function Register() {
  // Consulta à API com cache (React Query)
  const queryClient = useQueryClient();
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { setSession, token, user, loading } = useAuth();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [step, setStep] = useState<RegisterStep>("terms");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [acceptedTerms, setAcceptedTerms] = useState<AcceptedTerms | null>(null);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [name, setName] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [phone, setPhone] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [email, setEmail] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [password, setPassword] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [showPw, setShowPw] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [phoneValid, setPhoneValid] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [error, setError] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [submitting, setSubmitting] = useState(false);

  // Condição — executa bloco só se verdadeira
  if (!loading && token && user) {
    // Retorna valor ou JSX para quem chamou
    return <Navigate to={getHomePathForUser(user.email)} replace />;
  }

  // Constante local
  const handlePhoneChange = (v: string) => {
    // Constante local
    const formatted = formatPhone(v);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setPhone(formatted);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setPhoneValid(digitsOnly(formatted).length === 11);
  };

  // Constante local
  const handleTermsAccepted = (payload: AcceptedTerms) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setAcceptedTerms(payload);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setStep("form");
  };

  // Constante local
  const handleRegister = async (e: React.FormEvent) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    e.preventDefault();
    // Condição — executa bloco só se verdadeira
    if (!acceptedTerms) {
      // Atualiza mensagem de erro exibida ao usuário
      setError("Aceite os termos antes de criar a conta.");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setStep("terms");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (!phoneValid && digitsOnly(phone).length > 0) {
      // Atualiza mensagem de erro exibida ao usuário
      setError("Informe um número de WhatsApp válido com DDD");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (password.length < 6) {
      // Atualiza mensagem de erro exibida ao usuário
      setError("A senha deve ter pelo menos 6 caracteres");
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    // Constante local
    const payload = {
      // Remove espaços no início/fim do texto
      name: name.trim(),
      // Remove espaços no início/fim do texto
      email: email.trim().toLowerCase(),
      // Instrução do fluxo — parte da lógica de negócio ou interface
      password,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      phone: digitsOnly(phone) || undefined,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      documentVersion: acceptedTerms.documentVersion,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      consents: acceptedTerms.consents,
    };
    // Tenta executar — erros vão para catch
    try {
      // Variável mutável local
      let result;
      // Tenta executar — erros vão para catch
      try {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        result = await registerRequest(payload);
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch (firstErr) {
        // Constante local
        const phoneBlocked =
          // Instrução do fluxo — parte da lógica de negócio ou interface
          firstErr instanceof ApiError &&
          // Instrução do fluxo — parte da lógica de negócio ou interface
          (firstErr.message === "Phone already registered" || firstErr.message === "Phone already in use");
        // Condição — executa bloco só se verdadeira
        if (!phoneBlocked || !payload.phone) throw firstErr;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        result = await registerRequest({ ...payload, phone: undefined });
      }
      // Condição — executa bloco só se verdadeira
      if (isAuthChallenge(result)) {
        // Atualiza mensagem de erro exibida ao usuário
        setError("Resposta inesperada do servidor. Tente entrar com e-mail e senha.");
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setSession(result.token, result.user);
      // Gerencia cache de dados da API (React Query)
      queryClient.clear();
      // Instrução do fluxo — parte da lógica de negócio ou interface
      window.location.assign(getHomePathForUser(result.user.email));
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
              ? "Servidor da API offline. Configure BACKEND_URL no Vercel (URL pública do Railway) e redeploy."
              // Instrução do fluxo — parte da lógica de negócio ou interface
              : "API offline. Inicie o backend: cd backend && npm run dev",
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          );
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
            ? "Não foi possível conectar ao servidor. Verifique BACKEND_URL no Vercel."
            // Instrução do fluxo — parte da lógica de negócio ou interface
            : "Não foi possível criar a conta. Inicie o backend e tente novamente.",
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        );
      }
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } finally {
      // Liga/desliga indicador "carregando" no botão
      setSubmitting(false);
    }
  };

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-start bg-surface-page px-3 py-4 dark:bg-background sm:justify-center sm:px-4 sm:py-6 overflow-y-auto overflow-x-hidden">
      // Tag HTML na interface
      <motion.div
        // Instrução do fluxo — parte da lógica de negócio ou interface
        initial={{ opacity: 0, y: 16 }}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        animate={{ opacity: 1, y: 0 }}
        // Classes CSS Tailwind — controla aparência visual
        className="w-full max-w-md min-w-0"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Tag HTML na interface
        <div className="mb-4 flex justify-center sm:mb-6">
          // Elemento/componente React na tela
          <LogoFull />
        // Tag HTML na interface
        </div>

        // Tag HTML na interface
        <div className="space-y-4 rounded-2xl border border-cgray-200 bg-surface-card p-3 min-w-0 overflow-hidden dark:border-cgray-800 dark:bg-card sm:space-y-5 sm:p-5">
          // Elemento/componente React na tela
          <AnimatePresence mode="wait">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            {step === "terms" ? (
              // Tag HTML na interface
              <motion.div
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key="terms"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                initial={{ opacity: 0, x: -12 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                animate={{ opacity: 1, x: 0 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                exit={{ opacity: 0, x: 12 }}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Elemento/componente React na tela
                <RegisterTermsAcceptance onAccepted={handleTermsAccepted} />
                // Tag HTML na interface
                <p className="pt-3 text-center text-xs text-cgray-400 sm:pt-4 sm:text-sm">
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Já tem conta?{" "}
                  // Elemento/componente React na tela
                  <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Entrar
                  // Elemento/componente React na tela
                  </Link>
                // Tag HTML na interface
                </p>
              // Tag HTML na interface
              </motion.div>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ) : (
              // Tag HTML na interface
              <motion.div
                // Instrução do fluxo — parte da lógica de negócio ou interface
                key="form"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                initial={{ opacity: 0, x: 12 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                animate={{ opacity: 1, x: 0 }}
                // Instrução do fluxo — parte da lógica de negócio ou interface
                exit={{ opacity: 0, x: -12 }}
                // Classes CSS Tailwind — controla aparência visual
                className="space-y-5"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Tag HTML na interface
                <button
                  // Botão comum (não envia formulário)
                  type="button"
                  // Executa ação quando o usuário clica
                  onClick={() => setStep("terms")}
                  // Classes CSS Tailwind — controla aparência visual
                  className="flex items-center gap-1.5 text-xs text-cgray-400 hover:text-cgreen-500 transition-colors"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Elemento/componente React na tela
                  <ArrowLeft size={14} />
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Voltar aos termos
                // Tag HTML na interface
                </button>

                // Tag HTML na interface
                <div className="text-center">
                  // Tag HTML na interface
                  <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Criar sua conta</h1>
                  // Tag HTML na interface
                  <p className="text-sm text-cgray-400 mt-1">Termos aceitos — preencha seus dados</p>
                // Tag HTML na interface
                </div>

                // Tag HTML na interface
                <form onSubmit={handleRegister} className="space-y-4">
                  // Tag HTML na interface
                  <div>
                    // Tag HTML na interface
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      Nome
                    // Tag HTML na interface
                    </label>
                    // Tag HTML na interface
                    <input
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      type="text"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      value={name}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setName(e.target.value)}
                      // Texto cinza de exemplo dentro do campo vazio
                      placeholder="Seu nome"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      required
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      autoComplete="name"
                      // Classes CSS Tailwind — controla aparência visual
                      className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    />
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <div>
                    // Tag HTML na interface
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      E-mail
                    // Tag HTML na interface
                    </label>
                    // Tag HTML na interface
                    <input
                      // Campo de e-mail com validação do navegador
                      type="email"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      value={email}
                      // Atualiza estado quando o usuário digita/seleciona
                      onChange={(e) => setEmail(e.target.value)}
                      // Texto cinza de exemplo dentro do campo vazio
                      placeholder="seu@email.com"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      required
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      autoComplete="email"
                      // Classes CSS Tailwind — controla aparência visual
                      className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    />
                  // Tag HTML na interface
                  </div>
                  // Tag HTML na interface
                  <div>
                    // Tag HTML na interface
                    <label className="text-xs text-cgray-400 uppercase tracking-wider font-medium mb-1.5 block">
                      // Classes CSS Tailwind — controla aparência visual
                      WhatsApp <span className="normal-case text-cgray-400">(opcional)</span>
                    // Tag HTML na interface
                    </label>
                    // Tag HTML na interface
                    <div className="relative">
                      // Tag HTML na interface
                      <input
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        type="tel"
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        value={phone}
                        // Atualiza estado quando o usuário digita/seleciona
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        // Texto cinza de exemplo dentro do campo vazio
                        placeholder="(11) 99999-9999"
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        autoComplete="tel"
                        // Classes CSS Tailwind — controla aparência visual
                        className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-10 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      />
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      {phoneValid && (
                        // Elemento/componente React na tela
                        <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-cgreen-500" />
                      // Passo do algoritmo — executa parte da regra de negócio ou da interface
                      )}
                    // Tag HTML na interface
                    </div>
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
                        placeholder="Mínimo 6 caracteres"
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        required
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        minLength={6}
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        autoComplete="new-password"
                        // Classes CSS Tailwind — controla aparência visual
                        className="w-full h-11 bg-surface-inset dark:bg-muted border border-cgray-200 dark:border-cgray-800 rounded-xl px-4 pr-10 text-sm text-cgray-900 dark:text-foreground placeholder:text-cgray-400 focus:border-cgreen-500 focus:bg-white dark:focus:bg-card outline-none transition-colors"
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      />
                      // Tag HTML na interface
                      <button
                        // Botão comum (não envia formulário)
                        type="button"
                        // Executa ação quando o usuário clica
                        onClick={() => setShowPw((v) => !v)}
                        // Classes CSS Tailwind — controla aparência visual
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-cgray-400 hover:text-cgray-600"
                        // Texto acessível para leitores de tela
                        aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      >
                        // Instrução do fluxo — parte da lógica de negócio ou interface
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      // Tag HTML na interface
                      </button>
                    // Tag HTML na interface
                    </div>
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
                    {submitting ? "Criando…" : "Criar conta"}
                  // Tag HTML na interface
                  </button>
                // Tag HTML na interface
                </form>

                // Tag HTML na interface
                <p className="text-center text-sm text-cgray-400">
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Já tem conta?{" "}
                  // Elemento/componente React na tela
                  <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Entrar
                  // Elemento/componente React na tela
                  </Link>
                // Tag HTML na interface
                </p>
              // Tag HTML na interface
              </motion.div>
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            )}
          // Elemento/componente React na tela
          </AnimatePresence>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </motion.div>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
