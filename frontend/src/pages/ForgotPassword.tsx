/**
 * Pedido de recuperação de senha — e-mail com link (sem OTP).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useState } from "react";
// Importa funções/componentes de react-router-dom
import { Link, useSearchParams } from "react-router-dom";
// Importa funções/componentes de framer-motion
import { motion } from "framer-motion";
// Importa funções/componentes de @/components/Logo
import { LogoFull } from "@/components/Logo";
// Importa funções/componentes de @/lib/api
import { ApiError, forgotPasswordRequest, translateApiError } from "@/lib/api";

/** E-mail já digitado no login/cadastro (query ou sessionStorage). */
// Declara função auxiliar interna
function initialEmail(query: string | null): string {
  // Constante local
  const fromQuery = query?.trim() ?? "";
  // Condição — executa bloco só se verdadeira
  if (fromQuery) return fromQuery;
  // Tenta executar — erros vão para catch
  try {
    // Retorna valor ou JSX para quem chamou
    return sessionStorage.getItem("controlaai.lastEmail")?.trim() ?? "";
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch {
    // Retorna valor ou JSX para quem chamou
    return "";
  }
}

// Exporta como padrão do módulo (import default)
export default function ForgotPassword() {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [params] = useSearchParams();
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [email, setEmail] = useState(() => initialEmail(params.get("email")));
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [submitting, setSubmitting] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [error, setError] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [sent, setSent] = useState(false);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [emailFailed, setEmailFailed] = useState(false);

  // Constante local
  const handleSubmit = async (e: React.FormEvent) => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    e.preventDefault();
    // Atualiza mensagem de erro exibida ao usuário
    setError("");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setEmailFailed(false);
    // Liga/desliga indicador "carregando" no botão
    setSubmitting(true);
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const normalized = email.trim().toLowerCase();
      // Tenta executar — erros vão para catch
      try {
        // Armazena dado temporário na sessão do navegador
        sessionStorage.setItem("controlaai.lastEmail", normalized);
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch {
        /* ignore */
      }
      // Constante local
      const res = await forgotPasswordRequest(normalized);
      // Condição — executa bloco só se verdadeira
      if ("emailSent" in res && res.emailSent === false) {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setEmailFailed(true);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        setSent(true);
        // Instrução do fluxo — parte da lógica de negócio ou interface
        return;
      }
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setSent(true);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (err) {
      // Atualiza mensagem de erro exibida ao usuário
      setError(err instanceof ApiError ? translateApiError(err.message) : "Não foi possível enviar o e-mail.");
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm min-w-0">
        // Tag HTML na interface
        <div className="flex justify-center mb-6 sm:mb-8">
          // Elemento/componente React na tela
          <LogoFull />
        // Tag HTML na interface
        </div>
        // Tag HTML na interface
        <div className="bg-surface-card dark:bg-card border border-cgray-200 dark:border-cgray-800 rounded-2xl p-4 sm:p-6 space-y-5 min-w-0">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {sent ? (
            // Tag HTML na interface
            <div className="space-y-4">
              // Tag HTML na interface
              <div
                // Instrução do fluxo — parte da lógica de negócio ou interface
                role="status"
                // Classes CSS Tailwind — controla aparência visual
                className={`rounded-xl px-4 py-3 text-sm ${
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  emailFailed
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    : "bg-cgreen-50 dark:bg-cgreen-950/30 text-cgreen-800 dark:text-cgreen-200 border border-cgreen-200 dark:border-cgreen-800"
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                }`}
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                {emailFailed ? (
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  <>
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    Não conseguimos enviar o e-mail agora. Tente de novo em instantes ou confira se o endereço está
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    correto.
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  </>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                ) : (
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  <>
                    // Tag HTML na interface
                    <strong className="font-semibold">Confira sua caixa de entrada</strong>
                    // Tag HTML na interface
                    <span className="block mt-1">
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      O e-mail de redefinição de senha do Controla.ai chegou (ou chegará em poucos segundos). Abra o
                      // Instrução do fluxo — parte da lógica de negócio ou interface
                      botão do e-mail para escolher a nova senha. Verifique também o Spam.
                    // Tag HTML na interface
                    </span>
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  </>
                // Passo do algoritmo — executa parte da regra de negócio ou da interface
                )}
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <div className="text-center">
                // Tag HTML na interface
                <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Verifique seu e-mail</h1>
                // Tag HTML na interface
                <p className="text-sm text-cgray-400 mt-1">
                  // Remove espaços no início/fim do texto
                  Se existir uma conta com <span className="text-cgray-600 dark:text-foreground">{email.trim()}</span>,
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  enviamos o link de redefinição.
                // Tag HTML na interface
                </p>
              // Tag HTML na interface
              </div>
              // Elemento/componente React na tela
              <Link
                // Instrução do fluxo — parte da lógica de negócio ou interface
                to="/login"
                // Classes CSS Tailwind — controla aparência visual
                className="block w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium text-center leading-[44px] hover:bg-cgreen-700"
              // Instrução do fluxo — parte da lógica de negócio ou interface
              >
                // Instrução do fluxo — parte da lógica de negócio ou interface
                Voltar ao login
              // Elemento/componente React na tela
              </Link>
              // Instrução do fluxo — parte da lógica de negócio ou interface
              {emailFailed && (
                // Tag HTML na interface
                <button
                  // Botão comum (não envia formulário)
                  type="button"
                  // Executa ação quando o usuário clica
                  onClick={() => {
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    setSent(false);
                    // Instrução do fluxo — parte da lógica de negócio ou interface
                    setEmailFailed(false);
                  // Passo do algoritmo — executa parte da regra de negócio ou da interface
                  }}
                  // Classes CSS Tailwind — controla aparência visual
                  className="w-full text-sm text-cgreen-500 font-medium"
                // Instrução do fluxo — parte da lógica de negócio ou interface
                >
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Tentar novamente
                // Tag HTML na interface
                </button>
              // Passo do algoritmo — executa parte da regra de negócio ou da interface
              )}
            // Tag HTML na interface
            </div>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          ) : (
            // Instrução do fluxo — parte da lógica de negócio ou interface
            <>
              // Tag HTML na interface
              <div className="text-center">
                // Tag HTML na interface
                <h1 className="text-xl font-medium text-cgray-900 dark:text-foreground">Esqueceu a senha?</h1>
                // Tag HTML na interface
                <p className="text-sm text-cgray-400 mt-1">
                  // Instrução do fluxo — parte da lógica de negócio ou interface
                  Enviaremos um e-mail com um botão para abrir a página de nova senha no Controla.ai.
                // Tag HTML na interface
                </p>
              // Tag HTML na interface
              </div>
              // Tag HTML na interface
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  {submitting ? "Enviando…" : "Enviar link de redefinição"}
                // Tag HTML na interface
                </button>
              // Tag HTML na interface
              </form>
            // Instrução do fluxo — parte da lógica de negócio ou interface
            </>
          // Passo do algoritmo — executa parte da regra de negócio ou da interface
          )}

          // Tag HTML na interface
          <p className="text-center text-sm text-cgray-400">
            // Instrução do fluxo — parte da lógica de negócio ou interface
            Lembrou a senha?{" "}
            // Elemento/componente React na tela
            <Link to="/login" className="text-cgreen-500 font-medium hover:text-cgreen-700">
              // Instrução do fluxo — parte da lógica de negócio ou interface
              Entrar
            // Elemento/componente React na tela
            </Link>
          // Tag HTML na interface
          </p>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </motion.div>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
