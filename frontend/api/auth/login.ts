/**
 * POST /auth/login → /api/auth/login (Vercel Node — não depende do Railway).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { getSql } from "./_db";
import { issueSession } from "./_session";

export const config = {
  runtime: "nodejs",
  maxDuration: 15,
};

type UserRow = {
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
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const db = getSql();
    const rows = await db<UserRow[]>`
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version, password_hash
      FROM users WHERE lower(email) = ${email} LIMIT 1
    `;
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (user.is_active === false) {
      res.status(403).json({ error: "Account inactive" });
      return;
    }

    // 2FA opt-in: se ligado, o frontend ainda pode precisar do Railway para OTP —
    // login padrão (sem 2FA) emite JWT aqui.
    const settings = await db<{ two_factor_enabled: boolean }[]>`
      SELECT two_factor_enabled FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
    `;
    const twoFa = Boolean(settings[0]?.two_factor_enabled);
    if (twoFa && email !== "admin@admin.com") {
      res.status(503).json({
        error: "Two-factor login requires backend online. Disable 2FA or wait for Railway.",
      });
      return;
    }

    res.status(200).json(issueSession(user));
  } catch (err) {
    console.error("[api/auth/login]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (/DATABASE_URL|missing/i.test(msg)) {
      res.status(503).json({ error: "DATABASE_URL não configurado na Vercel." });
      return;
    }
    res.status(503).json({ error: "Database unavailable" });
  }
}
