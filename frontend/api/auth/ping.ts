/**
 * GET /api/auth/ping — diagnóstico sem imports (isola crash de módulo).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";

// Exporta constante/tipo/classe pública
export const config = { runtime: "nodejs" };

// Exporta como padrão do módulo (import default)
export default function handler(_req: VercelRequest, res: VercelResponse): void {
  // Tenta executar — erros vão para catch
  try {
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(200).json({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      ok: true,
      // Instrução do fluxo — parte da lógica de negócio ou interface
      build: "8.28",
      // Remove espaços no início/fim do texto
      hasDatabaseUrlEnv: Boolean(process.env.DATABASE_URL?.trim()),
      // Remove espaços no início/fim do texto
      hasSmtpPassEnv: Boolean(process.env.SMTP_PASS?.trim()),
      // Remove espaços no início/fim do texto
      hasJwtEnv: Boolean(process.env.JWT_SECRET?.trim()),
    });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({ error: String(err) });
  }
}
