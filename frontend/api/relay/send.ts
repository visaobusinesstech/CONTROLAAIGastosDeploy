/**
 * Relay Resend — Vercel Edge (só HTTPS, sem nodemailer).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * Vercel: só EMAIL_SMTP_RELAY_SECRET. Railway manda resendApiKey + conteúdo no body.
 */
export const config = {
  runtime: "edge",
};

type RelayBody = {
  to?: string;
  subject?: string;
  html?: string;
  text?: string;
  resendApiKey?: string;
  resendFrom?: string;
};

function stripEnv(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

function resolveResendFrom(raw: string | undefined): string {
  const from = stripEnv(raw);
  if (!from) return "Controla.ai <onboarding@resend.dev>";
  const email = from.match(/<([^>]+)>/)?.[1] ?? from;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain || domain === "example.com") {
    return "Controla.ai <onboarding@resend.dev>";
  }
  return from.replace(/controlaaisistematech@gmail\.com/gi, "noreply@controlaai.com");
}

function authorize(req: Request): boolean {
  const secret = stripEnv(process.env.EMAIL_SMTP_RELAY_SECRET);
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  return (req.headers.get("x-relay-secret") ?? "") === secret;
}

/** POST /relay/send (rewrite) → esta função Edge */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RelayBody;
  try {
    body = (await req.json()) as RelayBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const html = body.html ?? "";
  const text = body.text ?? "";
  const apiKey = stripEnv(body.resendApiKey);

  if (!to || !subject || (!html && !text)) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!apiKey) {
    return Response.json({ error: "resendApiKey required (RESEND_API_KEY no Railway)" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolveResendFrom(body.resendFrom),
        to: [to],
        subject,
        html,
        text,
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.error("[relay/send] Resend", res.status, raw.slice(0, 200));
      return Response.json(
        { sent: false, via: "resend", error: "resend_rejected", detail: raw.slice(0, 200) },
        { status: 502 },
      );
    }
    let id: string | null = null;
    try {
      id = (JSON.parse(raw) as { id?: string }).id ?? null;
    } catch {
      /* ignora */
    }
    return Response.json({ sent: true, via: "resend", messageId: id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ sent: false, error: "resend_network", detail: msg }, { status: 502 });
  }
}
