/**
 * Relay de e-mail — Vercel (HTTPS → Gmail SMTP ou Resend API).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Vercel: só EMAIL_SMTP_RELAY_SECRET. Railway manda smtp/resend no body.
 */
import { createTransport } from "nodemailer"; // Gmail SMTP no Vercel
import dns from "node:dns"; // IPv4 primeiro

dns.setDefaultResultOrder("ipv4first");

export const config = {
  runtime: "nodejs",
  maxDuration: 30, // Hobby — não esperar 60s se SMTP travar
};

const DEFAULT_SMTP_USER = "controlaisistematech@gmail.com";
const SMTP_RACE_MS = 10_000; // Teto por tentativa — evita FUNCTION_INVOCATION_TIMEOUT

type RelayBody = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  smtpUser?: string;
  smtpPass?: string;
  from?: string;
  resendApiKey?: string;
  resendFrom?: string;
};

function stripEnv(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

function normalizeSmtpUser(raw: string | undefined): string {
  let user = stripEnv(raw) || DEFAULT_SMTP_USER;
  const angled = user.match(/<([^>]+)>/);
  if (angled) user = angled[1];
  user = user.replace(/\s+/g, "").toLowerCase();
  if (user === "controlaaisistematech@gmail.com") return DEFAULT_SMTP_USER;
  return user;
}

function resolveFrom(body: RelayBody, user: string): string {
  const explicit = body.from?.trim();
  if (explicit) {
    return explicit.replace(/controlaaisistematech@gmail\.com/gi, DEFAULT_SMTP_USER);
  }
  return `Controla.ai <${user}>`;
}

function resolveResendFrom(body: RelayBody): string {
  const raw = stripEnv(body.resendFrom);
  if (!raw) return "Controla.ai <onboarding@resend.dev>";
  const email = raw.match(/<([^>]+)>/)?.[1] ?? raw;
  if (email.split("@")[1]?.toLowerCase() === "example.com") {
    return "Controla.ai <onboarding@resend.dev>";
  }
  return raw;
}

async function readBody(req: Request): Promise<RelayBody> {
  try {
    return (await req.json()) as RelayBody;
  } catch {
    return {};
  }
}

function authorize(req: Request): boolean {
  const secret = stripEnv(process.env.EMAIL_SMTP_RELAY_SECRET);
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  return (req.headers.get("x-relay-secret") ?? "") === secret;
}

/** Corta operação que não responde — nodemailer às vezes ignora connectionTimeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label}_timeout_${ms}ms`)), ms);
    }),
  ]);
}

/** Gmail SMTP — 587 primeiro (Vercel costuma falhar menos que 465). */
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
    { port: 587, secure: false },
    { port: 465, secure: true },
  ];
  let lastErr: unknown;
  for (const cfg of attempts) {
    const transport = createTransport({
      host: "smtp.gmail.com",
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: opts.user, pass: opts.pass },
      connectionTimeout: SMTP_RACE_MS,
      greetingTimeout: SMTP_RACE_MS,
      socketTimeout: SMTP_RACE_MS,
    });
    try {
      const info = await withTimeout(
        transport.sendMail({
          from: opts.from,
          to: opts.to,
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        }),
        SMTP_RACE_MS,
        `smtp_${cfg.port}`,
      );
      transport.close();
      console.info(`[email-relay] SMTP OK ${cfg.port} → ${opts.to}`);
      return { messageId: info.messageId };
    } catch (err) {
      lastErr = err;
      console.error(`[email-relay] SMTP ${cfg.port}:`, err);
      try {
        transport.close();
      } catch {
        /* ignora */
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("smtp_failed");
}

/** Resend API — HTTPS, confiável no Vercel. */
async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  apiKey: string;
  from: string;
}): Promise<{ id?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`resend_${res.status}:${body.slice(0, 120)}`);
  }
  const data = (await res.json()) as { id?: string };
  console.info(`[email-relay] Resend OK → ${opts.to} id=${data.id ?? "?"}`);
  return { id: data.id };
}

/** POST /relay/send → função /api/email-relay */
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
  const resendKey = stripEnv(body.resendApiKey);

  if (!to || !subject || (!html && !text)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const smtpErrors: string[] = [];

  if (pass) {
    try {
      const info = await sendViaSmtp({ to, subject, html, text, user, pass, from });
      return Response.json({ sent: true, via: "smtp", messageId: info.messageId ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      smtpErrors.push(msg.slice(0, 120));
      console.error("[email-relay] SMTP esgotado:", msg);
    }
  } else {
    smtpErrors.push("no_smtp_pass");
  }

  if (resendKey) {
    try {
      const info = await sendViaResend({
        to,
        subject,
        html,
        text,
        apiKey: resendKey,
        from: resolveResendFrom(body),
      });
      return Response.json({ sent: true, via: "resend", messageId: info.id ?? null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      smtpErrors.push(msg.slice(0, 120));
      console.error("[email-relay] Resend falhou:", msg);
    }
  }

  return Response.json(
    {
      sent: false,
      error: "relay_all_failed",
      detail: smtpErrors.join(" | ").slice(0, 300),
    },
    { status: 502 },
  );
}
