/**
 * Proxy Edge — encaminha /api e auth restantes ao Railway.
 * login/me/forgot/reset ficam nas funções Node Vercel (Postgres direto).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Backend Railway atual (CONTROLAAi-backend). Override via BACKEND_URL no Vercel. */
const DEFAULT_BACKEND_URL = "https://controlaai-backend-production.up.railway.app";

const INVALID_BACKEND =
  /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app|controlaaigastosdeploy\.up\.railway\.app|backend-production-c328\.up\.railway\.app|localhost|127\.0\.0\.1/i;

function resolveBackendUrl(): string | null {
  const raw = (process.env.BACKEND_URL ?? process.env.VITE_API_URL ?? DEFAULT_BACKEND_URL)
    .trim()
    .replace(/\/+$/, "");
  if (!raw || INVALID_BACKEND.test(raw)) {
    // Env morta/inválida → fallback do backend novo
    if (!INVALID_BACKEND.test(DEFAULT_BACKEND_URL)) return DEFAULT_BACKEND_URL;
    return null;
  }
  if (!/^https?:\/\//i.test(raw)) return `https://${raw.replace(/^\/+/, "")}`;
  return raw;
}

export const config = {
  matcher: [
    "/auth/register",
    "/auth/legal",
    "/health",
    // settings → rewrite vercel.json → /api/user-settings (não proxy Railway)
    "/api/((?!backend-proxy|relay|auth|auth-2fa|user-settings|settings).*)",
  ],
};

export default async function middleware(request: Request): Promise<Response> {
  const backend = resolveBackendUrl();
  if (!backend) {
    return Response.json(
      {
        error:
          "BACKEND_URL não configurado no Vercel. Defina a URL pública do backend (Railway).",
      },
      { status: 503 },
    );
  }

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
      { error: "Backend offline ou BACKEND_URL incorreto." },
      { status: 502 },
    );
  }
}
