/**
 * GET /api/auth/me — imports estáticos (mesmo padrão do relay).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Importa funções/componentes de @vercel/node
import type { VercelRequest, VercelResponse } from "@vercel/node";
// Importa de jsonwebtoken
import jwt from "jsonwebtoken";
// Importa de postgres
import postgres from "postgres";

// Exporta constante/tipo/classe pública
export const config = { runtime: "nodejs", maxDuration: 10 };

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
    if (req.method !== "GET") {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(405).json({ error: "Method not allowed" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Constante local
    const auth = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    // Condição — executa bloco só se verdadeira
    if (!auth.startsWith("Bearer ")) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Variável mutável local
    let payload: { sub: string; email: string; tv?: number };
    // Tenta executar — erros vão para catch
    try {
      // Recorta parte da lista (paginação ou limite)
      payload = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string; email: string; tv?: number };
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    } catch {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
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
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      }[]
    // Instrução do fluxo — parte da lógica de negócio ou interface
    >`
      // Instrução do fluxo — parte da lógica de negócio ou interface
      SELECT id, name, email, phone, plan, created_at, access_level, is_active, token_version
      // Instrução do fluxo — parte da lógica de negócio ou interface
      FROM users WHERE id = ${payload.sub}::uuid LIMIT 1
    // Instrução do fluxo — parte da lógica de negócio ou interface
    `;
    // Constante local
    const user = rows[0];
    // Condição — executa bloco só se verdadeira
    if (!user || user.is_active === false) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }
    // Condição — executa bloco só se verdadeira
    if (payload.tv != null && user.token_version != null && payload.tv !== user.token_version) {
      // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
      res.status(401).json({ error: "Unauthorized" });
      // Instrução do fluxo — parte da lógica de negócio ou interface
      return;
    }

    // Constante local
    const isActive = user.is_active == null ? true : Boolean(user.is_active);
    // Constante local
    const accessLevel =
      // Remove espaços no início/fim do texto
      user.email.trim().toLowerCase() === "admin@admin.com"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        ? "admin"
        // Instrução do fluxo — parte da lógica de negócio ou interface
        : (user.access_level ?? "user");
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(200).json({
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
        isActive,
      // Passo do algoritmo — executa parte da regra de negócio ou da interface
      },
    });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch (err) {
    // Registra mensagem no log do servidor/navegador (debug)
    console.error("[api/auth/me]", err);
    // Código HTTP da resposta (200=ok, 401=não autorizado, etc.)
    res.status(500).json({ error: "Me failed", detail: err instanceof Error ? err.message : String(err) });
  }
}
