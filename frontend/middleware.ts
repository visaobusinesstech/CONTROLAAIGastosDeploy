/**
 * Proxy Edge — encaminha /api e auth restantes ao Railway.
 * login/me/forgot/reset ficam nas funções Node Vercel (Postgres direto).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Backend Railway atual (CONTROLAAi-backend). Override via BACKEND_URL no Vercel. */
const DEFAULT_BACKEND_URL = "https://controlaai-backend-production.up.railway.app";

const INVALID_BACKEND =
  /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app|controlaaigastosdeploy\.up\.railway\.app|backend-production-c328\.up\.railway\.app|localhost|127\.0\.0\.1/i;

function resolveBackendUrl(): string {
  const raw = (process.env.BACKEND_URL ?? process.env.VITE_API_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  // Env antiga/morta ou vazia → sempre o Railway novo (WhatsApp precisa disso)
  if (!raw || INVALID_BACKEND.test(raw)) return DEFAULT_BACKEND_URL;
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  // Se alguém setou URL diferente mas o default é o serviço oficial, preferir o oficial
  if (!normalized.includes("controlaai-backend-production.up.railway.app")) {
    return DEFAULT_BACKEND_URL;
  }
  return normalized;
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
