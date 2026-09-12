/**
 * Envio de e-mails transacionais — reset de senha e códigos 2FA.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Local: SMTP Gmail direto.
 * Produção (Railway): POST HTTPS → relay Vercel (/relay/send) → Gmail SMTP (sem Resend).
 */
import { createTransport } from "nodemailer"; // SMTP Gmail
import dns from "node:dns"; // IPv4 primeiro — smtp.gmail.com em IPv6 falha em alguns hosts
import { getEmailAppBaseUrl } from "../api/app-links.js"; // URL produção nos e-mails (nunca localhost)

dns.setDefaultResultOrder("ipv4first");

const OTP_MINUTES = 10; // Validade do código de 6 dígitos
const RESET_MINUTES = 30; // Validade do link de nova senha
const DEFAULT_SMTP_USER = "controlaisistematech@gmail.com"; // Conta Google real (um "a")
const MAIL_CHANNEL_MS = 12_000; // Tempo por tentativa de porta (465 depois 587)
const RELAY_TIMEOUT_MS = 25_000; // Relay Vercel Node + SMTP

/** Resultado do envio — error é código estável para a UI (sem corpo da API). */
export type MailSendResult = {
  sent: boolean;
  skipped: boolean;
  via?: "relay" | "smtp" | "none";
  error?: string;
};

