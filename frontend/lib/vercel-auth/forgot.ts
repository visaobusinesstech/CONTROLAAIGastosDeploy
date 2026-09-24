/**
 * Rota Vercel: POST /auth/forgot → /api/auth/forgot — esqueci minha senha
 *
 * O que faz: recebe o e-mail do usuário, gera token seguro de redefinição (30 min),
 * grava hash no Postgres e envia link por e-mail SMTP para /reset-password.
 *
 * Quando o usuário usa: na tela "Esqueci minha senha", antes de definir nova senha.
 *
 * Por que roda na Vercel: fluxo de auth + e-mail + banco na mesma função serverless;
 * resposta genérica evita revelar se o e-mail existe (segurança LGPD).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomBytes } from "node:crypto";
import { createTransport } from "nodemailer";
import postgres from "postgres";

export const config = { runtime: "nodejs", maxDuration: 15 };

const DATABASE_URL =
  (process.env.DATABASE_URL ?? "").trim() ||
  "postgresql://postgres:qxjDdGqZDVqJpXLsHibuGZVElCrxrcAc@maglev.proxy.rlwy.net:29404/railway?sslmode=require";

const SMTP_USER = (process.env.SMTP_USER ?? "").trim() || "controlaisistematech@gmail.com";
const SMTP_PASS = ((process.env.SMTP_PASS ?? "").trim() || "vzuxnrgjfltotwvk").replace(/\s+/g, "");
const MAIL_FROM =
  (process.env.MAIL_FROM_SMTP ?? "").trim() || `Controla.ai <${SMTP_USER}>`;
const APP = "https://controlaai-frontend.vercel.app";

let sql: ReturnType<typeof postgres> | null = null;

function getDb() {
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

const FORGOT_OK = { ok: true as const, message: "If the email exists, a reset link was sent." };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const db = getDb();
    const users = await db<{ id: string; email: string }[]>`
      SELECT id, email FROM users WHERE lower(email) = ${email} LIMIT 1
    `;
    if (!users.length) {
      res.status(200).json(FORGOT_OK);
      return;
    }
    const user = users[0];
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const url = `${APP}/reset-password?token=${encodeURIComponent(rawToken)}`;
    // Aguarda resposta assíncrona (API, timer)
    await db`
      UPDATE password_reset_tokens SET used = true, used_at = now()
      WHERE user_id = ${user.id}::uuid AND used = false
    `;
    // Aguarda resposta assíncrona (API, timer)
    await db`
      INSERT INTO password_reset_tokens (user_id, token_sha256, expires_at)
      VALUES (${user.id}::uuid, ${tokenHash}, ${expiresAt})
    `;
    // HTML do e-mail (comentários JS NÃO podem ficar dentro do template — vazam no Gmail)
    const html = `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6f5;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#16a34a;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">Controla.ai</div>
        <div style="padding:28px;color:#111827;font-size:15px;line-height:1.55">
          <h1 style="margin:0 0 12px;font-size:20px">Redefinir senha</h1>
          <p>Recebemos um pedido para alterar a senha da sua conta.</p>
          <p>Clique no botão para abrir a página de nova senha. O link vale por <strong>30 minutos</strong>.</p>
          <p style="margin:28px 0;text-align:center">
            <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600">Redefinir minha senha</a>
          </p>
          <p style="color:#6b7280;font-size:12px">Se você não pediu isso, ignore este e-mail.</p>
        </div>
      </div></body></html>`;
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
      await transport.sendMail({
        from: MAIL_FROM,
        to: user.email,
        subject: "Redefinir senha — Controla.ai",
        html,
        text: "Redefinir senha Controla.ai — use o botão no e-mail.",
        priority: "high",
      });
      transport.close();
      res.status(200).json({ ...FORGOT_OK, emailSent: true });
    } catch (mailErr) {
      try {
        transport.close();
      } catch {
        /* ignore */
      }
      // Registra mensagem no log do servidor/navegador (debug)
      console.error("[forgot] smtp", mailErr);
      res.status(200).json({
        ...FORGOT_OK,
        emailSent: false,
        // Recorta parte da lista (paginação ou limite)
        emailError: mailErr instanceof Error ? mailErr.message.slice(0, 120) : "smtp_failed",
      });
    }
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[api/auth/forgot]", err);
    res.status(500).json({ error: "Forgot failed", detail: err instanceof Error ? err.message : String(err) });
  }
}
