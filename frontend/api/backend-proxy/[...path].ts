/**
 * Proxy Edge — encaminha tráfego do frontend para o backend (Railway).
 * Rotas: /auth/*, /api/*, /health → via rewrites em vercel.json
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */
// Exporta constante/tipo/classe pública
export const config = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  runtime: "edge",
};

/** Backend Railway atual — override via BACKEND_URL no Vercel. */
// Constante local
const DEFAULT_BACKEND_URL = "https://controlaai-backend-production.up.railway.app";

/** URLs mortas / inválidas — não usar como destino do proxy. */
// Constante local
const INVALID_BACKEND =
  // Instrução do fluxo — parte da lógica de negócio ou interface
  /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app|controlaaigastosdeploy\.up\.railway\.app|backend-production-c328\.up\.railway\.app|localhost|127\.0\.0\.1/i;

// Declara função auxiliar interna
function backendBase(): string {
  // Constante local
  const raw = (process.env.BACKEND_URL ?? process.env.VITE_API_URL ?? "")
    // Remove espaços no início/fim do texto
    .trim()
    // Instrução do fluxo — parte da lógica de negócio ou interface
    .replace(/\/+$/, "");
  // Condição — executa bloco só se verdadeira
  if (!raw || INVALID_BACKEND.test(raw)) return DEFAULT_BACKEND_URL;
  // Constante local
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  // Condição — executa bloco só se verdadeira
  if (!normalized.includes("controlaai-backend-production.up.railway.app")) {
    // Retorna valor ou JSX para quem chamou
    return DEFAULT_BACKEND_URL;
  }
  // Retorna valor ou JSX para quem chamou
  return normalized;
}

// Exporta como padrão do módulo (import default)
export default async function handler(request: Request): Promise<Response> {
  // Constante local
  const backend = backendBase();

  // Constante local
  const incoming = new URL(request.url);
  // Constante local
  const prefix = "/api/backend-proxy";
  // Constante local
  const proxiedPath = incoming.pathname.startsWith(prefix)
    // Recorta parte da lista (paginação ou limite)
    ? incoming.pathname.slice(prefix.length) || "/"
    // Instrução do fluxo — parte da lógica de negócio ou interface
    : "/";
  // Constante local
  const target = `${backend}${proxiedPath}${incoming.search}`;

  // Constante local
  const headers = new Headers(request.headers);
  // Instrução do fluxo — parte da lógica de negócio ou interface
  headers.delete("host");

  // Instrução do fluxo — parte da lógica de negócio ou interface
  const init: RequestInit = { method: request.method, headers };
  // Condição — executa bloco só se verdadeira
  if (request.method !== "GET" && request.method !== "HEAD") {
    // Instrução do fluxo — parte da lógica de negócio ou interface
    init.body = await request.text();
  }

  // Tenta executar — erros vão para catch
  try {
    // Constante local
    const res = await fetch(target, init);
    // Constante local
    const outHeaders = new Headers(res.headers);
    // Instrução do fluxo — parte da lógica de negócio ou interface
    outHeaders.delete("content-encoding");
    // Retorna valor ou JSX para quem chamou
    return new Response(res.body, { status: res.status, headers: outHeaders });
  // Passo do algoritmo — executa parte da regra de negócio ou da interface
  } catch {
    // Retorna valor ou JSX para quem chamou
    return Response.json(
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { error: "Backend offline ou BACKEND_URL incorreto." },
      // Instrução do fluxo — parte da lógica de negócio ou interface
      { status: 502 },
    // Passo do algoritmo — executa parte da regra de negócio ou da interface
    );
  }
}
