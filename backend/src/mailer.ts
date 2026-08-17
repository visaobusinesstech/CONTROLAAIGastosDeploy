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
const DEFAULT_SMTP_USER = "controlaisistematech@gmail.com"; // Conta Google real (um "a")
const MAIL_CHANNEL_MS = 20_000; // Envio Gmail real leva ~5–8s; 5s abortava envio válido

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

/** Usuário SMTP — a senha de app é da conta com um "a" (controlai…), não controlaa…. */
function smtpUser(): string {
  const raw = process.env.SMTP_USER?.trim() || DEFAULT_SMTP_USER;
  if (/^controlaaisistematech@gmail\.com$/i.test(raw)) return DEFAULT_SMTP_USER;
  return raw;
}

/** Senha de app — só via SMTP_PASS no Railway (nunca no git). */
function smtpPass(): string {
  return (process.env.SMTP_PASS ?? "").replace(/\s+/g, "");
}

/** Remetente SMTP — Gmail exige o mesmo endereço autenticado. */
function smtpFrom(): string {
  const explicit = process.env.MAIL_FROM_SMTP?.trim();
  if (explicit) {
    return compactFromHeader(explicit).replace(/controlaaisistematech@gmail\.com/gi, DEFAULT_SMTP_USER);
  }
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
    connectionTimeout: MAIL_CHANNEL_MS, // Evita "Entrando…" infinito se a porta 587 travar
    greetingTimeout: MAIL_CHANNEL_MS,
    socketTimeout: MAIL_CHANNEL_MS,
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

/** Envelope HTML no padrão visual do login (verde Controla.ai). */
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

/** Envia pelo Gmail (Nodemailer) com timeout curto. */
async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult | null> {
  const smtp = getSmtpTransport();
  if (!smtp) return null;
  try {
    await smtp.sendMail({
      from: smtpFrom(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { sent: true, skipped: false, via: "smtp" };
  } catch (err) {
    smtpTransport = null; // Não reutiliza conexão morta
    throw err;
  }
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
    signal: AbortSignal.timeout(MAIL_CHANNEL_MS), // Não segura o /auth/login
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

/** E-mail com código de 6 dígitos (cadastro, login 2FA, ligar/desligar) — HTML padrão, não é página. */
export async function sendOtpEmail(to: string, code: string, purpose: string): Promise<MailSendResult> {
  const labels: Record<string, string> = {
    register: "Confirme seu cadastro",
    login: "Verificação em 2 etapas",
    enable: "Ativar verificação em 2 etapas",
    disable: "Desativar verificação em 2 etapas",
  };
  const title = labels[purpose] ?? "Código de verificação";
  const html = wrapHtml(
    title,
    `<p>Use o código abaixo no app Controla.ai. Ele expira em <strong>${OTP_MINUTES} minutos</strong>.</p>
     <div style="margin:20px 0;padding:18px 12px;background:#f4f6f5;border-radius:12px;text-align:center;">
       <p style="margin:0;font-size:32px;letter-spacing:10px;font-weight:700;color:#16a34a;">${code}</p>
     </div>
     <p style="color:#6b7280;font-size:13px;">Não compartilhe este código. Ninguém da equipe pede isso por mensagem.</p>`,
  );
  const text = `${title}\n\nCódigo: ${code}\nValidade: ${OTP_MINUTES} minutos.`;
  return sendMail({ to, subject: `${title} — Controla.ai`, html, text });
}

/** E-mail de “esqueci a senha”: botão para a página /reset-password (mesmo padrão do login). Sem código. */
export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<MailSendResult> {
  const url = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const html = wrapHtml(
    "Redefinir senha",
    `<p>Recebemos um pedido para alterar a senha da sua conta.</p>
     <p>Clique no botão para abrir a <strong>página de nova senha</strong> (o mesmo visual do login). O link vale por <strong>${RESET_MINUTES} minutos</strong> e só pode ser usado uma vez.</p>
     <p style="margin:24px 0;text-align:center;"><a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600;font-size:15px;">Abrir página de nova senha</a></p>
     <p style="color:#6b7280;font-size:12px;word-break:break-all;">Se o botão não abrir: ${url}</p>`,
  );
  const text = `Redefinir senha Controla.ai\n\nAbra a página (válida ${RESET_MINUTES} min):\n${url}`;
  return sendMail({ to, subject: "Redefinir senha — Controla.ai", html, text });
}

export { OTP_MINUTES, RESET_MINUTES };
