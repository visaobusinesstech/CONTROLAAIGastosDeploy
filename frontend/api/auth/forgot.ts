/**
 * POST /api/auth/forgot — imports estáticos + SMTP rápido.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa funções/componentes de node:crypto
import { createHash, randomBytes } from "node:crypto";
// Importa funções/componentes de nodemailer
import { createTransport } from "nodemailer";
// Importa de postgres
import postgres from "postgres";

// Exporta constante/tipo/classe pública
export const config = { runtime: "nodejs", maxDuration: 15 };

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
const MAIL_FROM =
  // Remove espaços no início/fim do texto
  (process.env.MAIL_FROM_SMTP ?? "").trim() || `Controla.ai <${SMTP_USER}>`;
// Constante local
const APP = "https://controlaai-frontend.vercel.app";

// Variável mutável local
let sql: ReturnType<typeof postgres> | null = null;

// Declara função auxiliar interna
function getDb() {
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

// Constante local
const FORGOT_OK = { ok: true as const, message: "If the email exists, a reset link was sent." };

// Exporta como padrão do módulo (import default)
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Tenta executar — erros vão para catch
  try {
    // Condição — executa bloco só se verdadeira
    if (req.method !== "POST") {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(405).json({ error: "Method not allowed" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    // Constante local
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    // Condição — executa bloco só se verdadeira
    if (!email || !email.includes("@")) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid input" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const db = getDb();
    // Constante local
    const users = await db<{ id: string; email: string }[]>`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT id, email FROM users WHERE lower(email) = ${email} LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Condição — executa bloco só se verdadeira
    if (!users.length) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json(FORGOT_OK);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const user = users[0];
    // Constante local
    const rawToken = randomBytes(32).toString("hex");
    // Constante local
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    // Constante local
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    // Constante local
    const url = `${APP}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // Aguarda resposta assíncrona (API, timer)
    await db`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      UPDATE password_reset_tokens SET used = true, used_at = now()
      // Instrução do fluxo — parte da lógica de negócio ou interface
      WHERE user_id = ${user.id}::uuid AND used = false
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Aguarda resposta assíncrona (API, timer)
    await db`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      INSERT INTO password_reset_tokens (user_id, token_sha256, expires_at)
      // Instrução do fluxo — parte da lógica de negócio ou interface
      VALUES (${user.id}::uuid, ${tokenHash}, ${expiresAt})
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;

    // Constante local
    const html = `<!DOCTYPE html><html lang="pt-BR"><body style="font-family:Segoe UI,Arial,sans-serif;background:#f4f6f5;padding:24px">
      // Tag HTML na interface
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
        // Tag HTML na interface
        <div style="background:#16a34a;padding:20px 28px;color:#fff;font-size:20px;font-weight:700">Controla.ai</div>
        // Tag HTML na interface
        <div style="padding:28px;color:#111827;font-size:15px;line-height:1.55">
          // Tag HTML na interface
          <h1 style="margin:0 0 12px;font-size:20px">Redefinir senha</h1>
          // Tag HTML na interface
          <p>Recebemos um pedido para alterar a senha da sua conta.</p>
          // Tag HTML na interface
          <p>Clique no botão para abrir a página de nova senha. O link vale por <strong>30 minutos</strong>.</p>
          // Tag HTML na interface
          <p style="margin:28px 0;text-align:center">
            // Tag HTML na interface
            <a href="${url}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:600">Redefinir minha senha</a>
          // Tag HTML na interface
          </p>
          // Tag HTML na interface
          <p style="color:#6b7280;font-size:12px">Se você não pediu isso, ignore este e-mail.</p>
        // Tag HTML na interface
        </div>
      // Tag HTML na interface
      </div></body></html>`;

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
      await transport.sendMail({
        // Instrução do fluxo — parte da lógica de negócio ou interface
        from: MAIL_FROM,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        to: user.email,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        subject: "Redefinir senha — Controla.ai",
        // Instrução do fluxo — parte da lógica de negócio ou interface
        html,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        text: "Redefinir senha Controla.ai — use o botão no e-mail.",
        // Instrução do fluxo — parte da lógica de negócio ou interface
        priority: "high",
      });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      transport.close();
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({ ...FORGOT_OK, emailSent: true });
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch (mailErr) {
      // Tenta executar — erros vão para catch
      try {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        transport.close();
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      } catch {
        /* ignore */
      }
      // Registra mensagem no log do servidor/navegador (debug)
      console.error("[forgot] smtp", mailErr);
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ...FORGOT_OK,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        emailSent: false,
        // Recorta parte da lista (paginação ou limite)
        emailError: mailErr instanceof Error ? mailErr.message.slice(0, 120) : "smtp_failed",
      });
    }
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[api/auth/forgot]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({ error: "Forgot failed", detail: err instanceof Error ? err.message : String(err) });
  }
}
