/**
 * Rota Vercel: POST /auth/2fa/enable → /api/auth-2fa-enable
 *
 * O que faz: inicia a ATIVAÇÃO da verificação em 2 etapas (2FA por e-mail). Exige login.
 * Se o 2FA já estiver ativo, responde ok; senão envia código OTP de 6 dígitos ao e-mail.
 *
 * Quando o usuário usa: em Configurações > Segurança, ao ligar a verificação em 2 etapas.
 *
 * Por que roda na Vercel: fluxo de auth sensível roda em serverless com Postgres Railway,
 * evitando expor credenciais SMTP no browser e mantendo tudo no domínio do frontend.
 *
 * Próximo passo: usuário digita o código em /auth/2fa/verify para confirmar a ativação.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAndSendOtp, isTwoFactorEnabled, loadUser, verifyBearer } from "./otp-shared.js";

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
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[2fa/enable]", err);
    res.status(500).json({
      error: "Não foi possível iniciar a verificação em 2 etapas.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
