/**
 * Envio de e-mails transacionais — reset de senha e códigos 2FA.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Prioridade: RESEND_API_KEY → SMTP (SMTP_HOST) → log em desenvolvimento.
 */
import { createTransport, type Transporter } from "nodemailer"; // SMTP genérico (Gmail, etc.)
import { getAppBaseUrl } from "../api/app-links.js"; // FRONTEND_URL para links do reset

const OTP_MINUTES = 10; // Validade do código de 6 dígitos
const RESET_MINUTES = 30; // Validade do link de nova senha

/** Resultado do envio — skipped=true quando não há provedor configurado. */
export type MailSendResult = {
  sent: boolean;
  skipped: boolean;
};

let smtpTransport: Transporter | null = null; // Reusa a conexão SMTP no processo

/** Remetente padrão — Resend aceita beth.t@example.com no plano gratuito. */
function mailFrom(): string {
  return process.env.MAIL_FROM?.trim() || "Controla.ai <beth.t@example.com>";
}

/** True quando não há Resend nem SMTP — o código OTP pode ir na resposta (só fora de produção). */
export function shouldExposeDevCode(): boolean {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(process.env.SMTP_HOST?.trim());
  return !hasResend && !hasSmtp && process.env.NODE_ENV !== "production";
}

/** Cria (ou reusa) o transporter Nodemailer a partir das variáveis SMTP_*. */
function getSmtpTransport(): Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  if (smtpTransport) return smtpTransport;
  const port = Number(process.env.SMTP_PORT ?? "587");
  smtpTransport = createTransport({
    host,
    port,
    secure: port === 465, // SSL direto só na 465
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return smtpTransport;
}

/** Envelope HTML simples com a identidade visual verde do Controla.ai. */
function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#16a34a;padding:20px 28px;color:#fff;font-size:20px;font-weight:700;">Controla.ai</td></tr>
        <tr><td style="padding:28px;color:#111827;font-size:15px;line-height:1.55;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;">${title}</h1>
          ${bodyHtml}
          <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">Se você não solicitou isso, ignore este e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Envia HTML+texto via Resend, SMTP ou console (dev). */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult> {
  const from = mailFrom();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html, text: opts.text }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
    }
    return { sent: true, skipped: false };
  }

  const smtp = getSmtpTransport();
  if (smtp) {
    await smtp.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });
    return { sent: true, skipped: false };
  }

  console.warn(`[mail] Sem RESEND_API_KEY/SMTP — e-mail NÃO enviado para ${opts.to}`);
  console.warn(`[mail] Assunto: ${opts.subject}`);
  console.warn(`[mail] ${opts.text}`);
  return { sent: false, skipped: true };
}

/** E-mail com código de 6 dígitos (cadastro, login 2FA, ligar/desligar). */
export async function sendOtpEmail(to: string, code: string, purpose: string): Promise<MailSendResult> {
  const labels: Record<string, string> = {
    register: "Confirme seu cadastro",
    login: "Código de verificação",
    enable: "Ativar verificação em 2 etapas",
    disable: "Desativar verificação em 2 etapas",
  };
  const title = labels[purpose] ?? "Código de verificação";
  const html = wrapHtml(
    title,
    `<p>Use o código abaixo. Ele expira em <strong>${OTP_MINUTES} minutos</strong>.</p>
     <p style="margin:20px 0;font-size:28px;letter-spacing:8px;font-weight:700;color:#16a34a;">${code}</p>`,
  );
  const text = `${title}\n\nCódigo: ${code}\nValidade: ${OTP_MINUTES} minutos.`;
  return sendMail({ to, subject: `${title} — Controla.ai`, html, text });
}

/** E-mail com link de redefinição de senha (token opaco na query). */
export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<MailSendResult> {
  const url = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const html = wrapHtml(
    "Redefinir senha",
    `<p>Recebemos um pedido para redefinir a senha da sua conta.</p>
     <p>O link abaixo vale por <strong>${RESET_MINUTES} minutos</strong> e só pode ser usado uma vez.</p>
     <p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Escolher nova senha</a></p>
     <p style="color:#6b7280;font-size:12px;word-break:break-all;">${url}</p>`,
  );
  const text = `Redefinir senha Controla.ai\n\nAbra o link (válido ${RESET_MINUTES} min):\n${url}`;
  return sendMail({ to, subject: "Redefinir senha — Controla.ai", html, text });
}

export { OTP_MINUTES, RESET_MINUTES };
