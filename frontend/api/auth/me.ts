/**
 * GET /auth/me → /api/auth/me (Vercel Node).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSql } from "./_db";
import { issueSession, verifyBearer } from "./_session";

export const config = {
  runtime: "nodejs",
  maxDuration: 10,
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    const payload = verifyBearer(auth);
    if (!payload?.sub) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const db = getSql();
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

    const session = issueSession(user);
    res.status(200).json({ user: session.user });
  } catch (err) {
    console.error("[api/auth/me]", err);
    res.status(503).json({ error: "Database unavailable" });
  }
}
