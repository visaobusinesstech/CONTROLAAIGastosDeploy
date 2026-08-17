/**
 * Envio de e-mails transacionais — reset de senha e códigos 2FA.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Caminho principal: SMTP Gmail (qualquer destinatário).
 * Resend fica como tentativa extra; beth.t@example.com só entrega para a conta Resend.
 */
import { createTransport, type Transporter } from "nodemailer"; // SMTP genérico (Gmail)
import { getAppBaseUrl } from "../api/app-links.js"; // FRONTEND_URL para links do reset

const OTP_MINUTES = 10; // Validade do código de 6 dígitos
const RESET_MINUTES = 30; // Validade do link de nova senha

const DEFAULT_SMTP_HOST = "smtp.gmail.com"; // Host Gmail
const DEFAULT_SMTP_PORT = 587; // STARTTLS
const DEFAULT_SMTP_USER = "controlaaisistematech@gmail.com"; // Conta do sistema

/** Resultado do envio — error é código estável para a UI (sem corpo da API). */
export type MailSendResult = {
  sent: boolean;
  skipped: boolean;
  via?: "resend" | "smtp" | "none";
  error?: string;
};

let smtpTransport: Transporter | null = null; // Reusa a conexão SMTP no processo

const RESEND_TEST_FROM = "Controla.ai <beth.t@example.com>"; // From de teste do Resend

/** Tira quebra de linha do Railway no cabeçalho From. */
function compactFromHeader(raw: string): string {
  const angled = raw.match(/^(.*<)([\s\S]*?)(>.*)$/);
  if (angled) {
    const email = angled[2].replace(/\s+/g, "");
    return `${angled[1].replace(/\s+$/, "")}${email}${angled[3].replace(/^\s+/, "")}`.trim();
  }
  return raw.replace(/\s+/g, " ").trim();
}

/** Remetente do Resend — ignora example.com (placeholder). */
function resendFrom(): string {
  const raw = process.env.MAIL_FROM?.trim();
  if (!raw) return RESEND_TEST_FROM;
  const from = compactFromHeader(raw);
  const email = from.match(/<([^>]+)>/)?.[1] ?? from;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain || domain === "example.com") {
    console.warn("[mail] MAIL_FROM inválido. Usando onboarding.resend.dev.");
    return RESEND_TEST_FROM;
  }
  return from;
}

/** Usuário SMTP (Gmail do sistema, salvo SMTP_USER no Railway). */
function smtpUser(): string {
  return process.env.SMTP_USER?.trim() || DEFAULT_SMTP_USER;
}

/** Senha de app — só via SMTP_PASS no Railway (nunca no git). */
function smtpPass(): string {
  return (process.env.SMTP_PASS ?? "").replace(/\s+/g, "");
}

/** Remetente SMTP — Gmail não aceita from de resend.dev. */
function smtpFrom(): string {
  const explicit = process.env.MAIL_FROM_SMTP?.trim();
  if (explicit) return compactFromHeader(explicit);
  return `Controla.ai <${smtpUser()}>`;
}

/** True quando não há Resend nem SMTP — OTP pode ir no JSON (só fora de produção). */
export function shouldExposeDevCode(): boolean {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(smtpPass());
  return !hasResend && !hasSmtp && process.env.NODE_ENV !== "production";
}

/** Cria (ou reusa) o transporter Gmail. */
function getSmtpTransport(): Transporter | null {
  const pass = smtpPass();
  if (!pass) return null;
  if (smtpTransport) return smtpTransport;
  const host = process.env.SMTP_HOST?.trim() || DEFAULT_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? String(DEFAULT_SMTP_PORT));
  smtpTransport = createTransport({
    host,
    port,
    secure: port === 465, // SSL direto só na 465
    auth: { user: smtpUser(), pass },
  });
  return smtpTransport;
}

/** Classifica o corpo do Resend sem vazar a chave. */
function classifyResendError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (lower.includes("domain not verified") || lower.includes("example.com")) {
    return "resend_from_domain";
  }
  if (
    status === 403 &&
    (lower.includes("own email") ||
      lower.includes("testing emails") ||
      lower.includes("verify a domain") ||
      lower.includes("resend.dev"))
  ) {
    return "resend_testing_recipient";
  }
  if (status === 401) return "resend_auth";
  return "resend_rejected";
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

/** Envia pelo Gmail (Nodemailer). */
async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult | null> {
  const smtp = getSmtpTransport();
  if (!smtp) return null;
  await smtp.sendMail({
    from: smtpFrom(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return { sent: true, skipped: false, via: "smtp" };
}

/** Tenta Resend (domínio próprio ou só o e-mail da conta). */
async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return { sent: false, skipped: true, via: "resend", error: "no_provider" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom(),
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (res.ok) return { sent: true, skipped: false, via: "resend" };
  const body = await res.text();
  console.error(`[mail] Resend ${res.status}: ${body.slice(0, 500)}`);
  return { sent: false, skipped: false, via: "resend", error: classifyResendError(res.status, body) };
}

/** Gmail primeiro (qualquer destinatário); Resend só se o SMTP falhar ou não houver senha. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult> {
  let smtpAttempted = false;
  if (smtpPass()) {
    smtpAttempted = true;
    try {
      const smtpResult = await sendViaSmtp(opts);
      if (smtpResult?.sent) return smtpResult;
    } catch (err) {
      console.error("[mail] SMTP falhou, tentando Resend:", err);
    }
  }

  try {
    const resendResult = await sendViaResend(opts);
    if (resendResult.sent) return resendResult;
    if (resendResult.error && resendResult.error !== "no_provider") {
      return {
        sent: false,
        skipped: false,
        via: smtpAttempted ? "smtp" : "resend",
        error: smtpAttempted ? "smtp_failed" : resendResult.error,
      };
    }
  } catch (err) {
    console.error("[mail] Resend rede:", err);
  }

  if (smtpAttempted) {
    return { sent: false, skipped: false, via: "smtp", error: "smtp_failed" };
  }

  console.warn(`[mail] Sem provedor — e-mail NÃO enviado para ${opts.to}`);
  console.warn(`[mail] Assunto: ${opts.subject}`);
  console.warn(`[mail] ${opts.text}`);
  return { sent: false, skipped: true, via: "none", error: "no_provider" };
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
