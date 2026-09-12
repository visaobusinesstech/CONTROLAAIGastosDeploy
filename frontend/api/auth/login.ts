/**
 * POST /auth/login → /api/auth/login
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

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
      json(res, 503, {
        error: "DATABASE_URL não configurado na Vercel.",
        hint: "Settings → Environment Variables → DATABASE_URL (Postgres público) + Redeploy",
      });
      return;
    }

    const bcryptMod = await import("bcryptjs");
    const bcrypt = (bcryptMod as { default?: typeof bcryptMod }).default ?? bcryptMod;
    const { getSql } = await import("./_db");
    const { issueSession } = await import("./_session");

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      json(res, 400, { error: "Invalid input" });
      return;
    }

    const db = await getSql();
    const rows = await db<
      {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        plan: string;
        created_at: Date;
        access_level: string | null;
        is_active: boolean | null;
        token_version: number | null;
        password_hash: string;
      }[]
    >`
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version, password_hash
      FROM users WHERE lower(email) = ${email} LIMIT 1
    `;
    const user = rows[0];
    if (!user) {
      json(res, 401, { error: "Invalid email or password" });
      return;
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      json(res, 401, { error: "Invalid email or password" });
      return;
    }
    if (user.is_active === false) {
      json(res, 403, { error: "Account inactive" });
      return;
    }

    const settings = await db<{ two_factor_enabled: boolean }[]>`
      SELECT two_factor_enabled FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
    `;
    if (Boolean(settings[0]?.two_factor_enabled) && email !== "admin@admin.com") {
      json(res, 503, { error: "Two-factor login requires backend. Desative o 2FA ou aguarde o Railway." });
      return;
    }

    json(res, 200, await issueSession(user));
  } catch (err) {
    console.error("[api/auth/login]", err);
    const msg = err instanceof Error ? err.message : String(err);
    json(res, 500, { error: "Login failed", detail: msg.slice(0, 240) });
  }
}
