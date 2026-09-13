/**
 * Helpers compartilhados OTP/2FA (Postgres + JWT + e-mail).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de node:crypto
import { randomInt } from "node:crypto";
// Importa de bcryptjs
import bcrypt from "bcryptjs";
// Importa de jsonwebtoken
import jwt from "jsonwebtoken";
// Importa funções/componentes de nodemailer
import { createTransport } from "nodemailer";
// Importa de postgres
import postgres from "postgres";

// Exporta constante/tipo/classe pública
export const JWT_SECRET =
  // Remove espaços no início/fim do texto
  (process.env.JWT_SECRET ?? "").trim() ||
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "controlaai-tcc-unicesumar-2026-davi-leonardo-gustavo-long-secret-key";

// Constante local
const DATABASE_URL =
  // Remove espaços no início/fim do texto
  (process.env.DATABASE_URL ?? "").trim() ||
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "postgresql://postgres:qxjDdGqZDVqJpXLsHibuGZVElCrxrcAc@maglev.proxy.rlwy.net:29404/railway?sslmode=require";

// Constante local
const SMTP_USER = (process.env.SMTP_USER ?? "").trim() || "controlaisistematech@gmail.com";
// Constante local
const SMTP_PASS = ((process.env.SMTP_PASS ?? "").trim() || "vzuxnrgjfltotwvk").replace(/\s+/g, "");
// Constante local
const MAIL_FROM = (process.env.MAIL_FROM_SMTP ?? "").trim() || `Controla.ai <${SMTP_USER}>`;

// Exporta constante/tipo/classe pública
export const OTP_MINUTES = 10;
// Constante local
const OTP_TTL_MS = OTP_MINUTES * 60 * 1000;

// Variável mutável local
let sql: ReturnType<typeof postgres> | null = null;

// Exporta função usada por outros arquivos
export function getDb() {
  // Condição — executa bloco só se verdadeira
  if (sql) return sql;
  // Constante local
  const url = DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  sql = postgres(url, {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    max: 1,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    connect_timeout: 10,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    prepare: false,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ssl: { rejectUnauthorized: false },
  });
  // Retorna valor ou JSX para quem chamou
  return sql;
}

// Exporta constante/tipo/classe pública
export type AuthUser = { id: string; email: string; name: string };

// Exporta função usada por outros arquivos
export function verifyBearer(authHeader: string | undefined): { sub: string; email: string; tv?: number } | null {
  // Condição — executa bloco só se verdadeira
  if (!authHeader?.startsWith("Bearer ")) return null;
  // Tenta executar — erros vão para catch
  try {
    // Retorna valor ou JSX para quem chamou
    return jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string; email: string; tv?: number };
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch {
    // Retorna valor ou JSX para quem chamou
    return null;
  }
}

// Exporta função usada por outros arquivos
export async function loadUser(userId: string): Promise<AuthUser | null> {
  // Constante local
  const db = getDb();
  // Constante local
  const rows = await db<{ id: string; email: string; name: string; is_active: boolean | null }[]>`
    // Instrução do fluxo — parte da lógica de negócio ou interface
    SELECT id, email, name, is_active FROM users WHERE id = ${userId}::uuid LIMIT 1
  // Instrução do fluxo — parte da lógica de negócio ou interface
  `;
  // Constante local
  const u = rows[0];
  // Condição — executa bloco só se verdadeira
  if (!u || u.is_active === false) return null;
  // Retorna valor ou JSX para quem chamou
  return { id: u.id, email: u.email, name: u.name };
}

// Exporta função usada por outros arquivos
export function maskEmail(email: string): string {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const [local, domain] = email.split("@");
  // Condição — executa bloco só se verdadeira
  if (!local || !domain) return "***";
  // Retorna valor ou JSX para quem chamou
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

// Exporta função usada por outros arquivos
export function generateOtpCode(): string {
  // Retorna valor ou JSX para quem chamou
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Exporta constante/tipo/classe pública
export type OtpPurpose = "login" | "enable" | "disable" | "register" | "password_reset";

/** HTML específico por propósito (2FA / login). */
// Exporta função usada por outros arquivos
export function buildOtpEmailHtml(purpose: OtpPurpose, code: string): { subject: string; html: string; text: string } {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const titles: Record<string, string> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enable: "Ativar verificação em 2 etapas",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    disable: "Desativar verificação em 2 etapas",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    login: "Código de acesso — verificação em 2 etapas",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    register: "Confirme seu cadastro",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    password_reset: "Código para redefinir senha",
  };
  // Constante local
  const title = titles[purpose] ?? "Código de verificação";
  // Instrução do fluxo — parte da lógica de negócio ou interface
  const intros: Record<string, string> = {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    enable:
      // Instrução do fluxo — parte da lógica de negócio ou interface
      "Você pediu para <strong>ativar</strong> a verificação em 2 etapas na sua conta Controla.ai. Use o código abaixo para confirmar.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    disable:
      // Instrução do fluxo — parte da lógica de negócio ou interface
      "Você pediu para <strong>desativar</strong> a verificação em 2 etapas. Use o código abaixo para confirmar.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    login: "Alguém tentou entrar na sua conta. Se foi você, use o código abaixo para concluir o login.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    register: "Use o código abaixo para confirmar seu e-mail no Controla.ai.",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    password_reset: "Use o código abaixo para continuar a redefinição de senha.",
  };
  // Constante local
  const intro = intros[purpose] ?? "Use o código abaixo no app Controla.ai.";
  // Constante local
  const subject = `${title} — Controla.ai`;
  // Constante local
  const html = `<!DOCTYPE html>
// Tag HTML na interface
<html lang="pt-BR">
// Tag HTML na interface
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
// Tag HTML na interface
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Arial,sans-serif;">
  // Tag HTML na interface
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px;">
    // Tag HTML na interface
    <tr><td align="center">
      // Tag HTML na interface
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        // Tag HTML na interface
        <tr><td style="background:#16a34a;padding:20px 28px;color:#fff;font-size:20px;font-weight:700;">Controla.ai</td></tr>
        // Tag HTML na interface
        <tr><td style="padding:28px;color:#111827;font-size:15px;line-height:1.55;">
          // Tag HTML na interface
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;">${title}</h1>
          // Tag HTML na interface
          <p>${intro}</p>
          // Tag HTML na interface
          <p>O código expira em <strong>${OTP_MINUTES} minutos</strong>.</p>
          // Tag HTML na interface
          <div style="margin:24px 0;padding:20px 12px;background:#f4f6f5;border-radius:12px;text-align:center;">
            // Tag HTML na interface
            <p style="margin:0;font-size:36px;letter-spacing:12px;font-weight:700;color:#16a34a;">${code}</p>
          // Tag HTML na interface
          </div>
          // Tag HTML na interface
          <p style="color:#6b7280;font-size:13px;">Não compartilhe este código. A equipe Controla.ai nunca pede isso por mensagem.</p>
          // Tag HTML na interface
          <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">Se você não solicitou isso, ignore este e-mail.</p>
        // Tag HTML na interface
        </td></tr>
      // Tag HTML na interface
      </table>
    // Tag HTML na interface
    </td></tr>
  // Tag HTML na interface
  </table>
// Tag HTML na interface
</body>
// Tag HTML na interface
</html>`;
  // Constante local
  const text = `${title}\n\nCódigo: ${code}\nValidade: ${OTP_MINUTES} minutos.`;
  // Retorna valor ou JSX para quem chamou
  return { subject, html, text };
}

