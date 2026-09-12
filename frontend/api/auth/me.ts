/**
 * GET /auth/me → /api/auth/me
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs", maxDuration: 10 };

function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "GET") {
      json(res, 405, { error: "Method not allowed" });
      return;
    }
    const { getSql } = await import("./_db");
    const { issueSession, verifyBearer } = await import("./_session");

    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    const payload = await verifyBearer(auth);
    if (!payload?.sub) {
      json(res, 401, { error: "Unauthorized" });
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
      }[]
    >`
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version
      FROM users WHERE id = ${payload.sub}::uuid LIMIT 1
    `;
    const user = rows[0];
    if (!user || user.is_active === false) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }
    if (payload.tv != null && user.token_version != null && payload.tv !== user.token_version) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }

    const session = await issueSession(user);
    json(res, 200, { user: session.user });
  } catch (err) {
    console.error("[api/auth/me]", err);
    const msg = err instanceof Error ? err.message : String(err);
    json(res, 500, { error: "Me failed", detail: msg.slice(0, 240) });
  }
}
