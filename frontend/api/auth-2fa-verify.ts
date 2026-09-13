/**
 * Rota Vercel: POST /auth/2fa/verify → /api/auth-2fa-verify
 *
 * O que faz: VALIDA o código OTP de 6 dígitos. Conforme o purpose do challenge, conclui
 * login (devolve JWT), ativa 2FA, desativa 2FA ou confirma cadastro por e-mail.
 *
 * Quando o usuário usa: após receber o código — no login com 2FA, ao ativar/desativar
 * segurança ou confirmar registro.
 *
 * Por que roda na Vercel: concentra bcrypt + JWT + Postgres na edge Node da Vercel;
 * o token gerado aqui é usado pelo React e pelo proxy para o Railway.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb, JWT_SECRET } from "./auth/otp-shared.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

const OTP_MAX_ATTEMPTS = 5;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const challengeId = typeof body.challengeId === "string" ? body.challengeId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!challengeId || code.length !== 6) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const db = getDb();
    const rows = await db<
      {
        id: string;
        user_id: string;
        purpose: string;
        code_hash: string;
        expires_at: Date;
        attempts: number;
        consumed_at: Date | null;
      }[]
    >`
      SELECT id, user_id, purpose, code_hash, expires_at, attempts, consumed_at
      FROM two_factor_challenges WHERE id = ${challengeId}::uuid LIMIT 1
    `;
    const challenge = rows[0];
    if (!challenge || challenge.consumed_at) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      res.status(429).json({ error: "Too many code attempts" });
      return;
    }
    const match = await bcrypt.compare(code, challenge.code_hash);
    if (!match) {
      // Aguarda resposta assíncrona (API, timer)
      await db`
        UPDATE two_factor_challenges SET attempts = ${challenge.attempts + 1}
        WHERE id = ${challenge.id}::uuid
      `;
      res.status(401).json({ error: "Invalid code" });
      return;
    }
    // Aguarda resposta assíncrona (API, timer)
    await db`
      UPDATE two_factor_challenges SET consumed_at = now() WHERE id = ${challenge.id}::uuid
    `;
    const users = await db<
      {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        plan: string;
        created_at: Date;
        access_level: string | null;
        is_active: boolean | null;
        token_version: number | null;
      }[]
    >`
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version
      FROM users WHERE id = ${challenge.user_id}::uuid LIMIT 1
    `;
    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    if (challenge.purpose === "login" || challenge.purpose === "register") {
      if (challenge.purpose === "register") {
        // Aguarda resposta assíncrona (API, timer)
        await db`
          UPDATE users SET email_verified = true, email_verified_at = now()
          WHERE id = ${user.id}::uuid
        `;
      }
      const accessLevel =
        // Remove espaços no início/fim do texto
        user.email.trim().toLowerCase() === "admin@admin.com"
          ? "admin"
          : (user.access_level ?? "user");
      const tv = user.token_version ?? 0;
      const token = jwt.sign({ sub: user.id, email: user.email, tv }, JWT_SECRET, { expiresIn: "7d" });
      res.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          plan: user.plan,
          // Cria objeto de data/hora
          createdAt: new Date(user.created_at).toISOString(),
          accessLevel,
          isActive: user.is_active == null ? true : Boolean(user.is_active),
        },
      });
      return;
    }
    if (challenge.purpose === "enable") {
      // Aguarda resposta assíncrona (API, timer)
      await db`
        INSERT INTO user_settings (user_id, two_factor_enabled)
        VALUES (${user.id}::uuid, true)
        ON CONFLICT (user_id) DO UPDATE
          SET two_factor_enabled = true, updated_at = now()
      `;
      // Aguarda resposta assíncrona (API, timer)
      await db`
        INSERT INTO two_factor_secrets (user_id, method)
        VALUES (${user.id}::uuid, 'email'::two_factor_method)
        ON CONFLICT (user_id) DO UPDATE
          SET method = 'email'::two_factor_method, updated_at = now()
      `;
      res.status(200).json({ ok: true, twoFactorEnabled: true });
      return;
    }
    if (challenge.purpose === "disable") {
      // Aguarda resposta assíncrona (API, timer)
      await db`
        UPDATE user_settings SET two_factor_enabled = false, updated_at = now()
        WHERE user_id = ${user.id}::uuid
      `;
      res.status(200).json({ ok: true, twoFactorEnabled: false });
      return;
    }
    res.status(400).json({ error: "Unsupported challenge purpose" });
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[2fa/verify]", err);
    res.status(500).json({
      error: "Não foi possível verificar o código.",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
