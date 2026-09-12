/**
 * GET /api/auth/diag — testa imports um a um.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs", maxDuration: 20 };

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const steps: Record<string, string> = {};
  try {
    steps.env = "ok";
    const { resolveDatabaseUrl } = await import("./env");
    steps.envImport = resolveDatabaseUrl().slice(0, 40) + "...";

    const bcryptMod = await import("bcryptjs");
    const bcrypt = (bcryptMod as { default?: typeof bcryptMod }).default ?? bcryptMod;
    steps.bcrypt = typeof bcrypt.compare === "function" ? "ok" : "missing compare";

    const jwtMod = await import("jsonwebtoken");
    const jwt = (jwtMod as { default?: typeof jwtMod }).default ?? jwtMod;
    steps.jwt = typeof jwt.sign === "function" ? "ok" : "missing sign";

    const pgMod = await import("postgres");
    steps.postgres = typeof pgMod.default === "function" ? "ok" : "no default";

    const { getSql } = await import("./db");
    const db = await getSql();
    const rows = await db<{ n: number }[]>`SELECT 1::int as n`;
    steps.dbQuery = rows[0]?.n === 1 ? "ok" : "bad";

    res.status(200).json({ ok: true, steps });
  } catch (err) {
    res.status(500).json({
      ok: false,
      steps,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.slice(0, 400) : undefined,
    });
  }
}
