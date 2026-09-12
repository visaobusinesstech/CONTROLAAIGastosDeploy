/**
 * GET /api/auth/me — imports estáticos (mesmo padrão do relay).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import postgres from "postgres";

export const config = { runtime: "nodejs", maxDuration: 10 };

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
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  return sql;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    if (!auth.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    let payload: { sub: string; email: string; tv?: number };
    try {
      payload = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string; email: string; tv?: number };
    } catch {
      res.status(401).json({ error: "Unauthorized" });
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
      }[]
    >`
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version
      FROM users WHERE id = ${payload.sub}::uuid LIMIT 1
    `;
    const user = rows[0];
    if (!user || user.is_active === false) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (payload.tv != null && user.token_version != null && payload.tv !== user.token_version) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const isActive = user.is_active == null ? true : Boolean(user.is_active);
    const accessLevel =
      user.email.trim().toLowerCase() === "admin@admin.com"
        ? "admin"
        : (user.access_level ?? "user");
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        plan: user.plan,
        createdAt: new Date(user.created_at).toISOString(),
        accessLevel,
        isActive,
      },
    });
  } catch (err) {
    console.error("[api/auth/me]", err);
    res.status(500).json({ error: "Me failed", detail: err instanceof Error ? err.message : String(err) });
  }
}
