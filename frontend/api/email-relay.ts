/**
 * Relay SMTP Gmail — Vercel (HTTPS → Gmail 465/587).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Railway bloqueia SMTP; o backend POSTa aqui com EMAIL_SMTP_RELAY_SECRET.
 * O envio é await antes da resposta (requisito Vercel serverless).
 */
import { createTransport } from "nodemailer"; // SMTP Gmail no Vercel
import dns from "node:dns"; // IPv4 primeiro — evita timeout em smtp.gmail.com

dns.setDefaultResultOrder("ipv4first");

/** Node.js no Vercel — nodemailer não roda em Edge. */
export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

const DEFAULT_SMTP_USER = "controlaisistematech@gmail.com"; // Conta Google real (um "a")
const MAIL_CHANNEL_MS = 15_000; // Tempo por tentativa de porta

type RelayBody = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
};

/** Remove aspas/espaços que o painel às vezes grava na variável. */
function stripEnv(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

/** Usuário SMTP — senha de app é da conta controlai… (um "a"). */
function smtpUser(): string {
  let raw = stripEnv(process.env.SMTP_USER) || DEFAULT_SMTP_USER;
  const angled = raw.match(/<([^>]+)>/);
  if (angled) raw = angled[1];
  raw = raw.replace(/\s+/g, "").toLowerCase();
  if (raw === "controlaaisistematech@gmail.com") return DEFAULT_SMTP_USER;
  return raw;
}

/** Senha de app Gmail — SMTP_PASS no Vercel. */
function smtpPass(): string {
  return stripEnv(process.env.SMTP_PASS).replace(/\s+/g, "");
}

/** Remetente — Gmail exige o mesmo endereço autenticado. */
function smtpFrom(): string {
  const explicit = process.env.MAIL_FROM_SMTP?.trim();
  if (explicit) {
    return explicit.replace(/controlaaisistematech@gmail\.com/gi, DEFAULT_SMTP_USER);
  }
  return `Controla.ai <${smtpUser()}>`;
}

/** Lê JSON do body (Request Web ou objeto legado). */
async function readBody(req: Request): Promise<RelayBody> {
  try {
    return (await req.json()) as RelayBody;
  } catch {
    return {};
  }
}

/** Valida Bearer ou header X-Relay-Secret. */
function authorize(req: Request): boolean {
  const secret = stripEnv(process.env.EMAIL_SMTP_RELAY_SECRET);
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  const header = req.headers.get("x-relay-secret") ?? "";
  return header === secret;
}

/** Envia via Gmail: SSL 465 e, se falhar, STARTTLS 587. */
async function sendViaSmtp(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId?: string }> {
  const pass = smtpPass();
  if (!pass) throw new Error("SMTP_PASS not configured on relay");
  const user = smtpUser();
  const from = smtpFrom();
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
      transport.close();
      console.info(`[email-relay] OK porta ${cfg.port} → ${opts.to} id=${info.messageId ?? "?"}`);
      return { messageId: info.messageId };
    } catch (err) {
      lastErr = err;
      console.error(`[email-relay] porta ${cfg.port} falhou:`, err);
      try {
        transport.close();
      } catch {
        /* ignora falha ao fechar socket */
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("SMTP failed on 465 and 587");
}

/** POST /api/email-relay — só o backend Railway com secret válido. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readBody(req);
  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const html = body.html ?? "";
  const text = body.text ?? "";
  if (!to || !subject || (!html && !text)) {
    return Response.json({ error: "Invalid payload: to, subject, html|text required" }, { status: 400 });
  }

  try {
    const info = await sendViaSmtp({ to, subject, html, text });
    return Response.json({ sent: true, via: "smtp", messageId: info.messageId ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-relay] falha final:", msg);
    return Response.json({ sent: false, via: "smtp", error: "smtp_failed", detail: msg.slice(0, 200) }, { status: 502 });
  }
}