// Exporta função usada por outros arquivos
export async function sendOtpMail(to: string, purpose: OtpPurpose, code: string): Promise<{ sent: boolean; error?: string }> {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { subject, html, text } = buildOtpEmailHtml(purpose, code);
  // Constante local
  const transport = createTransport({
    // Instrução do fluxo — parte da lógica de negócio ou interface
    host: "smtp.gmail.com",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    port: 465,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    secure: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Instrução do fluxo — parte da lógica de negócio ou interface
    connectionTimeout: 6000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    greetingTimeout: 6000,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    socketTimeout: 8000,
  });
  // Tenta executar — erros vão para catch
  try {
    // Aguarda resposta assíncrona (API, timer)
    await transport.sendMail({ from: MAIL_FROM, to, subject, html, text, priority: "high" });
    // Instrução do fluxo — parte da lógica de negócio ou interface
    transport.close();
    // Retorna valor ou JSX para quem chamou
    return { sent: true };
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Tenta executar — erros vão para catch
    try {
      // Instrução do fluxo — parte da lógica de negócio ou interface
      transport.close();
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch {
      /* ignore */
    }
    // Retorna valor ou JSX para quem chamou
    return { sent: false, error: err instanceof Error ? err.message.slice(0, 120) : "smtp_failed" };
  }
}

/** Cria challenge no banco, envia e-mail e devolve payload do frontend. */
// Exporta função usada por outros arquivos
export async function createAndSendOtp(opts: {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  userId: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  email: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  purpose: OtpPurpose;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}): Promise<{
  // Instrução do fluxo — parte da lógica de negócio ou interface
  requiresTwoFactor: true;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  challengeId: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  purpose: OtpPurpose;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  emailHint: string;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  expiresInSeconds: number;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  emailSent: boolean;
  // Instrução do fluxo — parte da lógica de negócio ou interface
  emailError?: string;
// Passo do algoritmo — executa parte da regra de negócio ou da interface
}> {
  // Constante local
  const db = getDb();
  // Aguarda resposta assíncrona (API, timer)
  await db`
    // Instrução do fluxo — parte da lógica de negócio ou interface
    UPDATE two_factor_challenges
    // Instrução do fluxo — parte da lógica de negócio ou interface
    SET consumed_at = now()
    // Instrução do fluxo — parte da lógica de negócio ou interface
    WHERE user_id = ${opts.userId}::uuid
      // Instrução do fluxo — parte da lógica de negócio ou interface
      AND purpose = ${opts.purpose}::two_factor_purpose
      // Instrução do fluxo — parte da lógica de negócio ou interface
      AND consumed_at IS NULL
  // Instrução do fluxo — parte da lógica de negócio ou interface
  `;

  // Constante local
  const code = generateOtpCode();
  // Constante local
  const codeHash = await bcrypt.hash(code, 10);
  // Constante local
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  // Constante local
  const inserted = await db<{ id: string }[]>`
    // Instrução do fluxo — parte da lógica de negócio ou interface
    INSERT INTO two_factor_challenges (user_id, purpose, code_hash, expires_at)
    // Instrução do fluxo — parte da lógica de negócio ou interface
    VALUES (${opts.userId}::uuid, ${opts.purpose}::two_factor_purpose, ${codeHash}, ${expiresAt})
    // Instrução do fluxo — parte da lógica de negócio ou interface
    RETURNING id
  // Instrução do fluxo — parte da lógica de negócio ou interface
  `;
  // Constante local
  const challengeId = inserted[0]?.id;
  // Condição — executa bloco só se verdadeira
  if (!challengeId) throw new Error("Failed to create challenge");

  // Constante local
  const mail = await sendOtpMail(opts.email, opts.purpose, code);
  // Retorna valor ou JSX para quem chamou
  return {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    requiresTwoFactor: true,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    challengeId,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    purpose: opts.purpose,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    emailHint: maskEmail(opts.email),
    // Instrução do fluxo — parte da lógica de negócio ou interface
    expiresInSeconds: OTP_MINUTES * 60,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    emailSent: mail.sent,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ...(mail.sent ? {} : { emailError: mail.error ?? "smtp_failed" }),
  };
}

// Exporta função usada por outros arquivos
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  // Constante local
  const db = getDb();
  // Constante local
  const rows = await db<{ two_factor_enabled: boolean }[]>`
    // Instrução do fluxo — parte da lógica de negócio ou interface
    SELECT two_factor_enabled FROM user_settings WHERE user_id = ${userId}::uuid LIMIT 1
  // Instrução do fluxo — parte da lógica de negócio ou interface
  `;
  // Retorna valor ou JSX para quem chamou
  return Boolean(rows[0]?.two_factor_enabled);
}
