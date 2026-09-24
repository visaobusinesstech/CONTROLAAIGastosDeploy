/**
 * =============================================================================
 * MIDDLEWARE VERCEL (Edge) — ponte do site para o backend na Railway
 * =============================================================================
 *
 * O QUE É: código que a Vercel executa ANTES de certas rotas chegarem ao React
 * ou às funções serverless. Aqui ele só faz UMA coisa: encaminhar o pedido HTTP
 * para o servidor Node/Fastify que roda 24h na Railway.
 *
 * PARA QUE SERVE: o usuário abre controlaai-frontend.vercel.app e chama /api/...
 * Sem este arquivo (e sem os rewrites de vercel.json), o navegador não saberia
 * falar com a API. O middleware monta a URL do Railway e faz fetch proxy.
 *
 * O QUE NÃO PASSA POR AQUI (fica nas funções Node em frontend/api/):
 *   login, me, forgot, reset, 2FA, settings — auth rápido no mesmo domínio.
 *
 * vercel.json (mesma pasta frontend/) — NÃO aceita comentários JSON. Ele mapeia:
 *   /auth/login → api/auth/login.ts
 *   /api/*      → api/backend-proxy ou este middleware (matcher abaixo)
 *   rotas SPA   → index.html
 *
 * Variável BACKEND_URL no painel Vercel = URL pública Railway
 * (fallback: controlaaigastosdeploy-production.up.railway.app).
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 * =============================================================================
 */

import { resolveBackendUrl as resolveBackendFromEnv } from "./api/backend-url.js";

/** Decide a URL do backend: env Railway válida ou o serviço deste repositório. */
function resolveBackendUrl(): string {
  return resolveBackendFromEnv({
    BACKEND_URL: process.env.BACKEND_URL,
    VITE_API_URL: process.env.VITE_API_URL,
  });
}

/** Quais caminhos da Vercel passam por este proxy (os demais usam funções locais). */
export const config = {
  matcher: [
    "/auth/register",
    "/auth/legal",
    "/health",
    // settings → rewrite vercel.json → /api/user-settings (não proxy Railway)
    "/api/((?!backend-proxy|relay|auth|auth-2fa|user-settings|settings).*)",
  ],
};

/** Repassa método, headers e body para o Fastify na Railway. */
export default async function middleware(request: Request): Promise<Response> {
  const backend = resolveBackendUrl();
  const incoming = new URL(request.url);
  const target = `${backend}${incoming.pathname}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host"); // host deve ser o da Railway, não o da Vercel

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const res = await fetch(target, init);
    const outHeaders = new Headers(res.headers);
    outHeaders.delete("content-encoding"); // evita corpo ilegível no browser
    return new Response(res.body, { status: res.status, headers: outHeaders });
  } catch {
    return Response.json(
      { error: "Backend offline ou BACKEND_URL incorreto." },
      { status: 502 },
    );
  }
}
