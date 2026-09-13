/**
 * Relay SMTP Gmail — Vercel Node (sem Resend).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Vercel (controla ou worker): só EMAIL_SMTP_RELAY_SECRET.
 * Railway manda no body: to, subject, html, text, smtpUser, smtpPass, from.
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa funções/componentes de nodemailer
import { createTransport } from "nodemailer";

// Exporta constante/tipo/classe pública
export const config = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  runtime: "nodejs",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  maxDuration: 30,
};

// Define formato de dados (TypeScript)
type RelayBody = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  to?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  subject?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  html?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  text?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  smtpUser?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  smtpPass?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  from?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  smtpHost?: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  smtpPort?: number;
};

// Declara função auxiliar interna
function stripEnv(raw: string | undefined): string {
  // Retorna valor ou JSX para quem chamou
  return (raw ?? "").trim().replace(/^['"]+|['"]+$/g, "");
}

// Declara função auxiliar interna
function authorize(req: VercelRequest): boolean {
  // Constante local
  const secret = stripEnv(process.env.EMAIL_SMTP_RELAY_SECRET);
  // Condição — executa bloco só se verdadeira
  if (!secret) return false;
  // Constante local
  const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  // Condição — executa bloco só se verdadeira
  if (auth.startsWith("Bearer ") && auth.slice(7) === secret) return true;
  // Constante local
  const headerSecret = req.headers["x-relay-secret"];
  // Retorna valor ou JSX para quem chamou
  return (typeof headerSecret === "string" ? headerSecret : "") === secret;
}

/** POST /relay/send → Gmail SMTP (credenciais vêm do Railway no body). */
// Exporta como padrão do módulo (import default)
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Condição — executa bloco só se verdadeira
  if (req.method !== "POST") {
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(405).json({ error: "Method not allowed" });
    // Instrução do fluxo — parte da lógica de negócio ou interface
    return;
  }
  // Condição — executa bloco só se verdadeira
  if (!authorize(req)) {
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(401).json({ error: "Unauthorized" });
    // Instrução do fluxo — parte da lógica de negócio ou interface
    return;
  }

  // Constante local
  const body = (typeof req.body === "string" ? JSON.parse(req.body) : req.body) as RelayBody;
  // Constante local
  const to = body.to?.trim();
  // Constante local
  const subject = body.subject?.trim();
  // Constante local
  const html = body.html ?? "";
  // Constante local
  const text = body.text ?? "";
  // Credenciais: body (Railway) ou env na Vercel (fallback)
  const smtpUser =
    // Converte texto para minúsculas (comparação de e-mail)
    stripEnv(body.smtpUser).replace(/\s+/g, "").toLowerCase() ||
    // Converte texto para minúsculas (comparação de e-mail)
    stripEnv(process.env.SMTP_USER).replace(/\s+/g, "").toLowerCase() ||
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "controlaisistematech@gmail.com";
  // Constante local
  const smtpPass =
    // Lê variável de ambiente do servidor (Vercel/Railway)
    stripEnv(body.smtpPass).replace(/\s+/g, "") || stripEnv(process.env.SMTP_PASS).replace(/\s+/g, "");
  // Constante local
  const from =
    // Instrução do fluxo — parte da lógica de negócio ou interface
    stripEnv(body.from) ||
    // Lê variável de ambiente do servidor (Vercel/Railway)
    stripEnv(process.env.MAIL_FROM_SMTP) ||
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `Controla.ai <${smtpUser}>`;
  // Constante local
  const host = stripEnv(body.smtpHost) || stripEnv(process.env.SMTP_HOST) || "smtp.gmail.com";
  // Constante local
  const port = Number(body.smtpPort) || Number(process.env.SMTP_PORT) || 587;

  // Condição — executa bloco só se verdadeira
  if (!to || !subject || (!html && !text)) {
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(400).json({ error: "Invalid payload" });
    // Instrução do fluxo — parte da lógica de negócio ou interface
    return;
  }
  // Condição — executa bloco só se verdadeira
  if (!smtpUser || !smtpPass) {
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(400).json({ error: "smtpUser/smtpPass required (SMTP_* no Railway)" });
    // Instrução do fluxo — parte da lógica de negócio ou interface
    return;
  }

  // Instrução do fluxo — parte da lógica de negócio ou interface
  const attempts: Array<{ port: number; secure: boolean }> = [
    // Instrução do fluxo — parte da lógica de negócio ou interface
    { port: 465, secure: true },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    { port: port || 587, secure: false },
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ];

  // Variável mutável local
  let lastErr = "";
  // Loop — repete para cada item
  for (const cfg of attempts) {
    // Constante local
    const transport = createTransport({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      host,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      port: cfg.port,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      secure: cfg.secure,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      auth: { user: smtpUser, pass: smtpPass },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      connectionTimeout: 12_000,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      greetingTimeout: 12_000,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      socketTimeout: 12_000,
    });
    // Tenta executar — erros vão para catch
    try {
      // Constante local
      const info = await transport.sendMail({ from, to, subject, html, text });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      transport.close();
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({ sent: true, via: "smtp", messageId: info.messageId ?? null });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (err) {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      lastErr = err instanceof Error ? err.message : String(err);
      // Registra mensagem no log do servidor/navegador (debug)
      console.error(`[relay/send] SMTP porta ${cfg.port}:`, lastErr);
      // Tenta executar — erros vão para catch
      try {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        transport.close();
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch {
        /* ignore */
      }
    }
  }

  // Recorta parte da lista (paginação ou limite)
  res.status(502).json({ sent: false, via: "smtp", error: "smtp_failed", detail: lastErr.slice(0, 200) });
}
