/**
 * Bind da API no Railway.
 * O proxy público só entrega tráfego na porta configurada no domínio.
 * Se essa porta divergir de PORT, a URL responde 502 "Application failed to respond"
 * mesmo com o processo no ar. Por isso escutamos PORT e as portas usuais.
 */
import http from "node:http";
import type { FastifyInstance } from "fastify";

const FALLBACK_PORTS = [3333, 8080, 3000];

export function resolveListenPorts(
  env: Record<string, string | undefined> = process.env,
): number[] {
  const primary = Number(env.PORT);
  const extras = (env.LISTEN_PORTS ?? FALLBACK_PORTS.join(","))
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((port) => Number.isInteger(port) && port > 0 && port < 65536);
  const ports = [Number.isInteger(primary) && primary > 0 ? primary : 3333, ...extras];
  return [...new Set(ports)];
}

function bind(server: http.Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

/** Sobe o Fastify em 0.0.0.0 e replicas nas portas extras / IPv6. */
export async function listenOnRailwayPorts(
  app: FastifyInstance,
  ports: number[] = resolveListenPorts(),
): Promise<number[]> {
  if (ports.length === 0) {
    throw new Error("Nenhuma porta para escutar");
  }
  const [primary, ...rest] = ports;
  const extras: http.Server[] = [];
  app.addHook("onClose", async () => {
    await Promise.all(
      extras.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.close(() => resolve());
          }),
      ),
    );
  });
  await app.listen({ port: primary!, host: "0.0.0.0" });
  const address = app.server.address();
  const actualPrimary = typeof address === "object" && address ? address.port : primary!;
  const bound = new Set<number>([actualPrimary]);

  const delegate = (port: number, host: string) => {
    const server = http.createServer((req, res) => {
      app.server.emit("request", req, res);
    });
    extras.push(server);
    return bind(server, port, host);
  };

  try {
    await delegate(actualPrimary, "::");
  } catch {
    // Sem IPv6 no container: o bind IPv4 em 0.0.0.0 continua valendo.
  }

  for (const port of rest) {
    try {
      await delegate(port, "0.0.0.0");
      bound.add(port);
      try {
        await delegate(port, "::");
      } catch {
        // IPv4 dessa porta já atende o proxy.
      }
    } catch (err) {
      app.log.warn({ err, port }, "porta extra indisponível");
    }
  }

  return [...bound];
}
