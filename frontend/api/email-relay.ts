/**
 * Relay SMTP Gmail — Vercel (HTTPS → Gmail 465/587).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Só precisa de EMAIL_SMTP_RELAY_SECRET no Vercel; credenciais Gmail vêm no body (Railway).
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

const DEFAULT_SMTP_USER = "controlaisistematech@gmail.com"; // Fallback se Railway não mandar user
const MAIL_CHANNEL_MS = 15_000; // Tempo por tentativa de porta

type RelayBody = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  smtpUser?: string;
  smtpPass?: string;
  from?: string;
};

/** Remove aspas/espaços que o painel às vezes grava na variável. */
function stripEnv(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

/** Normaliza e-mail SMTP — corrige controlaa… (dois "a") para controlai…. */
function normalizeSmtpUser(raw: string | undefined): string {
  let user = stripEnv(raw) || DEFAULT_SMTP_USER;
  const angled = user.match(/<([^>]+)>/);
  if (angled) user = angled[1];
  user = user.replace(/\s+/g, "").toLowerCase();
  if (user === "controlaaisistematech@gmail.com") return DEFAULT_SMTP_USER;
  return user;
}

/** Remetente — usa from do body ou monta a partir do user autenticado. */
function resolveFrom(body: RelayBody, user: string): string {
  const explicit = body.from?.trim();
  if (explicit) {
    return explicit.replace(/controlaaisistematech@gmail\.com/gi, DEFAULT_SMTP_USER);
  }
  return `Controla.ai <${user}>`;
}

/** Lê JSON do body da request. */
async function readBody(req: Request): Promise<RelayBody> {
  try {
    return (await req.json()) as RelayBody;
  } catch {
    return {};
  }
}

/** Valida Bearer ou header X-Relay-Secret — única env obrigatória no Vercel. */
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
  user: string;
  pass: string;
  from: string;
}): Promise<{ messageId?: string }> {
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
      auth: { user: opts.user, pass: opts.pass },
      connectionTimeout: MAIL_CHANNEL_MS,
      greetingTimeout: MAIL_CHANNEL_MS,
      socketTimeout: MAIL_CHANNEL_MS,
    });
    try {
      const info = await transport.sendMail({
        from: opts.from,
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

/** POST /api/email-relay — credenciais Gmail vêm do Railway no body (HTTPS). */
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
  const pass = stripEnv(body.smtpPass).replace(/\s+/g, "");
  const user = normalizeSmtpUser(body.smtpUser);
  const from = resolveFrom(body, user);

  if (!to || !subject || (!html && !text)) {
    return Response.json({ error: "Invalid payload: to, subject, html|text required" }, { status: 400 });
  }
  if (!pass) {
    return Response.json({ error: "smtpPass required in body (configure SMTP_PASS no Railway)" }, { status: 400 });
  }

  try {
    const info = await sendViaSmtp({ to, subject, html, text, user, pass, from });
    return Response.json({ sent: true, via: "smtp", messageId: info.messageId ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email-relay] falha final:", msg);
    return Response.json({ sent: false, via: "smtp", error: "smtp_failed", detail: msg.slice(0, 200) }, { status: 502 });
  }
}
