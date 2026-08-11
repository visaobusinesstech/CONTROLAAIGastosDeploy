/**
 * Proxy Edge — encaminha tráfego do frontend para o backend (Railway).
 * Rotas: /auth/*, /api/*, /health → via rewrites em vercel.json
 */
export const config = {
  runtime: "edge",
};

function backendBase(): string {
  const raw = (process.env.BACKEND_URL ?? process.env.VITE_API_URL ?? "").trim();
  const invalid = /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app/i;
  if (raw && !invalid.test(raw)) return raw.replace(/\/+$/, "");
  return "https://controlaaigastosdeploy-production.up.railway.app";
}

export default async function handler(request: Request): Promise<Response> {
  const backend = backendBase();

  const incoming = new URL(request.url);
  const prefix = "/api/backend-proxy";
  const proxiedPath = incoming.pathname.startsWith(prefix)
    ? incoming.pathname.slice(prefix.length) || "/"
    : "/";
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
