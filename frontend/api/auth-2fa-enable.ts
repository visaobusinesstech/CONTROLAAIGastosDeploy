/**
 * POST /auth/2fa/enable → /api/auth/2fa/enable
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa funções/componentes de ./auth/otp-shared.js
import { createAndSendOtp, isTwoFactorEnabled, loadUser, verifyBearer } from "./auth/otp-shared.js";

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
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : undefined;
    // Constante local
    const payload = verifyBearer(auth);
    // Condição — executa bloco só se verdadeira
    if (!payload?.sub) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const user = await loadUser(payload.sub);
    // Condição — executa bloco só se verdadeira
    if (!user) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (await isTwoFactorEnabled(user.id)) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({ ok: true, twoFactorEnabled: true });
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
      purpose: "enable",
    });
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(200).json(challenge);
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[2fa/enable]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      error: "Não foi possível iniciar a verificação em 2 etapas.",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
