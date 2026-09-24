/**
 * Módulo compartilhado OTP/2FA — biblioteca interna das rotas auth na Vercel
 *
 * O que é: funções reutilizadas por login, 2FA enable/disable/verify/resend e settings.
 * Centraliza conexão Postgres (Railway), JWT, geração de código OTP, e-mail SMTP e helpers.
 *
 * Para que serve: evita duplicar lógica de banco/e-mail em cada arquivo frontend/api/.
 * Não é rota HTTP — é importado por auth-2fa-*.ts, user-settings.ts etc.
 *
 * Por que na Vercel: todo fluxo de autenticação roda em serverless Node com DATABASE_URL
 * e SMTP_* configurados no painel Vercel (mesmas credenciais do Postgres Railway).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createTransport } from "nodemailer";
import postgres from "postgres";

export const JWT_SECRET =
  (process.env.JWT_SECRET ?? "").trim() ||
  "controlaai-tcc-unicesumar-2026-davi-leonardo-gustavo-long-secret-key";

const DATABASE_URL =
  (process.env.DATABASE_URL ?? "").trim() ||
  "postgresql://postgres:qxjDdGqZDVqJpXLsHibuGZVElCrxrcAc@maglev.proxy.rlwy.net:29404/railway?sslmode=require";

const SMTP_USER = (process.env.SMTP_USER ?? "").trim() || "controlaisistematech@gmail.com";
const SMTP_PASS = ((process.env.SMTP_PASS ?? "").trim() || "vzuxnrgjfltotwvk").replace(/\s+/g, "");
const MAIL_FROM = (process.env.MAIL_FROM_SMTP ?? "").trim() || `Controla.ai <${SMTP_USER}>`;

export const OTP_MINUTES = 10;
const OTP_TTL_MS = OTP_MINUTES * 60 * 1000;

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (sql) return sql;
  const url = DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  sql = postgres(url, {
    max: 1,
    connect_timeout: 10,
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  return sql;
}

// Exporta constante/tipo/classe pública
export type AuthUser = { id: string; email: string; name: string };

// Exporta função usada por outros arquivos
export function verifyBearer(authHeader: string | undefined): { sub: string; email: string; tv?: number } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET) as { sub: string; email: string; tv?: number };
  } catch {
    return null;
  }
}

// Exporta função usada por outros arquivos
export async function loadUser(userId: string): Promise<AuthUser | null> {
  const db = getDb();
  const rows = await db<{ id: string; email: string; name: string; is_active: boolean | null }[]>`
    SELECT id, email, name, is_active FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;
  const u = rows[0];
  if (!u || u.is_active === false) return null;
  return { id: u.id, email: u.email, name: u.name };
}

// Exporta função usada por outros arquivos
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

// Exporta função usada por outros arquivos
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Exporta constante/tipo/classe pública
export type OtpPurpose = "login" | "enable" | "disable" | "register" | "password_reset";

/** HTML específico por propósito (2FA / login). */
// Exporta função usada por outros arquivos
export function buildOtpEmailHtml(purpose: OtpPurpose, code: string): { subject: string; html: string; text: string } {
  const titles: Record<string, string> = {
    enable: "Ativar verificação em 2 etapas",
    disable: "Desativar verificação em 2 etapas",
    login: "Código de acesso — verificação em 2 etapas",
    register: "Confirme seu cadastro",
    password_reset: "Código para redefinir senha",
  };
  const title = titles[purpose] ?? "Código de verificação";
  const intros: Record<string, string> = {
    enable:
      "Você pediu para <strong>ativar</strong> a verificação em 2 etapas na sua conta Controla.ai. Use o código abaixo para confirmar.",
    disable:
      "Você pediu para <strong>desativar</strong> a verificação em 2 etapas. Use o código abaixo para confirmar.",
    login: "Alguém tentou entrar na sua conta. Se foi você, use o código abaixo para concluir o login.",
    register: "Use o código abaixo para confirmar seu e-mail no Controla.ai.",
    password_reset: "Use o código abaixo para continuar a redefinição de senha.",
  };
  const intro = intros[purpose] ?? "Use o código abaixo no app Controla.ai.";
  const subject = `${title} — Controla.ai`;
  // HTML do e-mail (comentários JS NÃO podem ficar dentro do template — vazam no Gmail)
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:#16a34a;padding:20px 28px;color:#fff;font-size:20px;font-weight:700;">Controla.ai</td></tr>
        <tr><td style="padding:28px;color:#111827;font-size:15px;line-height:1.55;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;">${title}</h1>
          <p>${intro}</p>
          <p>O código expira em <strong>${OTP_MINUTES} minutos</strong>.</p>
          <div style="margin:24px 0;padding:20px 12px;background:#f4f6f5;border-radius:12px;text-align:center;">
            <p style="margin:0;font-size:36px;letter-spacing:12px;font-weight:700;color:#16a34a;">${code}</p>
          </div>
          <p style="color:#6b7280;font-size:13px;">Não compartilhe este código. A equipe Controla.ai nunca pede isso por mensagem.</p>
          <p style="margin:24px 0 0;color:#6b7280;font-size:12px;">Se você não solicitou isso, ignore este e-mail.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  const text = `${title}\n\nCódigo: ${code}\nValidade: ${OTP_MINUTES} minutos.`;
  return { subject, html, text };
}

