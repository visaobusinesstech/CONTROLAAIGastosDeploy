/**
 * Rota Vercel: POST /auth/2fa/disable → /api/auth-2fa-disable
 *
 * O que faz: inicia a DESATIVAÇÃO da verificação em 2 etapas (2FA). Exige login (Bearer).
 * Se o 2FA já estiver desligado, responde ok; senão gera código OTP de 6 dígitos por e-mail.
 *
 * Quando o usuário usa: em Configurações > Segurança, ao clicar em desativar 2FA.
 *
 * Por que roda na Vercel: auth/2FA ficam em serverless (frontend/api/) com Postgres direto,
 * no mesmo domínio do site — login rápido sem depender do cold start do backend Railway.
 *
 * Próximo passo: usuário confirma o código em /auth/2fa/verify (auth-2fa-verify.ts).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAndSendOtp, isTwoFactorEnabled, loadUser, verifyBearer } from "./auth/otp-shared.js";

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
    if (!(await isTwoFactorEnabled(user.id))) {
      res.status(200).json({ ok: true, twoFactorEnabled: false });
      return;
    }
    const challenge = await createAndSendOtp({
      userId: user.id,
      email: user.email,
      purpose: "disable",
    });
    res.status(200).json(challenge);
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[2fa/disable]", err);
    res.status(500).json({
      error: "Não foi possível iniciar a desativação do 2FA.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
