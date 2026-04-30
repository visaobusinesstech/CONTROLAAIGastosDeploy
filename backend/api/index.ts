import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "../src/modules/auth.js";
import { registerApiRoutes } from "../src/modules/api-routes.js";

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

let app: any = null;

async function init() {
  if (app) return app;

  try {
    console.log("Initializing Fastify app...");
    app = Fastify({ logger: true });

    console.log("Registering CORS...");
    await app.register(cors, {
      origin: [frontendUrl, "http://localhost:5173", "http://localhost:5174"],
      credentials: true,
    });

    console.log("Registering health route...");
    app.get("/health", async () => ({ ok: true }));

    console.log("Registering auth routes...");
    await registerAuthRoutes(app);

    console.log("Registering API routes...");
    await registerApiRoutes(app);

    console.log("Fastify app initialized successfully!");
    return app;
  } catch (error) {
    console.error("Error initializing app:", error);
    throw error;
  }
}

export default async function handler(req: any, res: any) {
  try {
    console.log("Received request:", req.method, req.url);
    const fastify = await init();
    await fastify.ready();
    fastify.server.emit("request", req, res);
  } catch (error) {
    console.error("Handler error:", error);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) }));
  }
}
