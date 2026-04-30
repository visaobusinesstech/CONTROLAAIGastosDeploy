import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "../src/modules/auth.js";
import { registerApiRoutes } from "../src/modules/api-routes.js";

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

let app: any = null;

async function getApp() {
  if (!app) {
    app = Fastify({ logger: true });

    await app.register(cors, {
      origin: [frontendUrl, "http://localhost:5173", "http://localhost:5174"],
      credentials: true,
    });

    app.get("/health", async () => ({ ok: true }));

    await registerAuthRoutes(app);
    await registerApiRoutes(app);
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const fastify = await getApp();
  await fastify.ready();
  fastify.server.emit("request", req, res);
}
