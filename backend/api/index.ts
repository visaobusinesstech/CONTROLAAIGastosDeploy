import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "../src/modules/auth.js";
import { registerApiRoutes } from "../src/modules/api-routes.js";

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

const app = Fastify({ logger: true });

let isReady = false;

async function setup() {
  if (isReady) return;

  await app.register(cors, {
    origin: [frontendUrl, "http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  });

  app.get("/health", async () => ({ ok: true }));

  await registerAuthRoutes(app);
  await registerApiRoutes(app);

  isReady = true;
}

export default async function handler(req: any, res: any) {
  await setup();
  await app.ready();
  app.server.emit("request", req, res);
}
