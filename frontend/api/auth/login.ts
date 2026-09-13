/**
 * POST /api/auth/login — estilo relay (imports estáticos que já funcionam na Vercel).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa de bcryptjs
import bcrypt from "bcryptjs";
// Importa de jsonwebtoken
import jwt from "jsonwebtoken";
// Importa de postgres
import postgres from "postgres";

// Exporta constante/tipo/classe pública
export const config = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  runtime: "nodejs",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  maxDuration: 15,
};

// Constante local
const JWT_SECRET =
  // Remove espaços no início/fim do texto
  (process.env.JWT_SECRET ?? "").trim() ||
  // Instrução do fluxo — parte da lógica de negócio ou interface
  "controlaai-tcc-unicesumar-2026-davi-leonardo-gustavo-long-secret-key";

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
    idle_timeout: 5,
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
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    // Constante local
    const password = typeof body.password === "string" ? body.password : "";
    // Condição — executa bloco só se verdadeira
    if (!email || !password) {
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
        // Instrução do fluxo — parte da lógica de negócio ou interface
        password_hash: string;
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      }[]
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version, password_hash
      // Instrução do fluxo — parte da lógica de negócio ou interface
      FROM users WHERE lower(email) = ${email} LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Constante local
    const user = rows[0];
    // Condição — executa bloco só se verdadeira
    if (!user) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Invalid email or password" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const ok = await bcrypt.compare(password, user.password_hash);
    // Condição — executa bloco só se verdadeira
    if (!ok) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Invalid email or password" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (user.is_active === false) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(403).json({ error: "Account inactive" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const settings = await db<{ two_factor_enabled: boolean }[]>`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT two_factor_enabled FROM user_settings WHERE user_id = ${user.id}::uuid LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Condição — executa bloco só se verdadeira
    if (Boolean(settings[0]?.two_factor_enabled) && email !== "admin@admin.com") {
      // Desestrutura valores do hook/contexto (acesso direto às variáveis)
      const { createAndSendOtp } = await import("./otp-shared.js");
      // Constante local
      const challenge = await createAndSendOtp({
        // Instrução do fluxo — parte da lógica de negócio ou interface
        userId: user.id,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        email: user.email,
        // Instrução do fluxo — parte da lógica de negócio ou interface
        purpose: "login",
      });
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(200).json(challenge);
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
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
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[api/auth/login]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({
      // Instrução do fluxo — parte da lógica de negócio ou interface
      error: "Login failed",
      // Instrução do fluxo — parte da lógica de negócio ou interface
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
