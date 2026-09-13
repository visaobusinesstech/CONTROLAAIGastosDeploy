/**
 * Etapa de código OTP enviado por e-mail (cadastro, login 2FA, ligar/desligar).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de react
import { useEffect, useState } from "react";
// Importa funções/componentes de @/components/ui/input-otp
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
// Importa funções/componentes de @/lib/api
import { resendTwoFactorRequest, type AuthChallengeResponse } from "@/lib/api";

// Define formato de dados (TypeScript)
type Props = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  challenge: AuthChallengeResponse;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  submitting: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  error: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onChangeChallenge: (next: AuthChallengeResponse) => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onCodeComplete: (code: string) => void;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onBack?: () => void;
};

/** Mensagens de falha de e-mail (só Gmail SMTP / relay — sem Resend). */
// Declara função auxiliar interna
function mailErrorCopy(code?: string): string {
  // Condição — executa bloco só se verdadeira
  if (code === "smtp_failed") {
    // Retorna valor ou JSX para quem chamou
    return "O Gmail recusou o envio. Confira SMTP_PASS (senha de app, sem espaços) e se a verificação em 2 etapas está ligada na conta controlaisistematech@gmail.com.";
  }
  // Condição — executa bloco só se verdadeira
  if (code === "relay_failed" || code === "relay_unreachable") {
    // Retorna valor ou JSX para quem chamou
    return "O relay Vercel não enviou o e-mail. Confira EMAIL_SMTP_RELAY_URL, EMAIL_SMTP_RELAY_SECRET (igual no Railway e na Vercel) e SMTP_PASS no Railway.";
  }
  // Condição — executa bloco só se verdadeira
  if (code === "relay_missing_smtp") {
    // Retorna valor ou JSX para quem chamou
    return "Falta SMTP_PASS no Railway para o relay enviar pelo Gmail.";
  }
  // Condição — executa bloco só se verdadeira
  if (code === "no_provider") {
    // Retorna valor ou JSX para quem chamou
    return "Nenhum provedor de e-mail configurado (SMTP_PASS / relay).";
  }
  // Retorna valor ou JSX para quem chamou
  return "O e-mail não saiu. Confira SMTP Gmail e o relay Vercel (sem Resend).";
}

// Instrução do fluxo — parte da lógica de negócio ou interface
const PURPOSE_COPY: Record<string, { title: string; hint: string }> = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  register: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    title: "Confirme seu e-mail",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    hint: "Enviamos um código de 6 dígitos para finalizar o cadastro.",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  login: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    title: "Verificação em 2 etapas",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    hint: "Digite o código enviado ao seu e-mail para entrar.",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  enable: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    title: "Ativar verificação em 2 etapas",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    hint: "Confirme o código recebido por e-mail para ligar a proteção.",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  disable: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    title: "Desativar verificação em 2 etapas",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    hint: "Confirme o código recebido por e-mail para desligar a proteção.",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  password_reset: {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    title: "Código para redefinir senha",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    hint: "Digite o código do e-mail — ou abra o botão “Abrir página de nova senha” no mesmo e-mail.",
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  },
};

