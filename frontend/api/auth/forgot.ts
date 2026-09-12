/**
 * POST /auth/forgot → /api/auth/forgot
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomBytes } from "node:crypto";

export const config = { runtime: "nodejs", maxDuration: 15 };

function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

const FORGOT_OK = { ok: true as const, message: "If the email exists, a reset link was sent." };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    if (!process.env.DATABASE_URL?.trim()) {
      json(res, 503, { error: "DATABASE_URL não configurado na Vercel." });
      return;
    }
    if (!process.env.SMTP_PASS?.trim()) {
      json(res, 503, { error: "SMTP_PASS não configurado na Vercel." });
      return;
    }

    const { getSql } = await import("./_db");
    const { sendResetLinkEmail } = await import("./_mail");

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      json(res, 400, { error: "Invalid input" });
      return;
    }

    const db = await getSql();
    const users = await db<{ id: string; email: string }[]>`
      SELECT id, email FROM users WHERE lower(email) = ${email} LIMIT 1
    `;
    if (!users.length) {
      json(res, 200, FORGOT_OK);
      return;
    }
    const user = users[0];
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db`
      UPDATE password_reset_tokens
      SET used = true, used_at = now()
      WHERE user_id = ${user.id}::uuid AND used = false
    `;
    await db`
      INSERT INTO password_reset_tokens (user_id, token_sha256, expires_at)
      VALUES (${user.id}::uuid, ${tokenHash}, ${expiresAt})
    `;

    const mail = await sendResetLinkEmail(user.email, rawToken);
    if (!mail.sent) {
      json(res, 200, { ...FORGOT_OK, emailSent: false, emailError: mail.error ?? "smtp_failed" });
      return;
    }
    json(res, 200, { ...FORGOT_OK, emailSent: true });
  } catch (err) {
    console.error("[api/auth/forgot]", err);
    const msg = err instanceof Error ? err.message : String(err);
    json(res, 500, { error: "Forgot failed", detail: msg.slice(0, 240) });
  }
}
