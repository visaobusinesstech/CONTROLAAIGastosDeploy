/**
 * Envio Gmail SMTP — import dinâmico.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import dns from "node:dns";
import { resolveMailFrom, resolveSmtpPass, resolveSmtpUser } from "./env";

dns.setDefaultResultOrder("ipv4first");

const RESET_MINUTES = 30;
const PRODUCTION_APP = "https://controlaai-frontend.vercel.app";

function strip(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

function smtpUser(): string {
  let raw = resolveSmtpUser();
  const angled = raw.match(/<([^>]+)>/);
  if (angled) raw = angled[1];
  return raw.replace(/\s+/g, "").toLowerCase();
}

function smtpPass(): string {
  return resolveSmtpPass();
}

function appBase(): string {
  const raw = strip(process.env.VITE_APP_URL) || strip(process.env.PUBLIC_APP_URL) || PRODUCTION_APP;
  const cleaned = raw.replace(/\/+$/, "");
  if (!cleaned || /localhost|127\.0\.0\.1/i.test(cleaned)) return PRODUCTION_APP;
  return cleaned;
}

function buildResetEmailHtml(url: string): { html: string; text: string; subject: string } {
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
  const text = `Redefinir senha — Controla.ai. Use o botão no e-mail. Válido ${RESET_MINUTES} min.`;
  return { html, text, subject };
}

export async function sendResetLinkEmail(
  to: string,
  rawToken: string,
): Promise<{ sent: boolean; error?: string; ms?: number }> {
  const started = Date.now();
  const pass = smtpPass();
  if (!pass) return { sent: false, error: "smtp_missing" };
  const user = smtpUser();
  const from = resolveMailFrom();
  const url = `${appBase()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const { html, text, subject } = buildResetEmailHtml(url);

  const nm = await import("nodemailer");
  const createTransport = nm.createTransport ?? (nm as { default: typeof nm }).default.createTransport;
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 6_000,
    greetingTimeout: 6_000,
    socketTimeout: 8_000,
  });
  try {
    await transport.sendMail({ from, to, subject, html, text, priority: "high" });
    transport.close();
    return { sent: true, ms: Date.now() - started };
  } catch (err) {
    try {
      transport.close();
    } catch {
      /* ignore */
    }
    return {
      sent: false,
      error: (err instanceof Error ? err.message : String(err)).slice(0, 120),
      ms: Date.now() - started,
    };
  }
}
