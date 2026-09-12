/**
 * POST /auth/forgot → /api/auth/forgot (Vercel Node).
 * Token no Postgres + e-mail com botão (sem OTP) — rápido, sem Railway.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomBytes } from "node:crypto";
import { getSql } from "./_db";
import { sendResetLinkEmail } from "./_mail";

export const config = {
  runtime: "nodejs",
  maxDuration: 15,
};

const FORGOT_OK = {
  ok: true as const,
  message: "If the email exists, a reset link was sent.",
};

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    if (!process.env.DATABASE_URL?.trim()) {
      res.status(503).json({ error: "DATABASE_URL não configurado na Vercel." });
      return;
    }
    if (!process.env.SMTP_PASS?.trim()) {
      res.status(503).json({ error: "SMTP_PASS não configurado na Vercel." });
      return;
    }

    const db = getSql();
    const users = await db<{ id: string; email: string }[]>`
      SELECT id, email FROM users WHERE lower(email) = ${email} LIMIT 1
    `;
    if (!users.length) {
      res.status(200).json(FORGOT_OK);
      return;
    }
    const user = users[0];
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(rawToken);
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
      console.error("[api/auth/forgot] mail failed:", mail.error, "ms=", mail.ms);
      res.status(200).json({ ...FORGOT_OK, emailSent: false, emailError: mail.error ?? "smtp_failed" });
      return;
    }
    console.info("[api/auth/forgot] sent in", mail.ms, "ms");
    res.status(200).json({ ...FORGOT_OK, emailSent: true });
  } catch (err) {
    console.error("[api/auth/forgot]", err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: "Forgot failed", detail: msg.slice(0, 160) });
  }
}
