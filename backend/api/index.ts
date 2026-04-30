import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "../src/modules/auth.js";
import { registerApiRoutes } from "../src/modules/api-routes.js";

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

let fastifyApp: any = null;

async function createApp() {
  if (fastifyApp) return fastifyApp;

  console.log("=== Initializing Fastify ===");
  const app = Fastify({ logger: true });

  console.log("→ Registering CORS");
  await app.register(cors, {
    origin: [frontendUrl, "http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  });

  console.log("→ Registering routes");
  app.get("/health", async () => {
    console.log("✅ Health check requested");
    return { ok: true };
  });

  await registerAuthRoutes(app);
  await registerApiRoutes(app);

  console.log("✅ Fastify initialized!");
  fastifyApp = app;
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    console.log(`→ Incoming request: ${req.method} ${req.url}`);
    const app = await createApp();
    await app.ready();

    const response = await app.inject({
      method: req.method,
      url: req.url,
      headers: req.headers,
      payload: req.body,
      remoteAddress: req.socket?.remoteAddress,
    });

    console.log(`← Response status: ${response.statusCode}`);
    
    res.statusCode = response.statusCode;
    const headers = response.headers;
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        const value = headers[key];
        if (typeof value === "string") {
          res.setHeader(key, value);
        } else if (Array.isArray(value)) {
          value.forEach(v => res.setHeader(key, v));
        }
      }
    }
    res.end(response.body);
  } catch (error) {
    console.error("❌ Handler error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Unknown error"
    }));
  }
}
