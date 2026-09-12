/**
 * Cliente Redis (Railway) — cache/sessões opcional.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Produção: REDIS_URL com redis.railway.internal (rede privada).
 * Local: use REDIS_PUBLIC_URL se o Railway publicar proxy; senão o ping falha sem derrubar a API.
 */
import { Redis } from "ioredis"; // ioredis v6 — tipos nativos (não usar @types/ioredis)

let client: Redis | null = null;
let lastOk: boolean | null = null;

/** Monta URL a partir de REDIS_URL / REDIS_PUBLIC_URL / REDIS_PASSWORD. */
export function resolveRedisUrl(): string | null {
  const publicUrl = process.env.REDIS_PUBLIC_URL?.trim();
  if (publicUrl) return publicUrl;

  const url = process.env.REDIS_URL?.trim();
  if (url) return url;

  const password = process.env.REDIS_PASSWORD?.trim();
  if (password) {
    return `redis://default:${encodeURIComponent(password)}@redis.railway.internal:6379`;
  }
  return null;
}

/** true se o host só existe na rede privada Railway (PC local não alcança). */
export function isRailwayInternalRedis(url: string): boolean {
  try {
    return /railway\.internal/i.test(new URL(url).hostname);
  } catch {
    return /railway\.internal/i.test(url);
  }
}

/** Indica se estamos rodando no runtime Railway. */
function onRailway(): boolean {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_SERVICE_NAME ||
      process.env.RAILWAY_PROJECT_ID,
  );
}

/** Singleton ioredis — lazy; null se não configurado ou host interno fora do Railway. */
export function getRedis(): Redis | null {
  if (client) return client;
  const url = resolveRedisUrl();
  if (!url) return null;

  if (isRailwayInternalRedis(url) && !onRailway() && !process.env.REDIS_PUBLIC_URL?.trim()) {
    console.warn(
      "[redis] REDIS_URL aponta para redis.railway.internal — inacessível fora do Railway. " +
        "Defina REDIS_PUBLIC_URL para testar local, ou ignore (API sobe sem Redis).",
    );
    return null;
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 8_000,
  });

  client.on("error", (err: Error) => {
    console.error("[redis] erro:", err.message);
    lastOk = false;
  });

  return client;
}

/** Ping Redis para /health — nunca lança. */
export async function redisHealthCheck(): Promise<{ configured: boolean; ok: boolean; host: string | null }> {
  const url = resolveRedisUrl();
  if (!url) return { configured: false, ok: false, host: null };

  let host: string | null = null;
  try {
    host = new URL(url).host;
  } catch {
    host = "invalid";
  }

  const redis = getRedis();
  if (!redis) return { configured: true, ok: false, host };

  try {
    if (redis.status !== "ready") await redis.connect();
    const pong = await redis.ping();
    lastOk = pong === "PONG";
    return { configured: true, ok: Boolean(lastOk), host };
  } catch (err) {
    lastOk = false;
    console.warn("[redis] ping falhou:", err instanceof Error ? err.message : err);
    return { configured: true, ok: false, host };
  }
}

export function redisLastOk(): boolean | null {
  return lastOk;
}
