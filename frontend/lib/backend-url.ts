/**
 * URL pública do backend Railway usada pelo middleware e pelo proxy da Vercel.
 * O host antigo controlaai-backend-production não existe mais (404).
 */
export const DEFAULT_BACKEND_URL = "https://controlaaigastosdeploy-production.up.railway.app";

const DEAD_BACKEND =
  /controlaai-backend-production\.up\.railway\.app|backend-production-c328\.up\.railway\.app|localhost|127\.0\.0\.1|\.vercel\.app/i;

export function resolveBackendUrl(env: {
  BACKEND_URL?: string;
  VITE_API_URL?: string;
} = {}): string {
  const raw = (env.BACKEND_URL ?? env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw || DEAD_BACKEND.test(raw)) return DEFAULT_BACKEND_URL;
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
  try {
    const host = new URL(normalized).hostname;
    if (DEAD_BACKEND.test(host) || DEAD_BACKEND.test(normalized)) return DEFAULT_BACKEND_URL;
    if (!host.endsWith(".railway.app")) return DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
  return normalized;
}
