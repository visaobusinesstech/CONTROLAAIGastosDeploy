/**
 * Proxy Edge — encaminha /api e auth restantes ao Railway.
 * login/me/forgot/reset ficam nas funções Node Vercel (Postgres direto).
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 */

/** Backend Railway atual (CONTROLAAi-backend). Override via BACKEND_URL no Vercel. */
// Constante local
const DEFAULT_BACKEND_URL = "https://controlaai-backend-production.up.railway.app";

// Constante local
const INVALID_BACKEND =
  // Instrução do fluxo — parte da lógica de negócio ou interface
  /controlaai-frontend\.vercel\.app|controlaai-gastos-deploy\.vercel\.app|controlaaigastosdeploy\.up\.railway\.app|backend-production-c328\.up\.railway\.app|localhost|127\.0\.0\.1/i;

// Declara função auxiliar interna
function resolveBackendUrl(): string {
  // Constante local
  const raw = (process.env.BACKEND_URL ?? process.env.VITE_API_URL ?? "")
    // Remove espaços no início/fim do texto
    .trim()
    // Instrução do fluxo — parte da lógica de negócio ou interface
    .replace(/\/+$/, "");
  // Env antiga/morta ou vazia → sempre o Railway novo (WhatsApp precisa disso)
  if (!raw || INVALID_BACKEND.test(raw)) return DEFAULT_BACKEND_URL;
  // Constante local
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  // Se alguém setou URL diferente mas o default é o serviço oficial, preferir o oficial
  if (!normalized.includes("controlaai-backend-production.up.railway.app")) {
    // Retorna valor ou JSX para quem chamou
    return DEFAULT_BACKEND_URL;
  }
  // Retorna valor ou JSX para quem chamou
  return normalized;
}

// Exporta constante/tipo/classe pública
export const config = {
  // Instrução do fluxo — parte da lógica de negócio ou interface
  matcher: [
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "/auth/register",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "/auth/legal",
    // Instrução do fluxo — parte da lógica de negócio ou interface
    "/health",
    // settings → rewrite vercel.json → /api/user-settings (não proxy Railway)
    "/api/((?!backend-proxy|relay|auth|auth-2fa|user-settings|settings).*)",
  // Instrução do fluxo — parte da lógica de negócio ou interface
  ],
};

// Exporta como padrão do módulo (import default)
export default async function middleware(request: Request): Promise<Response> {
  // Constante local
  const backend = resolveBackendUrl();
  // Constante local
  const incoming = new URL(request.url);
  // Constante local
  const target = `${backend}${incoming.pathname}${incoming.search}`;

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
