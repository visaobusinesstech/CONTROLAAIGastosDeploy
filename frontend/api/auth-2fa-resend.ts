/**
 * POST /auth/2fa/resend → /api/auth/2fa/resend
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAndSendOtp, getDb, loadUser, type OtpPurpose } from "./auth/otp-shared.js";

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
    console.error("[2fa/resend]", err);
    res.status(500).json({
      error: "Não foi possível reenviar o código.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
