/**
 * Proxy Edge Vercel: /api/backend-proxy/[...path] — ponte para o backend Railway
 *
 * O que faz: recebe requisições do navegador (via rewrites em vercel.json) e repassa
 * integralmente para a API Fastify na Railway — /api/*, /auth/* restantes e /health.
 *
 * Quando o usuário usa: em todo clique no painel que chama finanças, WhatsApp status,
 * metas, Stripe etc. — tudo que NÃO é login/2FA/settings locais.
 *
 * Por que roda na Vercel Edge: o site e a API compartilham o mesmo domínio (sem CORS);
 * BACKEND_URL no painel Vercel aponta para controlaai-backend-production.up.railway.app.
 *
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
export const config = {
  runtime: "edge",
};

/** Backend Railway — override via BACKEND_URL no painel Vercel. */
const DEFAULT_BACKEND_URL = "https://controlaaigastosdeploy-production.up.railway.app";

/** URLs inválidas que não devem ser usadas como destino do proxy. */
const INVALID_BACKEND =
  /\.vercel\.app|localhost|127\.0\.0\.1/i;

function backendBase(): string {
  const raw = (process.env.BACKEND_URL ?? process.env.VITE_API_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!raw || INVALID_BACKEND.test(raw)) return DEFAULT_BACKEND_URL;
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  return normalized;
}

export default async function handler(request: Request): Promise<Response> {
  const backend = backendBase();
  const incoming = new URL(request.url);
  const prefix = "/api/backend-proxy";
  let proxiedPath = incoming.pathname;
  if (proxiedPath.startsWith(prefix)) {
    proxiedPath = proxiedPath.slice(prefix.length) || "/";
  }
  const target = `${backend}${proxiedPath}${incoming.search}`;
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
