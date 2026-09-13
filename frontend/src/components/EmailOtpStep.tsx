/**
 * Etapa de código OTP enviado por e-mail (cadastro, login 2FA, ligar/desligar).
 *
 * Papel no sistema: Componente reutilizável do frontend — compõe páginas ou layout.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { useEffect, useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { resendTwoFactorRequest, type AuthChallengeResponse } from "@/lib/api";

type Props = {
  challenge: AuthChallengeResponse;
  submitting: boolean;
  error: string;
  onChangeChallenge: (next: AuthChallengeResponse) => void;
  onCodeComplete: (code: string) => void;
  onBack?: () => void;
};

/** Mensagens de falha de e-mail (só Gmail SMTP / relay — sem Resend). */
// Declara função auxiliar interna
function mailErrorCopy(code?: string): string {
  if (code === "smtp_failed") {
    return "O Gmail recusou o envio. Confira SMTP_PASS (senha de app, sem espaços) e se a verificação em 2 etapas está ligada na conta controlaisistematech@gmail.com.";
  }
  if (code === "relay_failed" || code === "relay_unreachable") {
    return "O relay Vercel não enviou o e-mail. Confira EMAIL_SMTP_RELAY_URL, EMAIL_SMTP_RELAY_SECRET (igual no Railway e na Vercel) e SMTP_PASS no Railway.";
  }
  if (code === "relay_missing_smtp") {
    return "Falta SMTP_PASS no Railway para o relay enviar pelo Gmail.";
  }
  if (code === "no_provider") {
    return "Nenhum provedor de e-mail configurado (SMTP_PASS / relay).";
  }
  return "O e-mail não saiu. Confira SMTP Gmail e o relay Vercel (sem Resend).";
}

const PURPOSE_COPY: Record<string, { title: string; hint: string }> = {
  register: {
    title: "Confirme seu e-mail",
    hint: "Enviamos um código de 6 dígitos para finalizar o cadastro.",
  },
  login: {
    title: "Verificação em 2 etapas",
    hint: "Digite o código enviado ao seu e-mail para entrar.",
  },
  enable: {
    title: "Ativar verificação em 2 etapas",
    hint: "Confirme o código recebido por e-mail para ligar a proteção.",
  },
  disable: {
    title: "Desativar verificação em 2 etapas",
    hint: "Confirme o código recebido por e-mail para desligar a proteção.",
  },
  password_reset: {
    title: "Código para redefinir senha",
    hint: "Digite o código do e-mail — ou abra o botão “Abrir página de nova senha” no mesmo e-mail.",
  },
};

// Exporta função usada por outros arquivos
export function EmailOtpStep({
  challenge,
  submitting,
  error,
  onChangeChallenge,
  onCodeComplete,
  onBack,
}: Props) {
  const [code, setCode] = useState("");
  const [resendLeft, setResendLeft] = useState(60); // Cooldown de reenvio
  const [resendError, setResendError] = useState("");
  const copy = PURPOSE_COPY[challenge.purpose] ?? PURPOSE_COPY.login;
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    setCode("");
    setResendLeft(60);
    setResendError("");
  }, [challenge.challengeId]);
  // Executa efeito colateral (API, título, redirect) ao montar/mudar deps
  useEffect(() => {
    if (resendLeft <= 0) return;
    const t = window.setTimeout(() => setResendLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendLeft]);
  const handleResend = async () => {
    if (resendLeft > 0) return;
    setResendError("");
    try {
      const next = await resendTwoFactorRequest(challenge.challengeId);
      onChangeChallenge(next);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Não foi possível reenviar.");
    }
  };
  return (
    // Tag HTML na interface
    <div className="space-y-4">
      {onBack && (
        // Tag HTML na interface
        <button
          // Botão comum (não envia formulário)
          type="button"
          // Executa ação quando o usuário clica
          onClick={onBack}
          // Classes CSS Tailwind — controla aparência visual
          className="text-xs text-cgray-400 hover:text-cgreen-500 transition-colors"
        >
          Voltar
        // Tag HTML na interface
        </button>
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
          maxLength={6}
          value={code}
          // Recorta parte da lista (paginação ou limite)
          onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
          onComplete={onCodeComplete}
          // Desabilita botão/campo (ex.: durante envio)
          disabled={submitting}
        >
          // Elemento/componente React na tela
          <InputOTPGroup>
            // Percorre lista e renderiza um item para cada elemento
            {Array.from({ length: 6 }).map((_, i) => (
              // Elemento/componente React na tela
              <InputOTPSlot key={i} index={i} />
            ))}
          // Elemento/componente React na tela
          </InputOTPGroup>
        // Elemento/componente React na tela
        </InputOTP>
      // Tag HTML na interface
      </div>
      {challenge.devCode && (
        // Tag HTML na interface
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          Modo local sem e-mail: use o código {challenge.devCode}
        // Tag HTML na interface
        </p>
      )}
      {challenge.emailSent === false && !challenge.devCode && (
        // Tag HTML na interface
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          {mailErrorCopy(challenge.emailError)}
        // Tag HTML na interface
        </p>
      )}
      {(error || resendError) && (
        // Tag HTML na interface
        <p className="text-center text-xs text-cred-main">{error || resendError}</p>
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
      >
        {submitting ? "Verificando…" : "Confirmar código"}
      // Tag HTML na interface
      </button>
      // Tag HTML na interface
      <p className="text-center text-xs text-cgray-400">
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
        >
          {resendLeft > 0 ? `Reenviar em ${resendLeft}s` : "Reenviar código"}
        // Tag HTML na interface
        </button>
      // Tag HTML na interface
      </p>
    // Tag HTML na interface
    </div>
  );
}
