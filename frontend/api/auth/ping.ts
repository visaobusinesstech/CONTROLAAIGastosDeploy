/**
 * GET /api/auth/ping — diagnóstico sem imports (isola crash de módulo).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  try {
    res.status(200).json({
      ok: true,
      build: "8.28",
      hasDatabaseUrlEnv: Boolean(process.env.DATABASE_URL?.trim()),
      hasSmtpPassEnv: Boolean(process.env.SMTP_PASS?.trim()),
      hasJwtEnv: Boolean(process.env.JWT_SECRET?.trim()),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
