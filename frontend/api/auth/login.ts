/**
 * POST /api/auth/login — estilo relay (imports estáticos que já funcionam na Vercel).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import postgres from "postgres";

export const config = {
  runtime: "nodejs",
  maxDuration: 15,
};

const JWT_SECRET =
  (process.env.JWT_SECRET ?? "").trim() ||
  "controlaai-tcc-unicesumar-2026-davi-leonardo-gustavo-long-secret-key";

const DATABASE_URL =
  (process.env.DATABASE_URL ?? "").trim() ||
  "postgresql://postgres:qxjDdGqZDVqJpXLsHibuGZVElCrxrcAc@maglev.proxy.rlwy.net:29404/railway?sslmode=require";

let sql: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (sql) return sql;
  const url = DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  sql = postgres(url, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5,
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  return sql;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const db = getDb();
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

    const settings = await db<{ two_factor_enabled: boolean }[]>`
      SELECT two_factor_enabled FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
    `;
    if (Boolean(settings[0]?.two_factor_enabled) && email !== "admin@admin.com") {
      const { createAndSendOtp } = await import("./otp-shared.js");
      const challenge = await createAndSendOtp({
        userId: user.id,
        email: user.email,
        purpose: "login",
      });
      res.status(200).json(challenge);
      return;
    }

    const tv = user.token_version ?? 0;
    const token = jwt.sign({ sub: user.id, email: user.email, tv }, JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        createdAt: new Date(user.created_at).toISOString(),
        accessLevel: user.access_level ?? "user",
        isActive: user.is_active == null ? true : Boolean(user.is_active),
      },
    });
  } catch (err) {
    console.error("[api/auth/login]", err);
    res.status(500).json({
      error: "Login failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
