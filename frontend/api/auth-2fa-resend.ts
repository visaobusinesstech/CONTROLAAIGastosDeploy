/**
 * POST /auth/2fa/resend → /api/auth/2fa/resend
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa funções/componentes de ./auth/otp-shared.js
import { createAndSendOtp, getDb, loadUser, type OtpPurpose } from "./auth/otp-shared.js";

// Exporta constante/tipo/classe pública
export const config = { runtime: "nodejs", maxDuration: 15 };

// Exporta como padrão do módulo (import default)
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Tenta executar — erros vão para catch
  try {
    // Condição — executa bloco só se verdadeira
    if (req.method !== "POST") {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(405).json({ error: "Method not allowed" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    // Constante local
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    // Condição — executa bloco só se verdadeira
    if (!challengeId) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid input" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const db = getDb();
    // Constante local
    const rows = await db<{ user_id: string; purpose: string; consumed_at: Date | null }[]>`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT user_id, purpose, consumed_at FROM two_factor_challenges
      // Instrução do fluxo — parte da lógica de negócio ou interface
      WHERE id = ${challengeId}::uuid LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Constante local
    const prev = rows[0];
    // Condição — executa bloco só se verdadeira
    if (!prev || prev.consumed_at) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid or expired code" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const user = await loadUser(prev.user_id);
    // Condição — executa bloco só se verdadeira
    if (!user) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "User not found" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const challenge = await createAndSendOtp({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      userId: user.id,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      email: user.email,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      purpose: prev.purpose as OtpPurpose,
    });
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(200).json(challenge);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[2fa/resend]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      error: "Não foi possível reenviar o código.",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
