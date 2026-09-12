/**
 * POST /auth/2fa/enable → /api/auth/2fa/enable
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAndSendOtp, isTwoFactorEnabled, loadUser, verifyBearer } from "../otp-shared";

export const config = { runtime: "nodejs", maxDuration: 15 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    const payload = verifyBearer(auth);
    if (!payload?.sub) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await loadUser(payload.sub);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (await isTwoFactorEnabled(user.id)) {
      res.status(200).json({ ok: true, twoFactorEnabled: true });
      return;
    }
    const challenge = await createAndSendOtp({
      userId: user.id,
      email: user.email,
      purpose: "enable",
    });
    res.status(200).json(challenge);
  } catch (err) {
    console.error("[2fa/enable]", err);
    res.status(500).json({
      error: "Não foi possível iniciar a verificação em 2 etapas.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
