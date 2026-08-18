/**
 * Envio de e-mails transacionais — reset de senha e códigos 2FA.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * SMTP Gmail na request HTTP (não em background) — no Railway o envio solto era descartado.
 */
import { createTransport } from "nodemailer"; // SMTP Gmail
import dns from "node:dns"; // IPv4 primeiro — smtp.gmail.com em IPv6 falha em alguns hosts
import { getAppBaseUrl } from "../api/app-links.js"; // FRONTEND_URL para links do reset

dns.setDefaultResultOrder("ipv4first");

const OTP_MINUTES = 10; // Validade do código de 6 dígitos
const RESET_MINUTES = 30; // Validade do link de nova senha
const DEFAULT_SMTP_USER = "controlaisistematech@gmail.com"; // Conta Google real (um "a")
const MAIL_CHANNEL_MS = 12_000; // Tempo por tentativa de porta (465 depois 587)

/** Resultado do envio — error é código estável para a UI (sem corpo da API). */
export type MailSendResult = {
  sent: boolean;
  skipped: boolean;
  via?: "resend" | "smtp" | "none";
  error?: string;
};

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

/** Remove aspas/espaços que o Railway às vezes grava na variável. */
function stripEnv(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

/** Usuário SMTP — a senha de app é da conta com um "a" (controlai…), não controlaa…. */
function smtpUser(): string {
  let raw = stripEnv(process.env.SMTP_USER) || DEFAULT_SMTP_USER;
  const angled = raw.match(/<([^>]+)>/);
  if (angled) raw = angled[1];
  raw = raw.replace(/\s+/g, "").toLowerCase();
  if (raw === "controlaaisistematech@gmail.com") return DEFAULT_SMTP_USER;
  return raw;
}

/** Senha de app — só via SMTP_PASS no Railway (nunca no git). */
function smtpPass(): string {
  return stripEnv(process.env.SMTP_PASS).replace(/\s+/g, "");
}

/** Remetente SMTP — Gmail exige o mesmo endereço autenticado. */
function smtpFrom(): string {
  const explicit = process.env.MAIL_FROM_SMTP?.trim();
  if (explicit) {
    return compactFromHeader(explicit).replace(/controlaaisistematech@gmail\.com/gi, DEFAULT_SMTP_USER);
  }
  return `Controla.ai <${smtpUser()}>`;
}

/** Snapshot para /health — não inclui senha. */
export function mailHealthSnapshot(): { smtp: boolean; smtpUser: string } {
  const user = smtpUser();
  const [local, domain] = user.split("@");
  const hint = local && domain ? `${local.slice(0, 4)}***@${domain}` : "unset";
  return { smtp: Boolean(smtpPass()), smtpUser: hint };
}

/** True quando não há Resend nem SMTP — OTP pode ir no JSON (só fora de produção). */
export function shouldExposeDevCode(): boolean {
  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasSmtp = Boolean(smtpPass());
  return !hasResend && !hasSmtp && process.env.NODE_ENV !== "production";
}

/** Envia pelo Gmail: SSL 465 e, se falhar, STARTTLS 587. Sem cache de conexão morta. */
async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult | null> {
  const pass = smtpPass();
  if (!pass) return null;
  const user = smtpUser();
  const from = smtpFrom();
  console.info(`[mail] SMTP → ${opts.to} from=${from} user=${user}`);
  const attempts: Array<{ port: number; secure: boolean }> = [
    { port: 465, secure: true },
    { port: 587, secure: false },
  ];
  let lastErr: unknown;
  for (const cfg of attempts) {
    const transport = createTransport({
      host: "smtp.gmail.com",
      port: cfg.port,
      secure: cfg.secure,
      auth: { user, pass },
      connectionTimeout: MAIL_CHANNEL_MS,
      greetingTimeout: MAIL_CHANNEL_MS,
      socketTimeout: MAIL_CHANNEL_MS,
    });
    try {
      const info = await transport.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      console.info(`[mail] SMTP OK porta ${cfg.port} id=${info.messageId ?? "?"}`);
      await transport.close();
      return { sent: true, skipped: false, via: "smtp" };
    } catch (err) {
      lastErr = err;
      console.error(`[mail] SMTP porta ${cfg.port} falhou:`, err);
      await transport.close().catch(() => undefined);
    }
  }
  console.error("[mail] SMTP esgotou 465 e 587:", lastErr);
  return { sent: false, skipped: false, via: "smtp", error: "smtp_failed" };
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

/** Gmail quando há senha de app; Resend só se SMTP não estiver configurado. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult> {
  if (smtpPass()) {
    const smtpResult = await sendViaSmtp(opts);
    if (smtpResult?.sent) return smtpResult;
    return smtpResult ?? { sent: false, skipped: false, via: "smtp", error: "smtp_failed" };
  }

  try {
    const resendResult = await sendViaResend(opts);
    if (resendResult.sent) return resendResult;
    if (resendResult.error && resendResult.error !== "no_provider") return resendResult;
  } catch (err) {
    console.error("[mail] Resend rede:", err);
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
