/**
 * POST /auth/reset → /api/auth/reset
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";

export const config = { runtime: "nodejs", maxDuration: 15 };

function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

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

    const bcryptMod = await import("bcryptjs");
    const bcrypt = (bcryptMod as { default?: typeof bcryptMod }).default ?? bcryptMod;
    const { getSql } = await import("./_db");

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token || password.length < 6) {
      json(res, 400, { error: "Invalid input" });
      return;
    }

    const db = await getSql();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await db<{ id: string; user_id: string; used: boolean; expires_at: Date }[]>`
      SELECT id, user_id, used, expires_at
      FROM password_reset_tokens
      WHERE token_sha256 = ${tokenHash}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      json(res, 400, { error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db`
      UPDATE users
      SET password_hash = ${passwordHash},
          token_version = coalesce(token_version, 0) + 1
      WHERE id = ${row.user_id}::uuid
    `;
    await db`
      UPDATE password_reset_tokens
      SET used = true, used_at = now()
      WHERE id = ${row.id}::uuid
    `;

    json(res, 200, { ok: true, message: "Password updated" });
  } catch (err) {
    console.error("[api/auth/reset]", err);
    const msg = err instanceof Error ? err.message : String(err);
    json(res, 500, { error: "Reset failed", detail: msg.slice(0, 240) });
  }
}
