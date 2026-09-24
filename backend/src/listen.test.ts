import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { listenOnRailwayPorts, resolveListenPorts } from "./listen.js";

describe("resolveListenPorts", () => {
  it("inclui PORT e as portas que o proxy da Railway costuma usar", () => {
    const ports = resolveListenPorts({ PORT: "3333" });
    assert.deepEqual(ports, [3333, 8080, 3000]);
  });

  it("aceita PORT fora da lista padrão", () => {
    const ports = resolveListenPorts({ PORT: "4000", LISTEN_PORTS: "3333" });
    assert.deepEqual(ports, [4000, 3333]);
  });

  it("ignora porta inválida e cai em 3333", () => {
    const ports = resolveListenPorts({ PORT: "0", LISTEN_PORTS: "nope,8080" });
    assert.deepEqual(ports, [3333, 8080]);
  });
});

describe("listenOnRailwayPorts", () => {
  it("responde /health na porta principal", async () => {
    const app = Fastify({ logger: false });
    app.get("/health", async () => ({ ok: true, status: "live" }));
    try {
      const [port] = await listenOnRailwayPorts(app, [0]);
      assert.ok(port && port > 0);
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      const body = (await res.json()) as { ok: boolean };
      assert.equal(res.status, 200);
      assert.equal(body.ok, true);
    } finally {
      await app.close();
    }
  });
});