// Exporta função usada por outros arquivos
export function EmailOtpStep({
  // Instrução do fluxo — parte da lógica de negócio ou interface
  challenge,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  submitting,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  error,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onChangeChallenge,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onCodeComplete,
  // Instrução do fluxo — parte da lógica de negócio ou interface
  onBack,
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}: Props) {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [code, setCode] = useState("");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [resendLeft, setResendLeft] = useState(60); // Cooldown de reenvio
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [resendError, setResendError] = useState("");
  // Constante local
  const copy = PURPOSE_COPY[challenge.purpose] ?? PURPOSE_COPY.login;

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setCode("");
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setResendLeft(60);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setResendError("");
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [challenge.challengeId]);

  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    // Condição — executa bloco só se verdadeira
    if (resendLeft <= 0) return;
    // Constante local
    const t = window.setTimeout(() => setResendLeft((s) => s - 1), 1000);
    // Retorna valor ou JSX para quem chamou
    return () => window.clearTimeout(t);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  }, [resendLeft]);

  // Constante local
  const handleResend = async () => {
    // Condição — executa bloco só se verdadeira
    if (resendLeft > 0) return;
    // Instrução do fluxo — parte da lógica de negócio ou interface
    setResendError("");
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const next = await resendTwoFactorRequest(challenge.challengeId);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      onChangeChallenge(next);
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (err) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      setResendError(err instanceof Error ? err.message : "Não foi possível reenviar.");
    }
  };

  // Retorna valor ou JSX para quem chamou
  return (
    // Tag HTML na interface
    <div className="space-y-4">
      // Instrução do fluxo — parte da lógica de negócio ou interface
      {onBack && (
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Executa ação quando o usuário clica
          onClick={onBack}
          // Classes CSS Tailwind — controla aparência visual
          className="text-xs text-cgray-400 hover:text-cgreen-500 transition-colors"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Voltar
        // Tag HTML na interface
        </button>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}
      // Tag HTML na interface
      <div className="text-center">
        // Tag HTML na interface
        <h2 className="text-xl font-medium text-cgray-900 dark:text-foreground">{copy.title}</h2>
        // Tag HTML na interface
        <p className="text-sm text-cgray-400 mt-1">{copy.hint}</p>
        // Tag HTML na interface
        <p className="text-sm text-cgray-500 mt-2">
          // Classes CSS Tailwind — controla aparência visual
          Enviado para <span className="font-medium text-cgray-700 dark:text-foreground">{challenge.emailHint}</span>
        // Tag HTML na interface
        </p>
      // Tag HTML na interface
      </div>

      // Tag HTML na interface
      <div className="flex justify-center">
        // Elemento/componente React na tela
        <InputOTP
          // Instrução do fluxo — parte da lógica de negócio ou interface
          maxLength={6}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          value={code}
          // Recorta parte da lista (paginação ou limite)
          onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
          // Instrução do fluxo — parte da lógica de negócio ou interface
          onComplete={onCodeComplete}
          // Desabilita botão/campo (ex.: durante envio)
          disabled={submitting}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Elemento/componente React na tela
          <InputOTPGroup>
            // Percorre lista e renderiza um item para cada elemento
            {Array.from({ length: 6 }).map((_, i) => (
              // Elemento/componente React na tela
              <InputOTPSlot key={i} index={i} />
            // Passo do algoritmo — executa parte da regra de negócio ou da interface
            ))}
          // Elemento/componente React na tela
          </InputOTPGroup>
        // Elemento/componente React na tela
        </InputOTP>
      // Tag HTML na interface
      </div>

      // Instrução do fluxo — parte da lógica de negócio ou interface
      {challenge.devCode && (
        // Tag HTML na interface
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          Modo local sem e-mail: use o código {challenge.devCode}
        // Tag HTML na interface
        </p>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}
      // Instrução do fluxo — parte da lógica de negócio ou interface
      {challenge.emailSent === false && !challenge.devCode && (
        // Tag HTML na interface
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {mailErrorCopy(challenge.emailError)}
        // Tag HTML na interface
        </p>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}

      // Instrução do fluxo — parte da lógica de negócio ou interface
      {(error || resendError) && (
        // Tag HTML na interface
        <p className="text-center text-xs text-cred-main">{error || resendError}</p>
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      )}

      // Tag HTML na interface
      <button
        // Botão comum (não envia formulário)
        type="button"
        // Desabilita botão/campo (ex.: durante envio)
        disabled={submitting || code.length !== 6}
        // Executa ação quando o usuário clica
        onClick={() => onCodeComplete(code)}
        // Classes CSS Tailwind — controla aparência visual
        className="w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium hover:bg-cgreen-700 active:scale-[0.98] transition-all disabled:opacity-60"
      // Instrução do fluxo — parte da lógica de negócio ou interface
      >
        // Instrução do fluxo — parte da lógica de negócio ou interface
        {submitting ? "Verificando…" : "Confirmar código"}
      // Tag HTML na interface
      </button>

      // Tag HTML na interface
      <p className="text-center text-xs text-cgray-400">
        // Instrução do fluxo — parte da lógica de negócio ou interface
        Não chegou?{" "}
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Executa ação quando o usuário clica
          onClick={handleResend}
          // Desabilita botão/campo (ex.: durante envio)
          disabled={resendLeft > 0}
          // Classes CSS Tailwind — controla aparência visual
          className="text-cgreen-500 font-medium disabled:text-cgray-400"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        >
          // Instrução do fluxo — parte da lógica de negócio ou interface
          {resendLeft > 0 ? `Reenviar em ${resendLeft}s` : "Reenviar código"}
        // Tag HTML na interface
        </button>
      // Tag HTML na interface
      </p>
    // Tag HTML na interface
    </div>
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  );
}
