/**
 * POST /auth/2fa/verify → /api/auth/2fa/verify
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa de bcryptjs
import bcrypt from "bcryptjs";
// Importa de jsonwebtoken
import jwt from "jsonwebtoken";
// Importa funções/componentes de ./auth/otp-shared.js
import { getDb, JWT_SECRET } from "./auth/otp-shared.js";

// Exporta constante/tipo/classe pública
export const config = { runtime: "nodejs", maxDuration: 15 };

// Constante local
const OTP_MAX_ATTEMPTS = 5;

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
    // Constante local
    const code = typeof body.code === "string" ? body.code.trim() : "";
    // Condição — executa bloco só se verdadeira
    if (!challengeId || code.length !== 6) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid input" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const db = getDb();
    // Constante local
    const rows = await db<
      // Instrução do fluxo — parte da lógica de negócio ou interface
      {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        id: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        user_id: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        purpose: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        code_hash: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        expires_at: Date;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        attempts: number;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        consumed_at: Date | null;
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      }[]
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT id, user_id, purpose, code_hash, expires_at, attempts, consumed_at
      // Instrução do fluxo — parte da lógica de negócio ou interface
      FROM two_factor_challenges WHERE id = ${challengeId}::uuid LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Constante local
    const challenge = rows[0];
    // Condição — executa bloco só se verdadeira
    if (!challenge || challenge.consumed_at) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid or expired code" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid or expired code" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(429).json({ error: "Too many code attempts" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const match = await bcrypt.compare(code, challenge.code_hash);
    // Condição — executa bloco só se verdadeira
    if (!match) {
      // Aguarda resposta assíncrona (API, timer)
      await db`
        // Instrução do fluxo — parte da lógica de negócio ou interface
        UPDATE two_factor_challenges SET attempts = ${challenge.attempts + 1}
        // Instrução do fluxo — parte da lógica de negócio ou interface
        WHERE id = ${challenge.id}::uuid
      // Instrução do fluxo — parte da lógica de negócio ou interface
      `;
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Invalid code" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Aguarda resposta assíncrona (API, timer)
    await db`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      UPDATE two_factor_challenges SET consumed_at = now() WHERE id = ${challenge.id}::uuid
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;

    // Constante local
    const users = await db<
      // Instrução do fluxo — parte da lógica de negócio ou interface
      {
        // Instrução do fluxo — parte da lógica de negócio ou interface
        id: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        name: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        email: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        phone: string | null;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        plan: string;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        created_at: Date;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        access_level: string | null;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        is_active: boolean | null;
        // Instrução do fluxo — parte da lógica de negócio ou interface
        token_version: number | null;
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      }[]
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version
      // Instrução do fluxo — parte da lógica de negócio ou interface
      FROM users WHERE id = ${challenge.user_id}::uuid LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Constante local
    const user = users[0];
    // Condição — executa bloco só se verdadeira
    if (!user) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "User not found" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Condição — executa bloco só se verdadeira
    if (challenge.purpose === "login" || challenge.purpose === "register") {
      // Condição — executa bloco só se verdadeira
      if (challenge.purpose === "register") {
        // Aguarda resposta assíncrona (API, timer)
        await db`
          // Instrução do fluxo — parte da lógica de negócio ou interface
          UPDATE users SET email_verified = true, email_verified_at = now()
          // Instrução do fluxo — parte da lógica de negócio ou interface
          WHERE id = ${user.id}::uuid
        // Instrução do fluxo — parte da lógica de negócio ou interface
        `;
      }
      // Constante local
      const accessLevel =
        // Remove espaços no início/fim do texto
        user.email.trim().toLowerCase() === "admin@admin.com"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          ? "admin"
          // Instrução do fluxo — parte da lógica de negócio ou interface
          : (user.access_level ?? "user");
      // Constante local
      const tv = user.token_version ?? 0;
      // Constante local
      const token = jwt.sign({ sub: user.id, email: user.email, tv }, JWT_SECRET, { expiresIn: "7d" });
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({
        // Instrução do fluxo — parte da lógica de negócio ou interface
        token,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        user: {
          // Instrução do fluxo — parte da lógica de negócio ou interface
          id: user.id,
          // Instrução do fluxo — parte da lógica de negócio ou interface
          name: user.name,
          // Instrução do fluxo — parte da lógica de negócio ou interface
          email: user.email,
          // Instrução do fluxo — parte da lógica de negócio ou interface
          phone: user.phone,
          // Instrução do fluxo — parte da lógica de negócio ou interface
          plan: user.plan,
          // Cria objeto de data/hora
          createdAt: new Date(user.created_at).toISOString(),
          // Instrução do fluxo — parte da lógica de negócio ou interface
          accessLevel,
          // Instrução do fluxo — parte da lógica de negócio ou interface
          isActive: user.is_active == null ? true : Boolean(user.is_active),
        // Passo do algoritmo — executa parte da regra de negócio ou da interface
        },
      });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Condição — executa bloco só se verdadeira
    if (challenge.purpose === "enable") {
      // Aguarda resposta assíncrona (API, timer)
      await db`
        // Instrução do fluxo — parte da lógica de negócio ou interface
        INSERT INTO user_settings (user_id, two_factor_enabled)
        // Instrução do fluxo — parte da lógica de negócio ou interface
        VALUES (${user.id}::uuid, true)
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ON CONFLICT (user_id) DO UPDATE
          // Instrução do fluxo — parte da lógica de negócio ou interface
          SET two_factor_enabled = true, updated_at = now()
      // Instrução do fluxo — parte da lógica de negócio ou interface
      `;
      // Aguarda resposta assíncrona (API, timer)
      await db`
        // Instrução do fluxo — parte da lógica de negócio ou interface
        INSERT INTO two_factor_secrets (user_id, method)
        // Instrução do fluxo — parte da lógica de negócio ou interface
        VALUES (${user.id}::uuid, 'email'::two_factor_method)
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ON CONFLICT (user_id) DO UPDATE
          // Instrução do fluxo — parte da lógica de negócio ou interface
          SET method = 'email'::two_factor_method, updated_at = now()
      // Instrução do fluxo — parte da lógica de negócio ou interface
      `;
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({ ok: true, twoFactorEnabled: true });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Condição — executa bloco só se verdadeira
    if (challenge.purpose === "disable") {
      // Aguarda resposta assíncrona (API, timer)
      await db`
        // Instrução do fluxo — parte da lógica de negócio ou interface
        UPDATE user_settings SET two_factor_enabled = false, updated_at = now()
        // Instrução do fluxo — parte da lógica de negócio ou interface
        WHERE user_id = ${user.id}::uuid
      // Instrução do fluxo — parte da lógica de negócio ou interface
      `;
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json({ ok: true, twoFactorEnabled: false });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(400).json({ error: "Unsupported challenge purpose" });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[2fa/verify]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      error: "Não foi possível verificar o código.",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
