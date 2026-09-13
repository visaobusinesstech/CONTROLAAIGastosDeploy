/**
 * Cliente Redis (Railway) — cache/sessões opcional.
 * Doc TCC: TCC_DOCUMENTACAO.md — atualizar ao modificar
 *
 * Produção: REDIS_URL com redis.railway.internal (rede privada).
 * Local: use REDIS_PUBLIC_URL se o Railway publicar proxy; senão o ping falha sem derrubar a API.
 */
import { Redis } from "ioredis"; // ioredis v6 — tipos nativos (não usar @types/ioredis)

let client: Redis | null = null; // Variável que pode mudar de valor conforme o programa roda
let lastOk: boolean | null = null; // Variável que pode mudar de valor conforme o programa roda

/** Monta URL a partir de REDIS_URL / REDIS_PUBLIC_URL / REDIS_PASSWORD. */
export function resolveRedisUrl(): string | null { // Função exportada — pode ser usada em outros arquivos
  const publicUrl = process.env.REDIS_PUBLIC_URL?.trim(); // Guarda um valor que não muda durante a execução deste trecho
  if (publicUrl) return publicUrl; // Só executa o bloco abaixo se esta condição for verdadeira

  const url = process.env.REDIS_URL?.trim(); // Guarda um valor que não muda durante a execução deste trecho
  if (url) return url; // Só executa o bloco abaixo se esta condição for verdadeira

  const password = process.env.REDIS_PASSWORD?.trim(); // Guarda um valor que não muda durante a execução deste trecho
  if (password) { // Só executa o bloco abaixo se esta condição for verdadeira
    return `redis://default:${encodeURIComponent(password)}@redis.railway.internal:6379`;
  } // Fecha um bloco de código (if, função, objeto, etc.)
  return null; // Informa que nada foi encontrado ou deu errado
} // Fecha um bloco de código (if, função, objeto, etc.)

/** true se o host só existe na rede privada Railway (PC local não alcança). */
export function isRailwayInternalRedis(url: string): boolean { // Função exportada — pode ser usada em outros arquivos
  try { // Tenta executar código que pode falhar
    return /railway\.internal/i.test(new URL(url).hostname); // Devolve um valor e encerra a função aqui
  } catch { // Fecha bloco iniciado anteriormente
    return /railway\.internal/i.test(url); // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Indica se estamos rodando no runtime Railway. */
function onRailway(): boolean { // Bloco de código reutilizável com um nome
  return Boolean( // Devolve um valor e encerra a função aqui
    process.env.RAILWAY_ENVIRONMENT || // Instrução do programa — parte da lógica deste arquivo
      process.env.RAILWAY_SERVICE_NAME || // Instrução do programa — parte da lógica deste arquivo
      process.env.RAILWAY_PROJECT_ID, // Instrução do programa — parte da lógica deste arquivo
  ); // Fecha parêntese e encerra instrução
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Singleton ioredis — lazy; null se não configurado ou host interno fora do Railway. */
export function getRedis(): Redis | null { // Função exportada — pode ser usada em outros arquivos
  if (client) return client; // Só executa o bloco abaixo se esta condição for verdadeira
  const url = resolveRedisUrl(); // Guarda um valor que não muda durante a execução deste trecho
  if (!url) return null; // Só executa o bloco abaixo se esta condição for verdadeira

  if (isRailwayInternalRedis(url) && !onRailway() && !process.env.REDIS_PUBLIC_URL?.trim()) { // Só executa o bloco abaixo se esta condição for verdadeira
    console.warn( // Escreve mensagem no terminal para diagnóstico
      "[redis] REDIS_URL aponta para redis.railway.internal — inacessível fora do Railway. " + // Instrução do programa — parte da lógica deste arquivo
        "Defina REDIS_PUBLIC_URL para testar local, ou ignore (API sobe sem Redis).", // Instrução do programa — parte da lógica deste arquivo
    ); // Fecha parêntese e encerra instrução
    return null; // Informa que nada foi encontrado ou deu errado
  } // Fecha um bloco de código (if, função, objeto, etc.)

  client = new Redis(url, { // Atribui ou calcula um valor para usar adiante
    maxRetriesPerRequest: 1, // Instrução do programa — parte da lógica deste arquivo
    enableReadyCheck: true, // Instrução do programa — parte da lógica deste arquivo
    lazyConnect: true, // Instrução do programa — parte da lógica deste arquivo
    connectTimeout: 8_000, // Instrução do programa — parte da lógica deste arquivo
  }); // Fecha chamada de função ou método

  client.on("error", (err: Error) => { // Atribui ou calcula um valor para usar adiante
    console.error("[redis] erro:", err.message); // Escreve mensagem no terminal para diagnóstico
    lastOk = false; // Atribui ou calcula um valor para usar adiante
  }); // Fecha chamada de função ou método

  return client; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)

/** Ping Redis para /health — nunca lança. */
export async function redisHealthCheck(): Promise<{ configured: boolean; ok: boolean; host: string | null }> { // Função assíncrona exportada — outros módulos podem chamar
  const url = resolveRedisUrl(); // Guarda um valor que não muda durante a execução deste trecho
  if (!url) return { configured: false, ok: false, host: null }; // Só executa o bloco abaixo se esta condição for verdadeira

  let host: string | null = null; // Variável que pode mudar de valor conforme o programa roda
  try { // Tenta executar código que pode falhar
    host = new URL(url).host; // Atribui ou calcula um valor para usar adiante
  } catch { // Fecha bloco iniciado anteriormente
    host = "invalid"; // Atribui ou calcula um valor para usar adiante
  } // Fecha um bloco de código (if, função, objeto, etc.)

  const redis = getRedis(); // Guarda um valor que não muda durante a execução deste trecho
  if (!redis) return { configured: true, ok: false, host }; // Só executa o bloco abaixo se esta condição for verdadeira

  try { // Tenta executar código que pode falhar
    if (redis.status !== "ready") await redis.connect(); // Só executa o bloco abaixo se esta condição for verdadeira
    const pong = await redis.ping(); // Guarda um valor que não muda durante a execução deste trecho
    lastOk = pong === "PONG"; // Instrução do programa — parte da lógica deste arquivo
    return { configured: true, ok: Boolean(lastOk), host }; // Devolve um valor e encerra a função aqui
  } catch (err) { // Fecha bloco iniciado anteriormente
    lastOk = false; // Atribui ou calcula um valor para usar adiante
    console.warn("[redis] ping falhou:", err instanceof Error ? err.message : err); // Escreve mensagem no terminal para diagnóstico
    return { configured: true, ok: false, host }; // Devolve um valor e encerra a função aqui
  } // Fecha um bloco de código (if, função, objeto, etc.)
} // Fecha um bloco de código (if, função, objeto, etc.)

export function redisLastOk(): boolean | null { // Função exportada — pode ser usada em outros arquivos
  return lastOk; // Devolve um valor e encerra a função aqui
} // Fecha um bloco de código (if, função, objeto, etc.)
