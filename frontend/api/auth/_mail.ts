/**
 * Envio rápido Gmail SMTP (Vercel Node) — e-mail de reset só com botão.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { createTransport } from "nodemailer";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const DEFAULT_USER = "controlaisistematech@gmail.com";
const RESET_MINUTES = 30;
/** Sempre o domínio de produção no botão do e-mail (nunca localhost). */
const PRODUCTION_APP = "https://controlaai-frontend.vercel.app";

function strip(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

function smtpUser(): string {
  let raw = strip(process.env.SMTP_USER) || DEFAULT_USER;
  const angled = raw.match(/<([^>]+)>/);
  if (angled) raw = angled[1];
  return raw.replace(/\s+/g, "").toLowerCase();
}

function smtpPass(): string {
  return strip(process.env.SMTP_PASS).replace(/\s+/g, "");
}

/** Base do link do e-mail — só produção (ignora FRONTEND_URL local). */
function appBase(): string {
  const raw = strip(process.env.VITE_APP_URL) || strip(process.env.PUBLIC_APP_URL) || PRODUCTION_APP;
  const cleaned = raw.replace(/\/+$/, "");
  if (!cleaned || /localhost|127\.0\.0\.1/i.test(cleaned)) return PRODUCTION_APP;
  return cleaned;
}

/** HTML do e-mail — só botão (sem URL em texto). */
export function buildResetEmailHtml(url: string): { html: string; text: string; subject: string } {
  const subject = "Redefinir senha — Controla.ai";
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#16a34a;padding:20px 28px;color:#fff;font-size:20px;font-weight:700;">Controla.ai</td></tr>
        <tr><td style="padding:28px;color:#111827;font-size:15px;line-height:1.55;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;">Redefinir senha</h1>
          <p>Recebemos um pedido para alterar a senha da sua conta.</p>
          <p>Clique no botão para abrir a página de nova senha no Controla.ai. O link vale por <strong>${RESET_MINUTES} minutos</strong>.</p>
          <p style="margin:28px 0;text-align:center;">
            <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px;">Redefinir minha senha</a>
          </p>
          <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">Se você não pediu isso, ignore este e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `Redefinir senha — Controla.ai\n\nAbra o botão no e-mail HTML ou acesse o Controla.ai.\nVálido por ${RESET_MINUTES} minutos.`;
  return { html, text, subject };
}

/** Envia via Gmail SSL 465 (rápido; sem tentar 587 se 465 ok). */
export async function sendResetLinkEmail(to: string, rawToken: string): Promise<{ sent: boolean; error?: string; ms?: number }> {
  const started = Date.now();
  const pass = smtpPass();
  if (!pass) return { sent: false, error: "smtp_missing" };
  const user = smtpUser();
  const from = strip(process.env.MAIL_FROM_SMTP) || `Controla.ai <${user}>`;
  const url = `${appBase()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const { html, text, subject } = buildResetEmailHtml(url);

  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 6_000,
    greetingTimeout: 6_000,
    socketTimeout: 8_000,
    pool: false,
  });
  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html,
      text,
      priority: "high",
      headers: { "X-Priority": "1", Importance: "high" },
    });
    transport.close();
    return { sent: true, ms: Date.now() - started };
  } catch (err) {
    const lastErr = err instanceof Error ? err.message : String(err);
    try {
      transport.close();
    } catch {
      /* ignore */
    }
    // Fallback único 587 se 465 falhar
    const t2 = createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 6_000,
      greetingTimeout: 6_000,
      socketTimeout: 8_000,
    });
    try {
      await t2.sendMail({ from, to, subject, html, text, priority: "high" });
      t2.close();
      return { sent: true, ms: Date.now() - started };
    } catch (err2) {
      try {
        t2.close();
      } catch {
        /* ignore */
      }
      const msg = err2 instanceof Error ? err2.message : lastErr;
      return { sent: false, error: msg.slice(0, 120) || "smtp_failed", ms: Date.now() - started };
    }
  }
}