/** Tira quebra de linha do Railway no cabeçalho From. */
function compactFromHeader(raw: string): string {
  const angled = raw.match(/^(.*<)([\s\S]*?)(>.*)$/);
  if (angled) {
    const email = angled[2].replace(/\s+/g, "");
    return `${angled[1].replace(/\s+$/, "")}${email}${angled[3].replace(/^\s+/, "")}`.trim();
  }
  return raw.replace(/\s+/g, " ").trim();
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

/** Senha de app — só via SMTP_PASS (nunca no git). */
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

/** URL do relay Vercel — /relay/send (fora do proxy /api/*). */
function relayUrl(): string {
  let url = stripEnv(process.env.EMAIL_SMTP_RELAY_URL).replace(/\/+$/, "");
  if (url.endsWith("/api/email-relay")) {
    url = url.replace(/\/api\/email-relay$/, "/relay/send");
  }
  if (!url) {
    const front = stripEnv(process.env.FRONTEND_URL).replace(/\/+$/, "");
    if (front) url = `${front}/relay/send`;
  }
  return url;
}

/** Secret compartilhado Railway ↔ Vercel (worker ou frontend). */
function relaySecret(): string {
  return stripEnv(process.env.EMAIL_SMTP_RELAY_SECRET);
}

/** Snapshot para /health — não inclui senha nem secret. */
export function mailHealthSnapshot(): {
  smtp: boolean;
  smtpUser: string;
  relay: boolean;
  relayUrl: string | null;
} {
  const user = smtpUser();
  const [local, domain] = user.split("@");
  const hint = local && domain ? `${local.slice(0, 4)}***@${domain}` : "unset";
  const url = relayUrl();
  let relayHost: string | null = null;
  if (url) {
    try {
      relayHost = new URL(url).host;
    } catch {
      relayHost = "invalid";
    }
  }
  return {
    smtp: Boolean(smtpPass()),
    smtpUser: hint,
    relay: Boolean(url && relaySecret()),
    relayUrl: relayHost,
  };
}

/** True quando não há relay nem SMTP — OTP pode ir no JSON (só fora de produção). */
export function shouldExposeDevCode(): boolean {
  const hasRelay = Boolean(relayUrl() && relaySecret());
  const hasSmtp = Boolean(smtpPass());
  return !hasRelay && !hasSmtp && process.env.NODE_ENV !== "production";
}

/** POST HTTPS → relay Vercel → Gmail SMTP (credenciais no body; Vercel só valida o secret). */
async function sendViaRelay(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult | null> {
  const url = relayUrl();
  const secret = relaySecret();
  const pass = smtpPass();
  if (!url || !secret) return null;
  if (!pass) {
    console.error("[mail] relay configurado mas SMTP_PASS ausente");
    return { sent: false, skipped: false, via: "relay", error: "relay_missing_smtp" };
  }

  console.info(`[mail] relay SMTP → ${opts.to} via ${url}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        smtpUser: smtpUser(),
        smtpPass: pass,
        from: smtpFrom(),
        smtpHost: stripEnv(process.env.SMTP_HOST) || "smtp.gmail.com",
        smtpPort: Number(process.env.SMTP_PORT) || 587,
      }),
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))) as { sent?: boolean; messageId?: string; error?: string };
    if (res.ok && body.sent) {
      console.info(`[mail] relay OK id=${body.messageId ?? "?"}`);
      return { sent: true, skipped: false, via: "relay" };
    }
    console.error(`[mail] relay ${res.status}:`, JSON.stringify(body).slice(0, 300));
    return { sent: false, skipped: false, via: "relay", error: body.error ?? "relay_failed" };
  } catch (err) {
    console.error("[mail] relay rede:", err);
    return { sent: false, skipped: false, via: "relay", error: "relay_unreachable" };
  }
}

/** Envia pelo Gmail: SSL 465 e, se falhar, STARTTLS 587. */
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
  console.info(`[mail] SMTP direto → ${opts.to} from=${from} user=${user}`);
  const attempts: Array<{ port: number; secure: boolean }> = [
    { port: 465, secure: true },
    { port: 587, secure: false },
  ];
  let lastErr: unknown;
  for (const cfg of attempts) {
    const transport = createTransport({
      host: stripEnv(process.env.SMTP_HOST) || "smtp.gmail.com",
      port: cfg.port,
      secure: cfg.secure,
      auth: { user, pass },
      connectionTimeout: 6_000,
      greetingTimeout: 6_000,
      socketTimeout: 8_000,
    });
    try {
      const info = await transport.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        priority: "high",
      });
      console.info(`[mail] SMTP OK porta ${cfg.port} id=${info.messageId ?? "?"}`);
      transport.close();
      return { sent: true, skipped: false, via: "smtp" };
    } catch (err) {
      lastErr = err;
      console.error(`[mail] SMTP porta ${cfg.port} falhou:`, err);
      try {
        transport.close();
      } catch {
        /* ignora falha ao fechar socket */
      }
      if (cfg.port === 465) continue; // tenta 587 só se 465 falhar
    }
  }
  console.error("[mail] SMTP esgotou 465 e 587:", lastErr);
  return { sent: false, skipped: false, via: "smtp", error: "smtp_failed" };
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

/**
 * Ordem: SMTP local (dev) → relay Vercel (prod) → SMTP direto.
 * Resend removido — só Gmail.
 */
export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<MailSendResult> {
  const preferSmtpLocal = process.env.NODE_ENV !== "production" && Boolean(smtpPass());
  if (preferSmtpLocal) {
    try {
      const smtpFirst = await sendViaSmtp(opts);
      if (smtpFirst?.sent) return smtpFirst;
    } catch (err) {
      console.error("[mail] SMTP local:", err);
    }
  }

  const relayResult = await sendViaRelay(opts);
  if (relayResult?.sent) return relayResult;

  if (smtpPass()) {
    const smtpResult = await sendViaSmtp(opts);
    if (smtpResult?.sent) return smtpResult;
    if (relayResult) return relayResult;
    if (smtpResult) return smtpResult;
  }

  if (relayResult) return relayResult;

  console.warn(`[mail] Sem provedor — e-mail NÃO enviado para ${opts.to}`);
  return { sent: false, skipped: true, via: "none", error: "no_provider" };
}

/** E-mail com código de 6 dígitos (login 2FA, ligar/desligar). */
export async function sendOtpEmail(to: string, code: string, purpose: string): Promise<MailSendResult> {
  const labels: Record<string, string> = {
    register: "Confirme seu cadastro",
    login: "Verificação em 2 etapas",
    enable: "Ativar verificação em 2 etapas",
    disable: "Desativar verificação em 2 etapas",
    password_reset: "Código para redefinir senha",
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

/**
 * E-mail legado / backend — só link de reset (sem OTP).
 */
export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<MailSendResult> {
  const url = `${getEmailAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const html = wrapHtml(
    "Redefinir senha",
    `<p>Recebemos um pedido para alterar a senha da sua conta.</p>
     <p>Clique no botão para abrir a página de nova senha no Controla.ai. O link vale por <strong>${RESET_MINUTES} minutos</strong>.</p>
     <p style="margin:24px 0;text-align:center;"><a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;">Redefinir minha senha</a></p>`,
  );
  const text = `Redefinir senha Controla.ai — use o botão no e-mail HTML.`;
  return sendMail({ to, subject: "Redefinir senha — Controla.ai", html, text });
}

export { OTP_MINUTES, RESET_MINUTES };
