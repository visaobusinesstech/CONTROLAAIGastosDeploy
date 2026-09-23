/**
 * Rota Vercel: GET /api/auth/ping — diagnóstico de saúde das funções auth
 *
 * Papel no sistema: Serverless Vercel — roda na edge com acesso a Postgres/SMTP via variáveis de ambiente.
 *
 * Responsabilidade: concentra a lógica descrita no título; evite duplicar regras
 * de negócio em outros arquivos — importe daqui quando precisar reutilizar.
 *
 * Entradas/saídas: seguir tipos exportados e contratos HTTP/documentados em
 * TCC_DOCUMENTACAO.md (rotas, payloads JSON, tabelas SQL relacionadas).
 *
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
