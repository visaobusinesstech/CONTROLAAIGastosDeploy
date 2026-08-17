/**
 * Etapa de código OTP enviado por e-mail (cadastro, login 2FA, ligar/desligar).
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
};

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

  useEffect(() => {
    setCode("");
    setResendLeft(60);
    setResendError("");
  }, [challenge.challengeId]);

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
    <div className="space-y-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-cgray-400 hover:text-cgreen-500 transition-colors"
        >
          Voltar
        </button>
      )}
      <div className="text-center">
        <h2 className="text-xl font-medium text-cgray-900 dark:text-foreground">{copy.title}</h2>
        <p className="text-sm text-cgray-400 mt-1">{copy.hint}</p>
        <p className="text-sm text-cgray-500 mt-2">
          Enviado para <span className="font-medium text-cgray-700 dark:text-foreground">{challenge.emailHint}</span>
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
          onComplete={onCodeComplete}
          disabled={submitting}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {challenge.devCode && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          Modo local sem e-mail: use o código {challenge.devCode}
        </p>
      )}
      {challenge.emailSent === false && !challenge.devCode && (
        <p className="text-center text-xs text-amber-600 dark:text-amber-400">
          O e-mail não saiu (configure RESEND_API_KEY ou SMTP no backend). Use Reenviar depois de configurar.
        </p>
      )}

      {(error || resendError) && (
        <p className="text-center text-xs text-cred-main">{error || resendError}</p>
      )}

      <button
        type="button"
        disabled={submitting || code.length !== 6}
        onClick={() => onCodeComplete(code)}
        className="w-full h-11 rounded-xl bg-cgreen-500 text-white text-sm font-medium hover:bg-cgreen-700 active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {submitting ? "Verificando…" : "Confirmar código"}
      </button>

      <p className="text-center text-xs text-cgray-400">
        Não chegou?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendLeft > 0}
          className="text-cgreen-500 font-medium disabled:text-cgray-400"
        >
          {resendLeft > 0 ? `Reenviar em ${resendLeft}s` : "Reenviar código"}
        </button>
      </p>
    </div>
  );
}
