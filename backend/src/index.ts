import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerAuthRoutes } from "./modules/auth.js";
import { registerApiRoutes } from "./modules/api-routes.js";

const port = Number(process.env.PORT) || 3333;
/* Origin do browser não leva barra final; alinhar para o CORS bater certo. */
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: [frontendUrl, "http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  });

  app.get("/health", async () => ({ ok: true }));

  await registerAuthRoutes(app);
  await registerApiRoutes(app);

  try {
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`API http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
