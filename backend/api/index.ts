import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "../src/modules/auth.js";
import { registerApiRoutes } from "../src/modules/api-routes.js";

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

let app: any = null;

async function getApp() {
  if (!app) {
    console.log("Creating Fastify app...");
    app = Fastify({ logger: true });

    console.log("Registering CORS...");
    await app.register(cors, {
      origin: [frontendUrl, "http://localhost:5173", "http://localhost:5174"],
      credentials: true,
    });

    console.log("Registering routes...");
    app.get("/health", async () => ({ ok: true }));
    await registerAuthRoutes(app);
    await registerApiRoutes(app);

    console.log("Fastify app ready!");
  }
  return app;
}

export default async function handler(req: any, res: any) {
  try {
    console.log(`Request: ${req.method} ${req.url}`);
    const fastify = await getApp();
    await fastify.ready();
    
    const response = await fastify.inject({
      method: req.method,
      url: req.url,
      headers: req.headers,
      payload: req.body,
    });
    
    res.statusCode = response.statusCode;
    for (const [key, value] of Object.entries(response.headers)) {
      if (typeof value === "string") {
        res.setHeader(key, value);
      }
    }
    res.end(response.body);
  } catch (error) {
    console.error("Handler error:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : String(error) 
    }));
  }
}
