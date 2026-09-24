/**
 * Rota Vercel: POST /auth/2fa/resend → /api/auth-2fa-resend
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
import { createAndSendOtp, getDb, loadUser, type OtpPurpose } from "./otp-shared.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    if (!challengeId) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const db = getDb();
    const rows = await db<{ user_id: string; purpose: string; consumed_at: Date | null }[]>`
      SELECT user_id, purpose, consumed_at FROM two_factor_challenges
      WHERE id = ${challengeId}::uuid LIMIT 1
    `;
    const prev = rows[0];
    if (!prev || prev.consumed_at) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }
    const user = await loadUser(prev.user_id);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const challenge = await createAndSendOtp({
      userId: user.id,
      email: user.email,
      purpose: prev.purpose as OtpPurpose,
    });
    res.status(200).json(challenge);
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[2fa/resend]", err);
    res.status(500).json({
      error: "Não foi possível reenviar o código.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
