/**
 * Rota Vercel: POST /auth/reset → /api/auth/reset — nova senha
 *
 * O que faz: recebe token opaco do link de e-mail + nova senha, valida hash SHA-256
 * no Postgres, atualiza password_hash, invalida token usado e incrementa token_version.
 *
 * Quando o usuário usa: tela /reset-password após clicar no link enviado por forgot.ts.
 *
 * Por que roda na Vercel: completa o fluxo esqueci senha no mesmo ambiente serverless
 * que gerou o token; sessões antigas são revogadas via token_version.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import postgres from "postgres";

export const config = { runtime: "nodejs", maxDuration: 15 };

const DATABASE_URL =
  (process.env.DATABASE_URL ?? "").trim() ||
  "postgresql://postgres:qxjDdGqZDVqJpXLsHibuGZVElCrxrcAc@maglev.proxy.rlwy.net:29404/railway?sslmode=require";

let sql: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (sql) return sql;
  const url = DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  sql = postgres(url, {
    max: 1,
    connect_timeout: 10,
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  return sql;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {};
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!token || password.length < 6) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const db = getDb();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await db<{ id: string; user_id: string; used: boolean; expires_at: Date }[]>`
      SELECT id, user_id, used, expires_at FROM password_reset_tokens
      WHERE token_sha256 = ${tokenHash} LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    // Aguarda resposta assíncrona (API, timer)
    await db`
      UPDATE users SET password_hash = ${passwordHash},
        token_version = coalesce(token_version, 0) + 1
      WHERE id = ${row.user_id}::uuid
    `;
    // Aguarda resposta assíncrona (API, timer)
    await db`
      UPDATE password_reset_tokens SET used = true, used_at = now()
      WHERE id = ${row.id}::uuid
    `;
    res.status(200).json({ ok: true, message: "Password updated" });
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[api/auth/reset]", err);
    res.status(500).json({ error: "Reset failed", detail: err instanceof Error ? err.message : String(err) });
  }
}
