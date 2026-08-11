/**
 * Handler serverless Vercel — expõe API Fastify sem WhatsApp — Controla.ai
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
import "dotenv/config"; // Carrega variáveis de ambiente do .env
import Fastify from "fastify"; // Framework HTTP usado como servidor REST
import cors from "@fastify/cors"; // Plugin CORS para o frontend React acessar a API
import { sql } from "drizzle-orm"; // SQL bruto para health check SELECT 1
import { db } from "../src/db/index.js"; // Cliente Drizzle PostgreSQL
import { registerAuthRoutes } from "../src/auth.js"; // Rotas /auth/register, /auth/login, /auth/me
import { registerApiRoutes } from "../src/api-routes.js"; // CRUD transações, categorias, dashboard
import { registerExtendedRoutes } from "../src/extended-routes.js"; // Chat IA, KPIs, metas, imports

const frontendUrl = (process.env.FRONTEND_URL || "https://controlaai-frontend.vercel.app").replace(
  /\/+$/,
  "",
); // Origin CORS principal sem barra final

let app: ReturnType<typeof Fastify> | null = null; // Singleton Fastify — reutilizado entre invocações serverless

/** Inicializa Fastify uma vez e registra rotas + CORS (lazy singleton). */
async function init() {
  if (app) return app; // Já inicializado — retorna instância existente

  app = Fastify({ logger: true }); // Logger integrado (pino) para debug em Vercel

  await app.register(cors, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true); // Requisições sem Origin (curl, server-side) — permite
      const allowed = [
        frontendUrl,
        "http://localhost:5179",
        "http://localhost:5173",
        "https://controlaai-frontend.vercel.app",
      ]; // Origins explícitas permitidas
      if (allowed.includes(origin) || /\.vercel\.app$/i.test(origin)) {
        return cb(null, true); // Origin na lista ou subdomínio *.vercel.app
      }
      return cb(null, false); // Bloqueia origin não autorizada
    },
    credentials: true, // Permite cookies/Authorization cross-origin
  });

  app.get("/health", async () => {
    let dbOk = false; // Flag de conectividade com PostgreSQL
    try {
      await db.execute(sql`SELECT 1`); // Ping simples no banco
      dbOk = true;
    } catch {
      dbOk = false; // Banco indisponível — health ainda retorna 200 (liveness)
    }
    return { ok: true, db: dbOk, whatsapp: false }; // WhatsApp desabilitado no deploy Vercel
  });

  await registerAuthRoutes(app); // Monta rotas de autenticação JWT
  await registerApiRoutes(app); // Monta rotas CRUD principais
  await registerExtendedRoutes(app); // Monta rotas estendidas (chat, KPIs, metas)

  await app.ready(); // Finaliza registro de plugins antes de aceitar requests
  return app;
}

/** Handler exportado para Vercel — traduz req/res Node em inject() do Fastify. */
export default async function handler(req: { method?: string; url?: string; headers?: Record<string, string>; body?: unknown }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (body: string) => void }) {
  try {
    const fastify = await init(); // Garante app inicializado
    const response = await fastify.inject({
      method: (req.method ?? "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE", // Método HTTP da requisição Vercel
      url: req.url ?? "/", // Path solicitado
      headers: req.headers ?? {}, // Headers repassados ao Fastify
      payload: req.body, // Corpo JSON (POST/PUT/PATCH)
    }); // Simula request HTTP internamente sem abrir porta

    res.statusCode = response.statusCode; // Propaga status HTTP
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === "string") res.setHeader(key, value); // Copia headers da resposta Fastify
    }
    res.end(response.body); // Envia corpo da resposta ao cliente Vercel
  } catch (e) {
    console.error("Vercel API error:", e); // Log de erro no console Vercel
    res.statusCode = 500; // Erro interno
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Server error",
        msg: e instanceof Error ? e.message : String(e), // Mensagem amigável para debug
      }),
    );
  }
}
