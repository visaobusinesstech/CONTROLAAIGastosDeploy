/**
 * POST /api/auth/reset — imports estáticos.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa funções/componentes de node:crypto
import { createHash } from "node:crypto";
// Importa de bcryptjs
import bcrypt from "bcryptjs";
// Importa de postgres
import postgres from "postgres";

// Exporta constante/tipo/classe pública
export const config = { runtime: "nodejs", maxDuration: 15 };

// Constante local
const DATABASE_URL =
  // Remove espaços no início/fim do texto
  (process.env.DATABASE_URL ?? "").trim() ||
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "postgresql://postgres:qxjDdGqZDVqJpXLsHibuGZVElCrxrcAc@maglev.proxy.rlwy.net:29404/railway?sslmode=require";

// Variável mutável local
let sql: ReturnType<typeof postgres> | null = null;

// Declara função auxiliar interna
function getDb() {
  // Condição — executa bloco só se verdadeira
  if (sql) return sql;
  // Constante local
  const url = DATABASE_URL.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  // Instrução do fluxo — parte da lógica de negócio ou interface
  sql = postgres(url, {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    max: 1,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    connect_timeout: 10,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    prepare: false,
    // Instrução do fluxo — parte da lógica de negócio ou interface
    ssl: { rejectUnauthorized: false },
  });
  // Retorna valor ou JSX para quem chamou
  return sql;
}

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
    const token = typeof body.token === "string" ? body.token.trim() : "";
    // Constante local
    const password = typeof body.password === "string" ? body.password : "";
    // Condição — executa bloco só se verdadeira
    if (!token || password.length < 6) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid input" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const db = getDb();
    // Constante local
    const tokenHash = createHash("sha256").update(token).digest("hex");
    // Constante local
    const rows = await db<{ id: string; user_id: string; used: boolean; expires_at: Date }[]>`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT id, user_id, used, expires_at FROM password_reset_tokens
      // Instrução do fluxo — parte da lógica de negócio ou interface
      WHERE token_sha256 = ${tokenHash} LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Constante local
    const row = rows[0];
    // Condição — executa bloco só se verdadeira
    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(400).json({ error: "Invalid or expired reset token" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const passwordHash = await bcrypt.hash(password, 10);
    // Aguarda resposta assíncrona (API, timer)
    await db`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      UPDATE users SET password_hash = ${passwordHash},
        // Instrução do fluxo — parte da lógica de negócio ou interface
        token_version = coalesce(token_version, 0) + 1
      // Instrução do fluxo — parte da lógica de negócio ou interface
      WHERE id = ${row.user_id}::uuid
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Aguarda resposta assíncrona (API, timer)
    await db`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      UPDATE password_reset_tokens SET used = true, used_at = now()
      // Instrução do fluxo — parte da lógica de negócio ou interface
      WHERE id = ${row.id}::uuid
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(200).json({ ok: true, message: "Password updated" });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[api/auth/reset]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({ error: "Reset failed", detail: err instanceof Error ? err.message : String(err) });
  }
}
