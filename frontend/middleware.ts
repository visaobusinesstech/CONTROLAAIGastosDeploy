/**
 * Proxy Edge — encaminha /auth, /api e /health para o backend (Railway).
 * Evita CORS: o browser chama o mesmo domínio do frontend.
 */
const PRODUCTION_BACKEND_URL = "https://controlaaigastosdeploy-production.up.railway.app";
const INVALID_BACKEND = /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app/i;

function resolveBackendUrl(): string {
  const raw = (process.env.BACKEND_URL ?? process.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
  if (raw && !INVALID_BACKEND.test(raw)) return raw;
  return PRODUCTION_BACKEND_URL;
}

export const config = {
  matcher: ["/auth/:path*", "/api/:path*", "/health"],
};

export default async function middleware(request: Request): Promise<Response> {
  const backend = resolveBackendUrl();

  const incoming = new URL(request.url);
  const target = `${backend}${incoming.pathname}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const res = await fetch(target, init);
    const outHeaders = new Headers(res.headers);
    outHeaders.delete("content-encoding");
    return new Response(res.body, { status: res.status, headers: outHeaders });
  } catch {
    return Response.json(
      { error: "Backend offline ou URL incorreta (BACKEND_URL)." },
      { status: 502 },
    );
  }
}