// Exporta função usada por outros arquivos
export async function sendOtpMail(to: string, purpose: OtpPurpose, code: string): Promise<{ sent: boolean; error?: string }> {
  // Desestrutura valores do hook/contexto (acesso direto às variáveis)
  const { subject, html, text } = buildOtpEmailHtml(purpose, code);
  const transport = createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000,
  });
  try {
    // Aguarda resposta assíncrona (API, timer)
    await transport.sendMail({ from: MAIL_FROM, to, subject, html, text, priority: "high" });
    transport.close();
    return { sent: true };
  } catch (err) {
    try {
      transport.close();
    } catch {
      /* ignore */
    }
    return { sent: false, error: err instanceof Error ? err.message.slice(0, 120) : "smtp_failed" };
  }
}

/** Cria challenge no banco, envia e-mail e devolve payload do frontend. */
// Exporta função usada por outros arquivos
export async function createAndSendOtp(opts: {
  userId: string;
  email: string;
  purpose: OtpPurpose;
}): Promise<{
  requiresTwoFactor: true;
  challengeId: string;
  purpose: OtpPurpose;
  emailHint: string;
  expiresInSeconds: number;
  emailSent: boolean;
  emailError?: string;
}> {
  const db = getDb();
  // Aguarda resposta assíncrona (API, timer)
  await db`
    UPDATE two_factor_challenges
    SET consumed_at = now()
    WHERE user_id = ${opts.userId}::uuid
      AND purpose = ${opts.purpose}::two_factor_purpose
      AND consumed_at IS NULL
  `;
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const inserted = await db<{ id: string }[]>`
    INSERT INTO two_factor_challenges (user_id, purpose, code_hash, expires_at)
    VALUES (${opts.userId}::uuid, ${opts.purpose}::two_factor_purpose, ${codeHash}, ${expiresAt})
    RETURNING id
  `;
  const challengeId = inserted[0]?.id;
  if (!challengeId) throw new Error("Failed to create challenge");
  const mail = await sendOtpMail(opts.email, opts.purpose, code);
  return {
    requiresTwoFactor: true,
    challengeId,
    purpose: opts.purpose,
    emailHint: maskEmail(opts.email),
    expiresInSeconds: OTP_MINUTES * 60,
    emailSent: mail.sent,
    ...(mail.sent ? {} : { emailError: mail.error ?? "smtp_failed" }),
  };
}

// Exporta função usada por outros arquivos
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db<{ two_factor_enabled: boolean }[]>`
    SELECT two_factor_enabled FROM user_settings WHERE user_id = ${userId}::uuid LIMIT 1
  `;
  return Boolean(rows[0]?.two_factor_enabled);
}
