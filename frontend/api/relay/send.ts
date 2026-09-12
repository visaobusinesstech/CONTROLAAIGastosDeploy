/**
 * Relay SMTP Gmail — Vercel Node (sem Resend).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Vercel (controla ou worker): só EMAIL_SMTP_RELAY_SECRET.
 * Railway manda no body: to, subject, html, text, smtpUser, smtpPass, from.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTransport } from "nodemailer";

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

type RelayBody = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  smtpUser?: string;
  smtpPass?: string;
  from?: string;
  smtpHost?: string;
  smtpPort?: number;
};

function stripEnv(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

function authorize(req: VercelRequest): boolean {
  const secret = stripEnv(process.env.EMAIL_SMTP_RELAY_SECRET);
  if (!secret) return false;
  const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  const headerSecret = req.headers["x-relay-secret"];
  return (typeof headerSecret === "string" ? headerSecret : "") === secret;
}

/** POST /relay/send → Gmail SMTP (credenciais vêm do Railway no body). */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!authorize(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as RelayBody;
  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const html = body.html ?? "";
  const text = body.text ?? "";
  // Credenciais: body (Railway) ou env na Vercel (fallback)
  const smtpUser =
    stripEnv(body.smtpUser).replace(/\s+/g, "").toLowerCase() ||
    stripEnv(process.env.SMTP_USER).replace(/\s+/g, "").toLowerCase() ||
    "controlaisistematech@gmail.com";
  const smtpPass =
    stripEnv(body.smtpPass).replace(/\s+/g, "") || stripEnv(process.env.SMTP_PASS).replace(/\s+/g, "");
  const from =
    stripEnv(body.from) ||
    stripEnv(process.env.MAIL_FROM_SMTP) ||
    `Controla.ai <${smtpUser}>`;
  const host = stripEnv(body.smtpHost) || stripEnv(process.env.SMTP_HOST) || "smtp.gmail.com";
  const port = Number(body.smtpPort) || Number(process.env.SMTP_PORT) || 587;

  if (!to || !subject || (!html && !text)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  if (!smtpUser || !smtpPass) {
    res.status(400).json({ error: "smtpUser/smtpPass required (SMTP_* no Railway)" });
    return;
  }

  const attempts: Array<{ port: number; secure: boolean }> = [
    { port: 465, secure: true },
    { port: port || 587, secure: false },
  ];

  let lastErr = "";
  for (const cfg of attempts) {
    const transport = createTransport({
      host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 12_000,
    });
    try {
      const info = await transport.sendMail({ from, to, subject, html, text });
      transport.close();
      res.status(200).json({ sent: true, via: "smtp", messageId: info.messageId ?? null });
      return;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      console.error(`[relay/send] SMTP porta ${cfg.port}:`, lastErr);
      try {
        transport.close();
      } catch {
        /* ignore */
      }
    }
  }

  res.status(502).json({ sent: false, via: "smtp", error: "smtp_failed", detail: lastErr.slice(0, 200) });
}
