/**
 * GET /api/auth/ping — diagnóstico (sem DB).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    ok: true,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasSmtpPass: Boolean(process.env.SMTP_PASS?.trim()),
    hasJwt: Boolean(process.env.JWT_SECRET?.trim()),
  });
}
