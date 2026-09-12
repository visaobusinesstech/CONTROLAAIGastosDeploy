/**
 * GET /api/auth/ping — diagnóstico.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveDatabaseUrl, resolveJwtSecret, resolveSmtpPass } from "./_env";

export const config = { runtime: "nodejs" };

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.status(200).json({
    ok: true,
    hasDatabaseUrl: Boolean(resolveDatabaseUrl()),
    hasSmtpPass: Boolean(resolveSmtpPass()),
    hasJwt: Boolean(resolveJwtSecret()),
    fromEnv: {
      database: Boolean(process.env.DATABASE_URL?.trim()),
      smtp: Boolean(process.env.SMTP_PASS?.trim()),
      jwt: Boolean(process.env.JWT_SECRET?.trim()),
    },
  });
}
