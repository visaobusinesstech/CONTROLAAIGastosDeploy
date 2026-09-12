/**
 * Envio rápido Gmail SMTP (Vercel Node) — e-mail de reset com botão.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { createTransport } from "nodemailer";

const DEFAULT_USER = "controlaisistematech@gmail.com";
const RESET_MINUTES = 30;

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

function appBase(): string {
  const raw =
    strip(process.env.VITE_APP_URL) ||
    strip(process.env.FRONTEND_URL) ||
    "https://controlaai-frontend.vercel.app";
  const cleaned = raw.replace(/\/+$/, "");
  if (/localhost|127\.0\.0\.1/i.test(cleaned)) return "https://controlaai-frontend.vercel.app";
  return cleaned || "https://controlaai-frontend.vercel.app";
}

/** HTML do e-mail de redefinição (só link — sem OTP). */
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
          <p style="color:#6b7280;font-size:12px;word-break:break-all;">Se o botão não abrir, copie: ${url}</p>
          <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">Se você não pediu isso, ignore este e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `Redefinir senha — Controla.ai\n\nAbra: ${url}\n\nVálido por ${RESET_MINUTES} minutos.`;
  return { html, text, subject };
}

/** Envia e-mail de reset via Gmail (porta 465, fallback 587). */
export async function sendResetLinkEmail(to: string, rawToken: string): Promise<{ sent: boolean; error?: string }> {
  const pass = smtpPass();
  if (!pass) return { sent: false, error: "smtp_missing" };
  const user = smtpUser();
  const from = strip(process.env.MAIL_FROM_SMTP) || `Controla.ai <${user}>`;
  const url = `${appBase()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const { html, text, subject } = buildResetEmailHtml(url);

  const attempts: Array<{ port: number; secure: boolean }> = [
    { port: 465, secure: true },
    { port: 587, secure: false },
  ];
  let lastErr = "";
  for (const cfg of attempts) {
    const transport = createTransport({
      host: strip(process.env.SMTP_HOST) || "smtp.gmail.com",
      port: cfg.port,
      secure: cfg.secure,
      auth: { user, pass },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 8_000,
    });
    try {
      await transport.sendMail({ from, to, subject, html, text });
      transport.close();
      return { sent: true };
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      try {
        transport.close();
      } catch {
        /* ignore */
      }
    }
  }
  return { sent: false, error: lastErr.slice(0, 120) || "smtp_failed" };
}
